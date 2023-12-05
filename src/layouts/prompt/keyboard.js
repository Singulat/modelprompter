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
  async resetChannel ({ev, channelsModel, sortedMessages, deleteChannel, clearMessages, $promptEl}) {
    ev.preventDefault()
    ev.stopPropagation()
    
    // Delete if not general and not have messages, otherwise just clear
    if (channelsModel.currentChannel !== 'general' && !sortedMessages.value.length) {
      await deleteChannel()
    } else {
      await clearMessages()
    }

    $promptEl.value.focus()
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
   * Enter selection mode (or select the prev message)
   */
  prevMessage ({ev, $messages, editMessage, isEditing, $promptEl}) {
    ev.preventDefault()
    ev.stopPropagation()

    const $messageEls = $messages.value.querySelectorAll('.message')
    if (!$messageEls.length) {
      $promptEl.value.focus()
      return
    }
    
    // If already editing, select the previous message
    let $message
    if (isEditing.value) {
      $message = $messages.value.querySelector(`.message[data-id="${isEditing.value}"]`)
      const index = [...$messageEls].indexOf($message)
      if (index > 0) {
        const $prevMessage = $messageEls[index-1]
        editMessage({target: $prevMessage})
      }
    } else {
      // Otherwise, get last
      $message = $messageEls[$messageEls.length-1]
      editMessage({target: $messageEls[$messageEls.length-1]})
    }

    // Scroll so top of $messages.value is at top of $message
    if ($message) {
      $messages.value.scrollTop = $message.offsetTop - $messages.value.offsetTop - 80
    }
    $promptEl.value.focus()
  },

  /**
   * Next message
   */
  nextMessage ({ev, $messages, editMessage, isEditing, $promptEl}) {
    ev.preventDefault()
    ev.stopPropagation()

    const $messageEls = $messages.value.querySelectorAll('.message')
    
    // If already editing, select the next message
    let $message
    if (isEditing.value) {
      $message = $messages.value.querySelector(`.message[data-id="${isEditing.value}"]`)
      const index = [...$messageEls].indexOf($message)
      if (index < $messageEls.length-1) {
        const $nextMessage = $messageEls[index+1]
        editMessage({target: $nextMessage})
      }
      $messages.value.scrollTop = $message.offsetTop - $messages.value.offsetTop
    }

    $promptEl.value.focus()
  },

  /**
   * Cancel
   */
  cancelEditing ({ev, isEditing, cancelEditing, $promptEl}) {
    if (isEditing.value) {
      ev.preventDefault()
      ev.stopPropagation()
    }
    cancelEditing()
    isEditing.value = false
    $promptEl.value.focus()
  }
}