export default {
  /**
   * Handle scrolling
   */  
  scrollBottom ({$messages}) {
    const target = $messages?.value
    if (target) {
      target.scrollTop = target.scrollHeight
    }    
  },

  /**
   * Sort by date
   */
  sortedMessages ({messagesModel, activeChannel}) {
    const messages = messagesModel.getSortedByDate(activeChannel.value)
    return messages
  }
}