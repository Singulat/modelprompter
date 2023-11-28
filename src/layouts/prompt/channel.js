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
  async onChannelCreated ({activeChannel, tabsModel, $prompt, maybeAddSystemPrompt}) {
    activeChannel.value = id
    isShowingMoreChannel.value = false
    tabsModel.adjustZIndex()
    await maybeAddSystemPrompt()
    $prompt.value.focus()
  },
  
  async onChannelUpdated ({isShowingChannelModal, isShowingMoreChannel, tabsModel, maybeAddOrUpdateSystemPrompt, $prompt}) {
    isShowingChannelModal.value = false
    isShowingMoreChannel.value = false
    tabsModel.adjustZIndex()
    await maybeAddOrUpdateSystemPrompt()
    $prompt.value.focus()
  },

  async changeCurrentChannel ({focusPrompt = false, channelsModel, activeChannel, $prompt, scrollBottom}) {
    await channelsModel.setCurrentChannel(activeChannel.value)
    scrollBottom()
    focusPrompt && $prompt.value.focus()
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
   * Edit message
   */
  async editMessage ({ev, stopBubble, isEditing, isShowingMore, messagesModel, curPrompt, $messages, $promptEl}) {
    // Prevent bubbling, otherwise it would select all the text or bring up native context menu
    if (!isEditing.value || stopBubble) {
      ev.stopPropagation && ev.stopPropagation()
      ev.preventDefault && ev.preventDefault()
    }
    isShowingMore.value = false
    
    // Get message
    const $message = ev.target.closest('.message')
    const id = $message.getAttribute('data-id')

    // If already editing, cancel
    if (isEditing.value && id === isEditing.value) {
      cancelEditing()
      return
    }
    isEditing.value = id
    const message = messagesModel.messages[isEditing.value]

    // Unhighlight others
    const $messagesEl = $messages.value.querySelectorAll('.message')
    $messagesEl.forEach($message => {
      $message.classList.remove('highlight')
    })
    
    // Highlight current one
    $message.classList.add('highlight')

    // Update prompt with message
    curPrompt.value = message.text
    $promptEl.value.focus()
  }  
}