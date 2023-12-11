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
  }
}