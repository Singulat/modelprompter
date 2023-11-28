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
}