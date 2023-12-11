<template lang="pug">
//- Messages container
.overflow.fullheight
  fieldset.messages-wrap.overflow.fullheight(ref='$messages')
    legend Messages
    .messages
      .message(v-for='message in sortedMessages' :data-role='message.role' :key='message.id' :data-id='message.id' @dblclick='$ev => onMessageEdit($ev)')
        .window
          .window-body
            div(v-html='renderMarkdown(message.text)')



//- Prompt + Controls area
div(style='flex: 0;')
  .flex.column.fullheight.pt1.pb1
    .spacer
    div(style='flex: 0')
      .mb1(v-if='!isSelecting')
        textarea#prompt(
        ref='$promptEl'
        :class='{"bubble-arrow-hotkeys": !isEditing && !curPrompt?.trim()?.length}'
        :disabled='isSelecting'
        v-model='curPrompt'
        autofocus=''
        multiline=''
        :rows="isEditing ? 7 : 3"
        placeholder='Prompt...' @keydown.ctrl.exact.enter='runPrompt')
      .mb1(v-if='isShowingMore')
        button.fullwidth(@click='clearMessages') Clear messages
        


      //- Prompting
      .flex(v-if='!isEditing && !isSelecting')
        .flex-auto.mr1
          div(style='display: flex; position: relative')
            button(@click='showMore' :class='{active: isShowingMore}') More
        div
          button.fullwidth(v-if='!isWorking' :disabled='!curPrompt' @click='runPrompt') Run prompt
          button.fullwidth(v-else='' @click='cancelPrompt') Cancel prompt



      //- Message Controls
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
            button.fullwidth(@click='deleteMessage') Delete
          div
            button.fullwidth(v-if='isSelecting' @click='onEditMessage') Edit
            button.fullwidth(v-if='isEditing' @click='updateMessage') Update  
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {useMessagesModel} from '../model/messages'
import Menu from '../components/Menu.vue'
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
const props = defineProps({
  messages: Array,
  hotkeysScope: {
    type: String,
    default: 'Messages'
  }
})

// Refs
const $messages = ref(null)
const isEditing = ref(false)
const isSelecting = ref(false)
const curPrompt = ref('')
const $promptEl = ref(null)
const isShowingMore = ref(false)
const isWorking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)



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

  setTimeout(() => {
    const message = messagesModel.messages[isEditing.value]
    curPrompt.value = message.text
    $promptEl.value.focus()
  }, 0)
}



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
 * Cancel editing and deselect message
 */
const cancelEditing =(ev)=> {
  if (isEditing.value) {
    ev?.preventDefault()
    ev?.stopPropagation()
  }

  isEditing.value = false
  isSelecting.value = false
  curPrompt.value = ''
  $messages.value?.querySelector('.highlight')?.classList.remove('highlight')

  setTimeout(() => {
    $messages.value.$promptEl?.focus()
  }, 0)
}


/**
 * Cancel the prompt
 */
const cancelPrompt = ()=> {
  isWorking.value = false
  setTimeout(() => {
    $messages.value.$promptEl?.focus()
  }, 0)
}



/**
 * Clear messages
 */
const clearMessages = async () => {
  isShowingMore.value = false
  await messagesModel.deleteAll(activeChannel.value)
  await maybeAddSystemPrompt()
  $promptEl.value.focus()
}



/**
 * Update a message
 */
const updateMessage = async () => {
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
  curPrompt.value = ''
  isEditing.value = false

  const $messagesEl = $messages.value.querySelectorAll('.message')
  $messagesEl.forEach($message => {
    $message.classList.remove('highlight')
  })

  curPrompt.value = ''
  setTimeout(() => {
    // Select the next message
    if ($nextMessage) {
      selectMessage({target: $nextMessage, isSelecting, $messages})
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
  runPrompt({$messages, promptsToUse, isWorking, $scriptsContainer, curPrompt, isEditing, skillsModel, updateMessage, activeChannel, messagesModel, sendToLLM})
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
  
  curPrompt.value = ''
  $promptEl.value.focus()
}



/**
 * Show more menu
 * @fixme get rid of menu
 */
const showMore =()=> {isShowingMore.value = !isShowingMore.value}



/**
 * Render Markdown
 */
const renderMarkdown = (text) => {
  text = DOMPurify.sanitize(md.render(text), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })
  return md.render(text)
}



/**
 * Sort by date
 */
const sortedMessages = ()=> {
  const messages = messagesModel.getSortedByDate(activeChannel.value)
  return messages
}



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
 * Handle onmount
 */
onMounted(() => {
  // Focus things
  setTimeout(() => {
    scrollBottom()
    $promptEl.value?.focus()
  }, 100)

  // Message management
  hotkeys('enter', props.hotkeysScope, () => editSelectedMessage(true))
  hotkeys('delete', props.hotkeysScope, async()=> deleteMessage(true))

  // Navigation
  hotkeys('up', props.hotkeysScope, prevMessage)
  hotkeys('down', props.hotkeysScope, nextMessage)

  // Escaping
  hotkeys('esc', props.hotkeysScope, onEsc)
})



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
    selectMessage({target: $message, isSelecting, $messages})
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
}


/**
 * onEsc
 */
const onEsc = (ev) => {
  if (isWorking.value || isEditing.value || isSelecting.value) {
    ev?.preventDefault()
    ev?.stopPropagation()
  }
  curPrompt.value = ''
  isWorking.value = false

  if (isSelecting.value) {
    isSelecting.value = false

    cancelEditing(ev)
    return
  }
  
  if (isEditing.value) {
    isSelecting.value = isEditing.value
    isEditing.value = false
  }
}


/**
 * Defined methods
 */
defineExpose({
  scrollBottom,
  $promptEl
})
</script>