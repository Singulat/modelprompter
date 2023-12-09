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
  prevMessage ({ev, $messages, selectMessage, isSelecting}) {
    // Ignore naked arrows if in an input without bubbling
    if (!ev.shiftKey && !ev.ctrlKey && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName) && !ev.target.classList.contains('bubble-arrow-hotkeys')) {
      return
    }

    // Exit if no messages
    const $messageEls = $messages.value.querySelectorAll('.message')
    if (!$messageEls.length) {
      return
    }
    
    // Find previous
    let $highlight = $messages.value.querySelector(`.highlight`)
    let $message
    if (!$highlight) {
      $message = $messageEls[$messageEls.length-1]
    } else {
      const index = [...$messageEls].indexOf($highlight)
      if (index > 0) {
        $message = $messageEls[index-1]
      }
    }

    // Select
    if ($message) {
      selectMessage({target: $message, isSelecting, $messages})
      isSelecting.value = true
    }
  },

  /**
   * Next message
   */
  nextMessage ({ev, $promptEl, $messages, selectMessage, isSelecting}) {
    if (!isSelecting.value) return
    
    // Ignore naked arrows if in an input without bubbling
    if (!ev.shiftKey && !ev.ctrlKey && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName) && !ev.target.classList.contains('bubble-arrow-hotkeys')) {
      return
    }

    // Exit if no messages
    const $messageEls = $messages.value.querySelectorAll('.message')
    if (!$messageEls.length) {
      return
    }

    // Find next
    let $highlight = $messages.value.querySelector(`.highlight`)
    let $message
    if (!$highlight) {
      $message = $messageEls[0]
    } else {
      const index = [...$messageEls].indexOf($highlight)
      if (index < $messageEls.length-1) {
        $message = $messageEls[index+1]
      }
    }

    // Select
    if ($message) {
      selectMessage({target: $message, isSelecting, $messages})
    } else {
      isSelecting.value = false
      if ($highlight) {
        $highlight.classList.remove('highlight')
      }
      setTimeout(() => {
        $promptEl.value.focus()
      }, 0)
    }
  },

  /**
   * onEsc
   */
  onEsc ({ev, isEditing, isSelecting, $promptEl, $messages}) {
    if (isEditing.value || isSelecting.value) {
      ev.preventDefault()
      ev.stopPropagation()
    }
    this.cancelEditing({ev, isEditing, isSelecting, $promptEl})
  },

  /**
   * Cancel
   */
  cancelEditing ({ev, isEditing, isSelecting, $promptEl}) {
    if (isEditing.value) {
      ev.preventDefault()
      ev.stopPropagation()
    }
    isEditing.value = false
    isSelecting.value = false
    document.querySelector('.messages .highlight')?.classList.remove('highlight')

    setTimeout(() => {
      $promptEl.value.focus()
    }, 0)
  },

  editSelectedMessage ({ev, isEditing, curPrompt, isSelecting, $promptEl, messagesModel, $messages}) {
    if (!isEditing.value && isSelecting.value) {
      // Get the current message
      const $highlight = $messages.value.querySelector(`.highlight`)

      if ($highlight) {
        const id = $highlight.getAttribute('data-id')
        const message = messagesModel.messages[id]
        isSelecting.value = false
        isEditing.value = id
  
        if (message) {
          setTimeout(() => {
            curPrompt.value = message.text
            $promptEl.value.focus()
          }, 0)
        }
      }
    }
  }
}