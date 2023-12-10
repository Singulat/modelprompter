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
   * Run prompt
   */
  async runPrompt ({$messages, $scriptsContainer, curPrompt, isEditing, skillsModel, updateMessage, activeChannel, messagesModel, sendToLLM}) {
    if (isEditing.value) {
      updateMessage()
      return
    }
    let response = ''
    console.log('\n\n\n---\nNew Prompt:', curPrompt.value)
    
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

      for (let i = 0; i < skillsToParse.length; i++) {
        console.log('🧰 Checking skill:', rawSkills[i]?.name)
        const response = await sendToLLM(skillsToParse[i], {
          role: 'placeholder',
          text: `📋 Checking skill: ${rawSkills[i].name}`,
          isGeneratingSkills: true
        })
        if (response.skillPassedTest) {
          passedSkills.push(rawSkills[i])
        }
        responses.push('Skill check response:', response)
      }

      // Send the message through as normal chat if no skills passed
      if (passedSkills.length === 0) {
        const messages = await messagesModel.getPreparedMessages(activeChannel.value)
        await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})
      } else {
        const messages = await messagesModel.getPreparedMessages(activeChannel.value)

        /**
         * Planning stage
         */
        messages.push({
          role: 'user',
          content: skillsModel.planningPrompt,
        })
        // Add the skills
        for (const skill of passedSkills.reverse()) {
          messages.push({
            role: 'system',
            content: `Skill name: ${skill.name}
Trigger when: ${skill.triggers}
Reaction: ${skill.response}`
          })
        }
        messages.push(messages.shift())
        
        console.log('📋 Sending plan')
        response = await sendToLLM(messages, {text: '🤔 Thinking...', role: 'placeholder'})

        // Remove placeholders
        messages.forEach(message => {
          if (message.role === 'placeholder') {
            messagesModel.deleteMessage(message.id)
          }
        })
      }
    } else {
      const messages = await messagesModel.getPreparedMessages(activeChannel.value)
      response = await sendToLLM(messages, {text: '🤔 Thinking...'})
    }

    // Extract scripts from the response and run them
    this.scanAndRunScripts({response, $scriptsContainer})
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
          role: 'user',
          text: `${skillsModel.systemPrompt}`,
          skill
        }
      ]

      // User Prompt
      skillMessages.push({
        role: 'user',
        text: `${prompt}`
      })
      
      // Skill compare against
      skillMessages.push({
        role: 'system',
        text: `Skill name: ${skill.name}
Trigger when: ${skill.triggers}`,
      })

      // Move first to last
      skillMessages.push(skillMessages.shift())

      skills.push(await messagesModel.prepareMessages(skillMessages))
    }

    return skills
  },


  /**
   * Send to the llm for inference
   * @returns {skillPassedTest, combinedMessage}
   */
  async sendToLLM ({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, $promptEl, scrollBottom}) {
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
      apiKey: defaultConnection.apiKey,
      organization: defaultConnection.organization,
      dangerouslyAllowBrowser: true
    })

    // Remove plaholder roles
    messages = messages.filter(message => message.role !== 'placeholder')

    // Send to openai
    console.log('sending to openai', messages)
    const completion = await openai.chat.completions.create({
      messages,
      model: defaultConnection.model,
      temperature: +defaultConnection.temp,
      stream: true
    })

    let combinedMessage = isGeneratingSkills ? assistantDefaults.text : ''
    let skillPassedTest = false
    
    for await (const completionChunk of completion) {
      if (!isGeneratingSkills) {
        const chunk = completionChunk.choices?.[0]?.delta?.content || ''
        
        if (chunk) {
          // Concat the chunk
          combinedMessage += chunk
          messagesModel.updateMessage(assistantId, {
            text: combinedMessage
          })
        }
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
      skillPassedTest,
      combinedMessage,
      assistantId
    }
  }  
}