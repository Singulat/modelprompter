<template lang="pug">
// The actual textbox
.mb1
  textarea(
    ref='$promptEl'
    :class='{"bubble-arrow-hotkeys": !isEditing && !curPrompt?.trim()?.length}'
    :disabled='isSelecting'
    v-model='curPrompt'
    autofocus
    multiline
    :rows="isEditing ? 7 : 3"
    placeholder='Prompt...'
    @keydown.ctrl.exact.enter='runPrompt'
  )

// More button
.mb1(v-if='isShowingMore')
  button.fullwidth(@click='clearMessages') Clear messages

// Prompt buttons
.flex(v-if='!isEditing && !isSelecting')
  .flex-auto.mr1
    div(style='display: flex; position: relative')
      button(@click='isShowingMore = !isShowingMore' :class='{active: isShowingMore}') More
  div
    button.fullwidth(v-if='!isWorking' :disabled='!curPrompt' @click='runPrompt') Run prompt
    button.fullwidth(v-else='' @click='cancelPrompt') Cancel prompt
</template>

<script setup>
import {ref} from 'vue'
import { useSkillsModel } from '../model/skills'
import { useMessagesModel } from '../model/messages'
import { useConnectionsModel } from '../model/connections'
import OpenAI from 'openai'

// Refs
const $promptEl = ref(null)
const curPrompt = ref('')
const isShowingMore = ref(false)

// Props and stores
const messagesModel = useMessagesModel()
const skillsModel = useSkillsModel()
const connectionsModel = useConnectionsModel()
const props = defineProps({
  hotkeysScope: {type: String, default: 'PromptBox'},
  isEditing: {type: Boolean, default: false},
  isSelecting: {type: Boolean, default: false},
  isWorking: {type: Boolean, default: false},
  activeChannel: {type: String, default: ''},
})


/**
 * Remove placeholder elements
 * (they already get removed from store)
 */
const removePlaceholders = (placeholders) => {
  for (const placeholder of placeholders) {
    // Remove the placeholder from the dom
    const $placeholder = document.querySelector(`.messages [data-id="${placeholder.id}"]`)
    if ($placeholder) {
      $placeholder.remove()
    }
    
    // Remove from store if it's there too
    messagesModel.deleteMessage(placeholder.id)
  }
}


/**
 * Run prompt
 */
const runPrompt = async () => {
  if (props.isEditing) {
    emit('updateMessage')
    return
  }
  emit('startWorking')
  console.log(props.isWorking)
  
  let response = ''
  let neededPlan = false
  console.log('\n\n\n---\n📜 New Prompt:', curPrompt.value)
  
  // Add the users message
  const prompt = curPrompt.value
  await messagesModel.addMessage({
    role: 'user',
    text: prompt,
    channel: props.activeChannel
  })
  curPrompt.value = ''
  
  /**
   * Extract skills
   */
  if (!skillsModel.allSkillsDisabled) {
    const skillsToParse = await getSkills(prompt)
    const rawSkills = Object.values(skillsModel.skills)
    const passedSkills = []
    const responses = []
    const placeholders = []

    // Check each skill individually
    console.log('🤸 Evaluating required skills')
    for (let i = 0; i < skillsToParse.length; i++) {
      if (!props.isWorking) return

      console.log('🤔 Checking skill:', rawSkills[i].name)
      const response = await sendToLLM(skillsToParse[i], {
        role: 'placeholder',
        text: `📋 Checking skill: ${rawSkills[i].name}`,
        isGeneratingSkills: true
      })
      if (response.skillPassedTest) {
        passedSkills.push(rawSkills[i])
      }
      responses.push(response)
      placeholders.push({
        id: response.assistantId,
      })
    }
    removePlaceholders(placeholders)

    
    if (props.isWorking) {
    // Send the message through as normal chat if no skills passed
      if (passedSkills.length === 0) {
        const messages = await messagesModel.getPreparedMessages(props.activeChannel)
        console.log('💬 No skills needed. Generating response.')
        const response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})
        removePlaceholders([response.placeholders])
      } else {
        const messages = await messagesModel.getPreparedMessages(props.activeChannel)

        /**
         * Planning stage
         */
        // Add skills
        for (const skill of passedSkills.reverse()) {
          messages.unshift({
            role: 'system',
            content: `Skill name: ${skill.name}
  Trigger when: ${skill.triggers}
  Reaction: ${skill.response}`
          })
        }

        // Add planning prompt
        messages.unshift({
          role: 'system',
          content: skillsModel.planningPrompt,
        })
        
        // Send it
        neededPlan = true
        console.log('📋 Generating plan')
        const response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})

        
        // Remove placeholders
        console.log('📋 Plan generated:\n', response.combinedMessage)
        removePlaceholders([response.placeholders])
      }
    }
  } else {
    if (props.isWorking) {
      const messages = await messagesModel.getPreparedMessages(props.activeChannel)
      const response = await sendToLLM(messages, {text: '🤔 Thinking...'})
      removePlaceholders([response.placeholders])
    }
  }

  // Extract scripts from the response and run them
  if (props.isWorking) {
    const $scriptsContainer = document.querySelector('#scripts-container')
    await scanAndRunScripts(response, $scriptsContainer)
    neededPlan && console.log('📋 Reviewing plan and results')
    neededPlan && console.log('🫡 Confirming')
  } else {
    console.log('✋ Message round cancelled')
  }
  console.log('💤 Message round over')
  
  emit('stopWorking')
}



/**
 * Scan and run scripts
 */
const scanAndRunScripts = async (response, $scriptsContainer) => {
  $scriptsContainer.innerHTML = response.combinedMessage

  // Extract script tags and run them
  $scriptsContainer.querySelectorAll('script').forEach(async script => {
    const $sandbox = document.querySelector('#sandbox')
    // post message to all
    $sandbox.contentWindow.postMessage({
      type: 'evalCode',
      code: script.innerText
    }, '*')
  })

  // Wrap <video> tags in a container
  $scriptsContainer.querySelectorAll('video').forEach(video => {
    if (video.parentElement.classList.contains('video-container')) return
    video.outerHTML = `<div class="video-container">${video.outerHTML}<div class="video-container-mask"></div><i class="q-icon notranslate material-icons">play_circle_filled</i></div>`
  })
}


/**
 * Get skills
 */
const getSkills = async (prompt = '.') => {
  // Send each skill for inference to check if it's a good match
  const rawSkills = Object.values(skillsModel.skills)
  const skills = []
  
  for (const skill of rawSkills) {
    // System prompt
    let skillMessages = [
      {
        role: 'system',
        text: `${skillsModel.systemPrompt}`,
        skill
      }
    ]
    
    // Skill compare against
    skillMessages.push({
      role: 'system',
      text: `Skill name: ${skill.name}
Trigger when: ${skill.triggers}`,
    })

    // User Prompt
    skillMessages.push({
      role: 'user',
      text: `${prompt}`
    })
    
    const prepped = await messagesModel.prepareMessages(skillMessages)
    skills.push(prepped)
  }

  return skills
}


/**
 * Send to the llm for inference
 * @returns {skillPassedTest, combinedMessage}
 */
const sendToLLM = async (messages, assistantDefaults) => {
  // Add a placeholder message to start updating
  const assistantId = await messagesModel.addMessage(Object.assign({
    channel: props.activeChannel,
    role: 'assistant',
    text: '',
  }, assistantDefaults))
  emit('scrollBottom')
  $promptEl.value.focus()

  // Extract possible non message
  let isGeneratingSkills = !!assistantDefaults.isGeneratingSkills
  delete assistantDefaults.isGeneratingSkills
  
  // Setup connection
  let defaultConnection = connectionsModel.defaultConnection
  defaultConnection = connectionsModel.connections[defaultConnection]

  // Create openai instance
  const openai = new OpenAI({
    baseURL: defaultConnection.baseurl,
    apiKey: defaultConnection.apiKey || '123',
    organization: defaultConnection.organization,
    dangerouslyAllowBrowser: true
  })

  // Pull out all placeholders into a seperate array
  // and remove them from the messages
  const placeholders = [...messages.filter(message => message.role === 'placeholder')]
  messages = messages.filter(message => message.role !== 'placeholder')

  // Send to openai
  console.log('📦 Sending to LLM', messages)
  const completion = await openai.chat.completions.create({
    messages,
    model: defaultConnection.model,
    temperature: +defaultConnection.temp,
    stream: true
  })

  let combinedMessage = isGeneratingSkills ? assistantDefaults.text : ''
  let skillPassedTest = false
  
  for await (const completionChunk of completion) {
    if (!props.isWorking) {
      break
    }
    
    if (!isGeneratingSkills) {
      const chunk = completionChunk.choices?.[0]?.delta?.content || ''
      
      // Concat the chunk
      combinedMessage += chunk
      messagesModel.updateMessage(assistantId, {
        text: combinedMessage
      })
    } else {
      // If it's a skill, check if its a good match
      const chunk = completionChunk.choices?.[0]?.delta?.content?.trim() || ''
      if (chunk) {
        if (chunk[0] == '1' || chunk.toLowerCase() == 'yes' || chunk.toLowerCase() == 'true') {
          console.log('✅ Passed on chunk', chunk)
          await messagesModel.updateMessage(assistantId, {
            text: combinedMessage + '\n✅'
          })
          skillPassedTest = true
        } else {
          console.log('❌ Failed on chunk', chunk)
          await messagesModel.updateMessage(assistantId, {
            text: combinedMessage + '\n❌'
          })
        }
        break
      }
    }
    
    emit('scrollBottom')
  }

  return {
    placeholders,
    skillPassedTest,
    combinedMessage,
    assistantId
  }
}

/**
 * Cancel prompting
 */
const cancelPrompt = () => {
  emit('stopWorking')
}



/**
 * Emits
 */
const emit = defineEmits(['clearMessages', 'startWorking', 'stopWorking', 'scrollBottom', 'updateMessage'])
const clearMessages = () => {
  emit('clearMessages')
  curPrompt.value = ''
  isShowingMore.value = false
  $promptEl.value?.focus()
}

/**
 * Define expose
 */
defineExpose({
  curPrompt,
  focus: () => $promptEl.value.focus(),
  clear: () => curPrompt.value = '',
  runPrompt: () => runPrompt(),
})
</script>