import OpenAI from 'openai'

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
  async runPrompt ({curPrompt, isEditing, skillsModel, updateMessage, activeChannel, messagesModel, sendToLLM}) {
    if (isEditing.value) {
      updateMessage()
      return
    }
    
    // Add the users message
    const prompt = curPrompt.value
    await messagesModel.addMessage({
      role: 'user',
      text: prompt,
      channel: activeChannel.value
    })
    curPrompt.value = ''
    
    /**
     * Extract skills and create a plan of action of necessary
     */
    const skillsToParse = await this.getSkills({skillsModel, messagesModel, prompt})
    const rawSkills = Object.values(skillsModel.skills)
    const passedSkills = []

    for (let i = 0; i < skillsToParse.length; i++) {
      const response = await sendToLLM(skillsToParse[i], {
        text: `📋 Checking skill: ${rawSkills[i].name}`,
        isGeneratingSkills: true
      })

      if (response.skillPassedTest) {
        passedSkills.push(rawSkills[i])
      }
    }
    
    // Finally, send the users prompt
    // const messages = await messagesModel.getPreparedMessages(activeChannel.value)
    // await sendToLLM(messages)
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
          text: skillsModel.systemPrompt,
          skill
        }
      ]

      // User Prompt
      skillMessages.push({
        role: 'user',
        text: `\`\`\`user
${prompt}
\`\`\``
      })

      // Skill compare against
      skillMessages.push({
        role: 'user',
        text: `\`\`\`skill_title
${skill.name}
\`\`\`

---

\`\`\`skill_triggers
${skill.triggers}
\`\`\`

---

\`\`\`skill_response
${skill.response}
\`\`\``,
      })

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

    // Send to openai
    const completion = await openai.chat.completions.create({
      messages,
      model: defaultConnection.model,
      temperature: +defaultConnection.temp,
      stream: true
    })

    let combinedMessage = isGeneratingSkills ? assistantDefaults.text : ''
    let skillPassedTest = false
    
    for await (const chunk of completion) {
      if (!isGeneratingSkills) {
        combinedMessage += chunk.choices?.[0]?.delta?.content || ''
        messagesModel.updateMessage(assistantId, {
          text: combinedMessage
        })
      } else {
        // If it's a skill, check if its a good match
        if (chunk.choices?.[0]?.delta?.content) {
          if (chunk.choices?.[0]?.delta?.content == '1') {
            messagesModel.updateMessage(assistantId, {
              text: combinedMessage + '\n✅'
            })
            skillPassedTest = true
          } else {
            messagesModel.updateMessage(assistantId, {
              text: combinedMessage + '\n❌'
            })
          }
        }
      }
      
      scrollBottom()
    }

    isThinking.value = false  

    return {
      skillPassedTest,
      combinedMessage
    }
  }  
}