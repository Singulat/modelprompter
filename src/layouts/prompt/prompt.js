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
  async runPrompt ({curPrompt, isEditing, updateMessage, activeChannel, messagesModel, sendToLLM}) {
    if (isEditing.value) {
      updateMessage()
      return
    }
    
    // Add the users message
    await messagesModel.addMessage({
      role: 'user',
      text: curPrompt.value,
      channel: activeChannel.value
    })
    curPrompt.value = ''

    const messages = await messagesModel.getPreparedMessages(activeChannel.value)
    await sendToLLM(messages)
  },

  /**
   * Send to the llm for inference
   */
  async sendToLLM ({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, $promptEl, scrollBottom}) {
    isThinking.value = true
    
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

    // Add an empty message to start updating
    const assistantId = await messagesModel.addMessage(Object.assign(assistantDefaults, {
      channel: activeChannel.value,
      role: 'assistant',
      text: '',
    }))
    $promptEl.value.focus()

    let combinedMessage = ''
    for await (const chunk of completion) {
      combinedMessage += chunk.choices?.[0]?.delta?.content || ''
      messagesModel.updateMessage(assistantId, {
        text: combinedMessage
      })
      
      scrollBottom()
    }

    isThinking.value = false  
  }  
}