import hotkeys from "hotkeys-js"

export default {
  toggleShowMoreChannel ({isShowingMoreChannel}) {
    isShowingMoreChannel.value = !isShowingMoreChannel.value
  },

  /**
   * Show new vs edit modals
   */
  showNewChannelModal ({isShowingChannelModal, channelBeingEdited}) {
    channelBeingEdited.value = null
    isShowingChannelModal.value = true
  },
  showEditChannelModal ({isShowingChannelModal, channelBeingEdited, activeChannel}) {
    channelBeingEdited.value = activeChannel.value
    isShowingChannelModal.value = true
  },

  /**
   * Handle channel creation and changing
   */
  async onChannelCreated ({activeChannel, isShowingMoreChannel , tabsModel, $promptEl, maybeAddSystemPrompt, id}) {
    activeChannel.value = id
    isShowingMoreChannel.value = false
    tabsModel.adjustZIndex()
    await maybeAddSystemPrompt()
    $promptEl.value.focus()
  },
  
  async onChannelUpdated ({isShowingChannelModal, isShowingMoreChannel, tabsModel, maybeAddOrUpdateSystemPrompt, $promptEl}) {
    isShowingChannelModal.value = false
    isShowingMoreChannel.value = false
    tabsModel.adjustZIndex()
    await maybeAddOrUpdateSystemPrompt()
    $promptEl.value.focus()
  },

  async changeCurrentChannel ({focusPrompt = false, channelsModel, activeChannel, $promptEl, scrollBottom}) {
    await channelsModel.setCurrentChannel(activeChannel.value)
    scrollBottom()
    focusPrompt && $promptEl.value.focus()
  },

  /**
   * Delete channel
   */
  async deleteChannel ({isShowingMoreChannel, activeChannel, messagesModel, channelsModel}) {
    await messagesModel.deleteAll(activeChannel.value)
    await channelsModel.deleteChannel(activeChannel.value)
    activeChannel.value = 'general'
    isShowingMoreChannel.value = false
  },

  /**
   * Close channel modal
   */
  closeChannelModal ({isShowingChannelModal, tabsModel}) {
    isShowingChannelModal.value = false
    tabsModel.adjustZIndex()
  },

  /**
   * Clear messages
   */
  async clearMessages ({isShowingMore, activeChannel, messagesModel, maybeAddSystemPrompt, $promptEl}) {
    isShowingMore.value = false
    await messagesModel.deleteAll(activeChannel.value)
    await maybeAddSystemPrompt()
    $promptEl.value.focus()
  },

  /**
   * Select message
   */
  selectMessage ({target, isSelecting, $messages}) {
    // Unhighlight others
    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })
    
    // Highlight current one
    const $target = target.closest('.message')
    $target.classList.add('highlight')
    isSelecting.value = $target.getAttribute('data-id')

    // Scroll to it
    $target.scrollIntoView({behavior: 'smooth', block: 'center'})
  },

  /**
   * Edit message
   */
  onMessageEdit ({ev, editSelectedMessage, selectMessage, isEditing, isSelecting, $messages, curPrompt, $promptEl, messagesModel}) {
    if (ev.target?.closest('.message')) {
      const $message = ev.target.closest('.message')
      selectMessage({target: $message, isSelecting, $messages})
      editSelectedMessage({$messages, isEditing, curPrompt, isSelecting, $promptEl, messagesModel})
    }
  },

  /**
   * Update a message
   */
  async updateMessage ({isEditing, messagesModel, curPrompt, activeChannel, $messages, $promptEl, channelsModel, sortedMessages}) {
    const message = messagesModel.messages[isEditing.value]
    await messagesModel.updateMessage(isEditing.value, {
      updated_at: Date.now(),
      text: curPrompt.value
    })

    // If this is the first message and it's also a system prompt, update the channel system prompt
    if (message.role === 'system' && sortedMessages.value[0].id === message.id) {
      await channelsModel.updateChannel(activeChannel.value, {
        systemPrompt: curPrompt.value
      })
    }

    curPrompt.value = ''
    isEditing.value = false

    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })

    $promptEl.value.focus()
  },

  /**
   * Delete message
   */
  async deleteMessage ({isEditing, messagesModel, curPrompt, $messages, $promptEl}) {
    await messagesModel.deleteMessage(isEditing.value)
    curPrompt.value = ''
    isEditing.value = false

    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })

    curPrompt.value = ''
    $promptEl.value.focus()
  },

  /**
   * Change the role of a message
   */
  async changeRole ({role, isEditing, messagesModel, $messages, $promptEl}) {
    await messagesModel.updateMessage(isEditing.value, {
      role,
      updated_at: Date.now()
    })
    
    isEditing.value = false
    showingChangeRole.value = false

    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })
    
    curPrompt.value = ''
    $promptEl.value.focus()
  },

  /**
   * Regenerate message
   */
  async regenerateMessage ({isEditing, messagesModel, sortedMessages, $messages, $promptEl, sendToLLM, curPrompt}) {
    const message = messagesModel.messages[isEditing.value]

    // If user, get all messages up to this one
    if (message.role === 'user') {
      const sortedClone = [...sortedMessages.value]
      const index = sortedClone.findIndex(m => m.id === message.id)
      const messages = sortedClone.slice(0, index + 1)
      await sendToLLM(messagesModel.prepareMessages(messages), {created_at: message.created_at+1})
    } else if (message.role === 'assistant') {
      // If only one message, regenerate using it's own prompt as input
      if (sortedMessages.value.length === 1) {
        await sendToLLM(messagesModel.prepareMessages([message]))
        await messagesModel.deleteMessage(message.id)
      // Get up to the one before it
      } else {
        const sortedClone = [...sortedMessages.value]
        const index = sortedClone.findIndex(m => m.id === message.id)
        const messages = sortedClone.slice(0, index)
        await messagesModel.deleteMessage(message.id)
        await sendToLLM(messagesModel.prepareMessages(messages), {created_at: message.created_at-1})
      }
    }

    isEditing.value = false
    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })

    curPrompt.value = ''
    $promptEl.value.focus()
  },

  cancelEditing ({isEditing, curPrompt, $messages}) {
    isEditing.value = false
    curPrompt.value = ''
    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })
  }
}