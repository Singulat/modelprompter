export default {
  /**
   * New channel
   */
  newChannel ({ev, showNewChannelModal}) {
    ev.preventDefault()
    ev.stopPropagation()
    showNewChannelModal()
  },

  /**
   * Edit channel
   */
  editChannel ({ev, showEditChannelModal}) {
    ev.preventDefault()
    ev.stopPropagation()
    showEditChannelModal()
  },

  /**
   * Delete message
   */
  deleteMessage ({ev, deleteMessage}) {
    ev.preventDefault()
    ev.stopPropagation()
    deleteMessage()
  },

  /**
   * Reset channel
   */
  async resetChannel ({ev, channelsModel, sortedMessages, deleteChannel, clearMessages, $promptEl, isSelecting, isEditing, isWorking}) {
    ev?.preventDefault()
    ev?.stopPropagation()
    
    isSelecting.value = false
    isEditing.value = false
    isWorking.value = false    
    
    // Delete if not general and not have messages, otherwise just clear
    if (channelsModel.currentChannel !== 'general' && !sortedMessages.value.length) {
      await deleteChannel()
    } else {
      await clearMessages()
    }

    setTimeout(() => {
      $promptEl.value.focus()
    }, 0)
  },

  /**
   * Show the dropdown and focus it
   */
  selectChannels ({ev, $channels}) {
    ev.preventDefault()
    ev.stopPropagation()
    $channels.value.focus()
  },

  /**
   * Cancel
   */
  cancelEditing ({ev, isEditing, isSelecting, $promptEl}) {
    if (isEditing.value) {
      ev?.preventDefault()
      ev?.stopPropagation()
    }
    isEditing.value = false
    isSelecting.value = false
    document.querySelector('.messages .highlight')?.classList.remove('highlight')

    setTimeout(() => {
      $promptEl.value.focus()
    }, 0)
  }
}