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
import {ref, watch, onMounted} from 'vue'
import { useSkillsModel } from '../model/skills'
import { useMessagesModel } from '../model/messages'
import { useConnectionsModel } from '../model/connections'
import MarkdownIt from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import DOMPurify from 'dompurify'
import shellParser from 'shell-quote/parse'

// Markdown
const md = new MarkdownIt({
  html: true,
})
md.use(MarkdownItAttrs)

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

// Store the prompt the user is writing in the channel
// in case they navigate away
watch(curPrompt, (val) => {
  messagesModel.setCurPrompt(val)
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
      response = await sendToLLM(skillsToParse[i], {
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
        response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})
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
        response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})

        
        // Remove placeholders
        console.log('📋 Plan generated:\n', response.combinedMessage)
        removePlaceholders([response.placeholders])
      }
    }
  } else {
    if (props.isWorking) {
      const messages = await messagesModel.getPreparedMessages(props.activeChannel)
      response = await sendToLLM(messages, {text: '🤔 Thinking...'})
      removePlaceholders([response.placeholders])
    }
  }

  // Extract scripts from the response and run them
  if (props.isWorking) {
    console.log('🖨️ Scanning for scripts')

    /**
     * Print additional data
     */
    const scriptData = await scanAndRunScripts(response)
    if (scriptData.print) {
      // Update last message
      let printMessage = Object.assign({
        channel: props.activeChannel,
        role: 'assistant',
        text: scriptData.print,
      }, {})
      const id = await messagesModel.addMessage(printMessage)
    }
    
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
const scanAndRunScripts = async (response) => {
  let text = DOMPurify.sanitize(md.render(response.combinedMessage), {
    ALLOWED_TAGS: ['code'],
    ALLOWED_ATTR: ['class']
  })
  md.render(text)
  let scriptData = {}

  // Parse the response and extract all <code class="language-mp">...</code>
  // @fixme we should probably use virtual dom for this 😬
  const $scriptsContainer = document.createElement('div')
  $scriptsContainer.innerHTML = text
  const $scripts = $scriptsContainer.querySelectorAll('code.language-mp')

  for (const $script of Array.from($scripts)) {
    const script = $script.innerText
    // Split the script into lines
    const scripts = script?.split('\n')
    const vars = {}
    for (let script of scripts) {
      if (!script.trim()) continue
      script = shellParser(script.trim())
      
      // Send to background script to be processed
      console.log('📜 Running script:', JSON.stringify(script))
      let completion = {}
      try {
        completion = await (async ()=> new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'runMPScript',
            script,
          }, response => {
            if (response.error) {
              reject(response.error)
            } else {
              resolve(response)
            }
          })
        }))()
      } catch (err) {
        // @todo We need a notification system
        continue
      }

      // Respond to the function
      switch (script[0]) {
        case 'getPageText':
          vars[script[1]] = completion.text
        break

        case 'output':
          scriptData.print = vars[script[1]]
        break
      }
    }
  }

  console.log('🖨️ Finished with scripts', scriptData)
  return scriptData
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
 * @returns {skillPassedTest}
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

  // Pull out all placeholders into a seperate array
  // and remove them from the messages
  const placeholders = [...messages.filter(message => message.role === 'placeholder')]
  messages = messages.filter(message => message.role !== 'placeholder')

  // Send to openai
  console.log('📦 Sending to LLM', messages)
  const completion = await (async ()=> new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'sendToLLM',
      assistantId,
      messages,
      channel: props.activeChannel,
      model: defaultConnection.model,
      isGeneratingSkills,
      assistantDefaults,
      connection: {
        baseurl: defaultConnection.baseurl,
        apiKey: defaultConnection.apiKey,
        organization: defaultConnection.organization,        
      },
      temperature: +defaultConnection.temp,
      stream: true
    }, response => {
      if (response.error) {
        reject(response.error)
      } else {
        resolve(response)
      }
    })
  }))()

  return {
    placeholders,
    skillPassedTest: completion.skillPassedTest,
    combinedMessage: completion.combinedMessage,
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


/**
 * On mounted
 */
onMounted(async () => {
  curPrompt.value = await messagesModel.getCurPrompt()
})
</script>