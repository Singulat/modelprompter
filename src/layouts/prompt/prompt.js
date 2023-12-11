import OpenAI from 'openai'
import MarkdownIt from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'

const md = new MarkdownIt({
  html: true,
})
md.use(MarkdownItAttrs)

export default {
  /**
   * Add system prompt
   */
  async maybeAddSystemPrompt ({activeChannel, channelsModel, messagesModel}) {
    const channel = channelsModel.channels[activeChannel.value]
    if (channel?.systemPrompt) {
      await messagesModel.addMessage({
        role: 'system',
        text: channel.systemPrompt,
        channel: activeChannel.value
      })
    }
  },

  /**
   * Cancel thinking mode
   */
  cancelThinking ({isWorking, $promptEl}) {
    isWorking.value = false
    $promptEl.value.focus()
  },
  
  
  async maybeAddOrUpdateSystemPrompt ({activeChannel, channelsModel, messagesModel, sortedMessages}) {
    const channel = channelsModel.channels[activeChannel.value]
    // Check if the first sorted message is a system prompt, if so update. if not, add a new one with the date a bit before the first
    const sortedClone = [...sortedMessages.value]
    const firstMessage = sortedClone.shift()
    if (firstMessage.role === 'system') {
      await messagesModel.updateMessage(firstMessage.id, {
        text: channel.systemPrompt,
        updated_at: Date.now()
      })
    } else {
      await messagesModel.addMessage({
        role: 'system',
        text: channel.systemPrompt,
        channel: activeChannel.value,
        created_at: firstMessage.created_at - 10
      })
    }
  },

  /**
   * Remove placeholder elements
   * (they already get removed from store)
   */
  removePlaceholders ({placeholders, $messages, messagesModel}) {
    for (const placeholder of placeholders) {
      // Remove the placeholder from the dom
      const $placeholder = $messages.value.querySelector(`[data-id="${placeholder.id}"]`)
      if ($placeholder) {
        $placeholder.remove()
      }
      
      // Remove from store if it's there too
      messagesModel.deleteMessage(placeholder.id)
    }
  },

  /**
   * Run prompt
   */
  async runPrompt ({$messages, isWorking, $scriptsContainer, curPrompt, isEditing, skillsModel, updateMessage, activeChannel, messagesModel, sendToLLM, isSelecting}) {
    if (isEditing.value) {
      updateMessage()
      return
    }
    
    isWorking.value = true
    let response = ''
    let neededPlan = false
    console.log('\n\n\n---\n📜 New Prompt:', curPrompt.value)
    
    // Add the users message
    const prompt = curPrompt.value
    await messagesModel.addMessage({
      role: 'user',
      text: prompt,
      channel: activeChannel.value
    })
    curPrompt.value = ''
    
    /**
     * Extract skills
     */
    if (!skillsModel.allSkillsDisabled) {
      const skillsToParse = await this.getSkills({skillsModel, messagesModel, prompt})
      const rawSkills = Object.values(skillsModel.skills)
      const passedSkills = []
      const responses = []
      const placeholders = []

      // Check each skill individually
      console.log('🤸 Evaluating required skills')
      for (let i = 0; i < skillsToParse.length; i++) {
        if (!isWorking.value) return

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
      this.removePlaceholders({placeholders: placeholders, $messages, messagesModel})

      
      if (isWorking.value) {
      // Send the message through as normal chat if no skills passed
        if (passedSkills.length === 0) {
          const messages = await messagesModel.getPreparedMessages(activeChannel.value)
          console.log('💬 No skills needed. Generating response.')
          const response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})
          this.removePlaceholders({placeholders: [response.placeholders], $messages, messagesModel})
        } else {
          const messages = await messagesModel.getPreparedMessages(activeChannel.value)

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
          this.removePlaceholders({placeholders: [response.placeholders], $messages, messagesModel})
        }
      }
    } else {
      if (isWorking.value) {
        const messages = await messagesModel.getPreparedMessages(activeChannel.value)
        const response = await sendToLLM(messages, {text: '🤔 Thinking...'})
        this.removePlaceholders({placeholders: [response.placeholders], $messages, messagesModel})
      }
    }

    // Extract scripts from the response and run them
    if (isWorking.value) {
      console.log('⚡ Running scripts')
      await this.scanAndRunScripts({response, $scriptsContainer})
      neededPlan && console.log('📋 Reviewing plan and results')
      neededPlan && console.log('🫡 Confirming')
    } else {
      console.log('✋ Message round cancelled')
    }
    console.log('💤 Message round over')
    isWorking.value = false
  },

    /**
   * Scan and run scripts
   */
  async scanAndRunScripts ({response, $scriptsContainer}) {
    $scriptsContainer.value.innerHTML = response.combinedMessage

    // Extract script tags and run them
    $scriptsContainer.value.querySelectorAll('script').forEach(async script => {
      const $sandbox = document.querySelector('#sandbox')
      // post message to all
      $sandbox.contentWindow.postMessage({
        type: 'evalCode',
        code: script.innerText
      }, '*')
    })

    // Wrap <video> tags in a container
    $scriptsContainer.value.querySelectorAll('video').forEach(video => {
      if (video.parentElement.classList.contains('video-container')) return
      video.outerHTML = `<div class="video-container">${video.outerHTML}<div class="video-container-mask"></div><i class="q-icon notranslate material-icons">play_circle_filled</i></div>`
    })
  },


  /**
   * Get skills
   */
  async getSkills ({skillsModel, messagesModel, prompt}) {
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

      // Move first to last
      // skillMessages.push(skillMessages.shift())

      skills.push(await messagesModel.prepareMessages(skillMessages))
    }

    return skills
  },


  /**
   * Send to the llm for inference
   * @returns {skillPassedTest, combinedMessage}
   */
  async sendToLLM ({regenerate, messages, isWorking, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, $promptEl, scrollBottom}) {
    isThinking.value = true

    // Add a placeholder message to start updating
    const assistantId = await messagesModel.addMessage(Object.assign({
      channel: activeChannel.value,
      role: 'assistant',
      text: '',
    }, assistantDefaults))
    scrollBottom()
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
      if (!isWorking.value) {
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
      
      scrollBottom()
    }

    isThinking.value = false  

    return {
      placeholders,
      skillPassedTest,
      combinedMessage,
      assistantId
    }
  }  
}