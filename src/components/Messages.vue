<template lang="pug">
// Messages container
.overflow.fullheight
  fieldset.messages-wrap.overflow.fullheight(ref='$messages')
    legend Messages
    .messages
      .message(v-for='message in sortedMessages' :data-role='message.role' :key='message.id' :data-id='message.id' @dblclick='$ev => onMessageEdit($ev)')
        .window
          .window-body
            div(v-html='renderMarkdown(message.text)')



// Prompt + Controls area
div(style='flex: 0;')
  .flex.column.fullheight.pt1.pb1
    .spacer
    div(style='flex: 0')
      PromptBox#prompt(
        v-if='!isSelecting'
        ref='$promptBox'
        :hotkeysScope='props.hotkeysScope'
        :class='{"bubble-arrow-hotkeys": !isEditing && !$promptBox?.value?.curPrompt?.trim()?.length}'
        :isSelecting='isSelecting'
        :isEditing='isEditing'
        :isWorking='isWorking'
        :activeChannel='props.activeChannel'
        @clearMessages='clearMessages'
        @startWorking='isWorking = true'
        @stopWorking='stopWorking'
        @scrollBottom='scrollBottom'
        @updateMessage='updateMessage'
      )

      // Message Controls
      div(v-if='isEditing || isSelecting')
        .flex
          .mr1
            button(@click='showingChangeRole = !showingChangeRole' :class='{fullwidth: true, active: showingChangeRole}')
              | Change role
              Menu(v-model='roleToChangeTo' dir='n')
                li.hoverable(@click="changeRole('system')") System
                li.hoverable(@click="changeRole('user')") User
                li.hoverable(@click="changeRole('assistant')") Assistant
          div
            button.fullwidth(@click='regenerateMessage') Regenerate
        .flex.pt1
          .mr1
            button.fullwidth(@click='cancelEditing') Cancel
          .mr1
            button.fullwidth(@click='deleteMessage(false)') Delete
          div
            button.fullwidth(v-if='isSelecting' @click='onEditMessage') Edit
            button.fullwidth(v-if='isEditing' @click='updateMessage') Update  
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {useMessagesModel} from '../model/messages'
import {useChannelsModel} from '../model/channels'
import Menu from '../components/Menu.vue'
import PromptBox from '../components/PromptBox.vue'
import MarkdownIt from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import DOMPurify from 'dompurify'
import hotkeys from 'hotkeys-js'

// Markdown
const md = new MarkdownIt({
  html: true,
})
md.use(MarkdownItAttrs)

// Stores and props
const messagesModel = useMessagesModel()
const channelsModel = useChannelsModel()
const props = defineProps({
  messages: Array,
  hotkeysScope: {type: String, default: 'Messages'},
  activeChannel: {type: String, default: 'general'}
})

// Refs
const $messages = ref(null)
const isEditing = ref(false)
const isSelecting = ref(false)
const $promptBox = ref(null)
const isWorking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)



/**
 * ########################################
 * ############# SELECT MODE ##############
 * ########################################
 */

/**
 * Select message and enter edit mode
 */
const onMessageEdit =(ev)=> {
  const $message = ev.target?.closest('.message')
  if ($message) {
    selectMessage($message)
    editSelectedMessage()
  }
}
const onEditMessage = (ev)=> hotkeys.trigger('enter', props.hotkeysScope, ev)


/**
 * Visually select message and scroll to it
 */
 const selectMessage = (target)=> {
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
}



/**
 * Enter selection mode (or select the prev message)
 */
 const prevMessage = (ev) => {
  // Ignore naked arrows if in an input without bubbling
  if (!ev?.shiftKey && !ev?.ctrlKey && ['INPUT', 'TEXTAREA'].includes(ev?.target?.tagName) && !ev?.target?.classList?.contains('bubble-arrow-hotkeys')) {
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
    selectMessage($message)
    isSelecting.value = $message.getAttribute('data-id')
  }
}

/**
 * Next message
 */
const nextMessage = (ev) => {
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
    selectMessage($message)
  } else {
    isSelecting.value = false
    if ($highlight) {
      $highlight.classList.remove('highlight')
    }
    setTimeout(() => {
      $promptBox.value && $promptBox.value.focus()
    }, 0)
  }
}





/**
 * ########################################
 * ############# EDIT MODE ################
 * ########################################
 */

/**
 * Edit selected message
 * @param {Boolean} isKey Whether the event was triggered by a keyboard shortcut
 */
const editSelectedMessage =(isKey)=> {
  // Bail if not editing/selecting
  if ((isKey && isEditing.value) || (isKey && !isEditing.value && !isSelecting.value)) return
  
  // Get the current message
  isEditing.value = isSelecting.value
  isSelecting.value = false
  
  // highlight the message with id
  const $highlight = $messages.value.querySelector(`.highlight`)
  if (!$highlight) {
    $messages.value.querySelector(`[data-id="${isEditing.value}"]`)?.classList?.add('highlight')
  }

  // Update the prompt box
  setTimeout(() => {
    const message = messagesModel.messages[isEditing.value]
    if ($promptBox.value) {
      $promptBox.value.curPrompt = message.text
      $promptBox.value.focus()
    }
  }, 0)
}


/**
 * Update a message
 */
const updateMessage = async () => {
  const id = isEditing.value || isWorking.value
  
  const message = messagesModel.messages[id]
  await messagesModel.updateMessage({
    updated_at: Date.now(),
    text: $promptBox.value?.curPrompt
  })

  // If this is the first message and it's also a system prompt, update the channel system prompt
  if (message.role === 'system' && sortedMessages[0].id === message.id) {
    await channelsModel.updateChannel(props.activeChannel, {
      systemPrompt: $promptBox.value?.curPrompt
    })
  }

  if ($promptBox.value) {
    $promptBox.value.curPrompt = ''
  }
  if (isEditing.value) {
    isEditing.value = false
  }

  const $messagesEl = $messages.value.querySelectorAll('.message')
  $messagesEl.forEach($message => {
    $message.classList.remove('highlight')
  })

  if ($promptBox.value) {
    $promptBox.value.focus()
  }
}



/**
 * Cancel editing and deselect message
 */
const cancelEditing =(ev)=> {
  if (isEditing.value) {
    ev?.preventDefault()
    ev?.stopPropagation()
  }

  isEditing.value = false
  isSelecting.value = false
  isWorking.value = false
  chrome.runtime.sendMessage({
    type: 'cancelPrompting',
    channel: props.activeChannel
  })

  if ($promptBox.value) $promptBox.value.curPrompt = ''
  $messages.value?.querySelector('.highlight')?.classList.remove('highlight')

  setTimeout(() => {
    $promptBox.value && $promptBox.value.focus()
  }, 10)
}


/**
 * Cancel prompt streaming
 */
const stopWorking = ()=> {
  isWorking.value = false
  isEditing.value = false
  isSelecting.value = false
  chrome.runtime.sendMessage({
    type: 'cancelPrompting',
    channel: props.activeChannel
  })
  
  setTimeout(() => {
    $promptBox.value && $promptBox.value.focus()
  }, 0)
}



/**
 * ########################################
 * ################# CRUD #################
 * ########################################
 */


/**
 * Clear messages
 */
const clearMessages = async () => {
  await messagesModel.deleteAll(props.activeChannel)
  await maybeAddSystemPrompt()
  $promptBox.value && $promptBox.value.focus()
}



/**
 * Delete message
 */
 const deleteMessage = async (isKey) => {
  if ((isKey && isEditing.value) || (isKey && !isEditing.value && !isSelecting.value)) return

  // Get the next message to focus on
  const $highlight = $messages.value.querySelector(`.highlight`)
  const $nextMessage = $highlight?.nextElementSibling || $highlight?.previousElementSibling
  const nextMessageID = $nextMessage?.getAttribute('data-id')
  
  // Delete based on mode
  if (isSelecting.value) {
    await messagesModel.deleteMessage(isSelecting.value)
  } else if (isEditing.value) {
    await messagesModel.deleteMessage(isEditing.value)
  }
  if ($promptBox.value) $promptBox.value.curPrompt = ''
  isEditing.value = false

  const $messagesEl = $messages.value.querySelectorAll('.message')
  $messagesEl.forEach($message => {
    $message.classList.remove('highlight')
  })

  if ($promptBox.value) $promptBox.value.curPrompt = ''
  setTimeout(() => {
    // Select the next message
    if ($nextMessage) {
      selectMessage($nextMessage)
    } else {
      hotkeys.trigger('esc', props.hotkeysScope)
    }
  }, 0)
}


/**
 * Regenerate message
 */
const regenerateMessage = async () => {
  let promptsToUse = []
  // Get all messages up to the current one
  const activeMessage = isEditing.value || isSelecting.value
  console.log('regenerate message')
}


/**
 * Change the role of a message
 */
const changeRole = async (role) => {
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
  
  if ($promptBox.value) $promptBox.value.curPrompt = ''
  $promptBox.value && $promptBox.value.focus()
}




/**
 * ########################################
 * ############## System prompt ###########
 * ########################################
 */

/**
 * Add system prompt
 */
const maybeAddSystemPrompt = async () => {
  const channel = channelsModel.channels[props.activeChannel]
  if (channel?.systemPrompt) {
    await messagesModel.addMessage({
      role: 'system',
      text: channel.systemPrompt,
      channel: props.activeChannel
    })
  }
}


/**
 * Add or update system prompt
 */
const maybeAddOrUpdateSystemPrompt = async () => {
  const channel = channelsModel.channels[props.activeChannel]

  // Update the first system prompt, otherwise add a new one
  if (sortedMessages) {
    const sortedClone = [...sortedMessages]
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
        channel: props.activeChannel,
        created_at: firstMessage.created_at - 10
      })
    }
  // Add a new one
  } else {
    await messagesModel.addMessage({
      role: 'system',
      text: channel?.systemPrompt,
      channel: props.activeChannel,
      created_at: Date.now()
    })
  }
}






/**
 * ########################################
 * ################# Other ################
 * ########################################
 */



/**
 * Render Markdown
 */
const renderMarkdown = (text = '') => {
  text = DOMPurify.sanitize(md.render(text), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })
  return md.render(text)
}



/**
 * Sort by date
 */
const sortedMessages = computed(()=> {
  const messages = messagesModel.getSortedByDate(props.activeChannel)
  return messages
})



/**
 * Scroll the message area to bottom
 */
const scrollBottom =()=> {
  const target = $messages?.value
  if (target) {
    target.scrollTop = target.scrollHeight
  }  
}



/**
 * Shortcuts and other things to do on mount
 */
onMounted(() => {
  // Focus things
  setTimeout(() => {
    scrollBottom()
    $promptBox.value && $promptBox.value.focus()
  }, 100)

  // Message management
  hotkeys('enter', props.hotkeysScope, () => editSelectedMessage(true))
  hotkeys('delete', props.hotkeysScope, async()=> deleteMessage(true))

  // Navigation
  hotkeys('up', props.hotkeysScope, prevMessage)
  hotkeys('down', props.hotkeysScope, nextMessage)

  // Escaping
  hotkeys('esc', props.hotkeysScope, onEscape)
})



/**
 * onEscape
 * - This handles the "tiered" context,
 *  the deeper into edit you are the more you can escape
 */
const onEscape = (ev) => {
  if (isWorking.value || isEditing.value || isSelecting.value) {
    ev?.preventDefault()
    ev?.stopPropagation()
  }
  if ($promptBox.value) $promptBox.value.curPrompt = ''
  isWorking.value = false
  chrome.runtime.sendMessage({
    type: 'cancelPrompting',
    channel: props.activeChannel
  })
  
  // Clear prompt
  if (!isEditing.value && !isSelecting.value) {
    setTimeout(() => {
      cancelEditing(ev)
    }, 0)
    return
  }
  
  // Cancel selection and prompt
  if (isSelecting.value) {
    isSelecting.value = false
    cancelEditing(ev)
    return
  }
  
  // Cancel editing back into selection
  if (isEditing.value) {
    isSelecting.value = isEditing.value
    isEditing.value = false
  }
}


/**
 * Defined methods
 */
defineExpose({
  clearMessages,
  maybeAddSystemPrompt,
  maybeAddOrUpdateSystemPrompt,
  scrollBottom,
  $promptBox
})
</script>