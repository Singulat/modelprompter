<template>
<div class="flex-auto">
  <fieldset class="overflow fullheight">
    <legend>Channel</legend>
    <div class="flex">
      <select ref="$channels" class="mr1" name="channel" v-model="activeChannel" @change="changeCurrentChannel(false)" @keydown.enter="changeCurrentChannel(true)">
        <option value="general">Scratchpad</option>
        <option v-for="channel in channelsModel.channels" :key="channel.id" :value="channel.id">{{channel.name}}</option>
      </select>
      <button :class="{'flex-auto': true, active: isShowingMoreChannel}" @click="toggleShowMoreChannel">More</button>
    </div>
    <div v-if="isShowingMoreChannel" class="flex pt1">
      <button :disabled="activeChannel == 'general'" class="flex-auto mr1" @click="deleteChannel">Delete</button>
      <button :disabled="activeChannel == 'general'" class="flex-auto mr1" @click="showEditChannelModal">Edit</button>
      <button class="flex-auto" @click="showNewChannelModal">New</button>
    </div>
  </fieldset>
</div>

<WindowChannel v-if="isShowingChannelModal" @created="onChannelCreated" @updated="onChannelUpdated" @close="closeChannelModal" :isEditing="channelBeingEdited"></WindowChannel>

<div class="overflow fullheight">
  <fieldset ref="$messages" class="messages-wrap overflow fullheight">
    <legend>Messages</legend>
    <div class="messages">
      <div
      v-for="message in sortedMessages"
      class="message"
      :data-role="message.role"
      :key="message.id"
      :data-id="message.id"
      @dblclick="$ev => editMessage($ev)"
      @contextmenu="$ev => editMessage($ev, true)"
      >
        <div class="window">
          <div class="window-body">
            <div v-html="renderMarkdown(message.text)"></div>
          </div>
        </div>
      </div>
    </div>
  </fieldset>
</div>

<div style="flex: 0;">
  <div class="flex column fullheight pt1 pb1">
    <div class="spacer"></div>
    <div style="flex: 0">
      <div class="mb1">
        <textarea ref="$promptEl" id="prompt" v-model="curPrompt" autofocus multiline placeholder="Prompt..." @keydown.ctrl.exact.enter="runPrompt"></textarea>
      </div>

      <div v-if="isShowingMore" class="mb1">
        <button class="fullwidth" @click="clearMessages">Clear messages</button>
      </div>

      <!-- Prompting -->
      <div v-if="!isEditing" class="flex">
        <div class="flex-auto mr1">
          <div style="display: flex; position: relative">
            <button @click="showMore" :class="{active: isShowingMore}">More</button>
          </div>
        </div>
        <div>
          <button v-if="!isThinking" class="fullwidth" :disabled="!curPrompt" @click="runPrompt">Run prompt</button>
          <button v-else class="fullwidth" disabled>Thinking...</button>
        </div>
      </div>

      <!-- Editing -->
      <div v-else>
        <div class="flex">
          <div class="mr1">
            <button @click="showingChangeRole = !showingChangeRole" :class="{fullwidth: true, active: showingChangeRole}">
              Change role
              <Menu v-model="roleToChangeTo" dir="n">
                <li class="hoverable" @click="changeRole('system')">System</li>
                <li class="hoverable" @click="changeRole('user')">User</li>
                <li class="hoverable" @click="changeRole('assistant')">Assistant</li>
              </Menu>
            </button>
          </div>
          <div>
            <button @click="regenerateMessage" class="fullwidth">Regenerate</button>
          </div>
        </div>
        <div class="flex pt1">
          <div class="mr1">
            <button class="fullwidth" @click="cancelEditing">Cancel</button>
          </div>
          <div class="mr1">
            <button class="fullwidth" @click="deleteMessage">Delete</button>
          </div>
          <div>
            <button class="fullwidth" :disabled="!curPrompt" @click="updateMessage">Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>



<script setup>
/**
 * Dependencies
 */
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import MarkdownIt from 'markdown-it'
import Mousetrap from 'mousetrap'


/**
 * Vue
 */
import { useConnectionsModel } from '../../model/connections'
import {useMessagesModel} from '../../model/messages'
import {useChannelsModel} from '../../model/channels'
import {useTabsModel} from '../../model/tabs.js'
import Menu from '../../components/Menu.vue'
import WindowChannel from '../../components/WindowChannel.vue'


/**
 * Helpers
 */
import helpers from './helpers'
import channel from './channel'
import prompt from './prompt'


/**
 * Refs
 */
const curPrompt = ref('')
const isThinking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)
const $messages = ref(null)
const $promptEl = ref(null)


/**
 * Stores
 */
const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()


/**
 * Set active channel
 */
onMounted(() => {
  setTimeout(async () => {
    scrollBottom()
    activeChannel.value = await channelsModel.getCurrentChannel()
  }, 0)
})


/**
 * Helpers
 */
const scrollBottom =()=> helpers.scrollBottom({$messages})
const sortedMessages = computed(() => helpers.sortedMessages({messagesModel, activeChannel}))


/**
 * Channel management
 */
const $channels = ref(null)
const activeChannel = ref('general')
const isShowingMoreChannel = ref(false)
const isShowingChannelModal = ref(false)
const channelBeingEdited = ref(null) 

const toggleShowMoreChannel =()=> channel.toggleShowMoreChannel({isShowingMoreChannel})
const showNewChannelModal =()=> channel.showNewChannelModal({channelBeingEdited, isShowingChannelModal})
const showEditChannelModal =()=> channel.showEditChannelModal({isShowingChannelModal, channelBeingEdited, activeChannel})

const onChannelCreated = async()=> channel.onChannelCreated({activeChannel, tabsModel, $promptEl, maybeAddSystemPrompt})
const onChannelUpdated = async(id)=> channel.onChannelUpdated({id, isShowingChannelModal, isShowingMoreChannel, tabsModel, maybeAddOrUpdateSystemPrompt, $promptEl})
const changeCurrentChannel = async(focusPrompt = false)=> channel.changeCurrentChannel({activeChannel, channelsModel, scrollBottom, focusPrompt, $promptEl})

const deleteChannel =()=> channel.deleteChannel({messagesModel, channelsModel, activeChannel, isShowingMoreChannel, isShowingChannelModal, tabsModel, $promptEl, scrollBottom})
const closeChannelModal =()=> channel.closeChannelModal({isShowingChannelModal, tabsModel})


/**
 * Prompting
 */
const maybeAddSystemPrompt = async()=> await prompt.maybeAddSystemPrompt({channelsModel, activeChannel, messagesModel})
const maybeAddOrUpdateSystemPrompt = async()=> await prompt.maybeAddOrUpdateSystemPrompt({channelsModel, activeChannel, messagesModel, sortedMessages})
const runPrompt = async()=> await prompt.runPrompt({isEditing, curPrompt, messagesModel, activeChannel, sendToLLM, scrollBottom})
const sendToLLM = async(messages, assistantDefaults = {}) => await prompt.sendToLLM({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, $promptEl, scrollBottom})


/**
 * Message management
 */
const isEditing = ref(false)
const clearMessages =()=> prompt.clearMessages({isShowingMore, messagesModel, activeChannel, maybeAddSystemPrompt, $promptEl})
const editMessage = (ev, stopBubble = false)=> prompt.editMessage({ev, stopBubble, isEditing, isShowingMore, messagesModel, curPrompt, $messages, $promptEl})



/**
 * Cancel editing
 */
const cancelEditing =()=> {
  isEditing.value = false
  curPrompt.value = ''
  const $messagesEl = $messages.value.querySelectorAll('.message')
  $messagesEl.forEach($message => {
    $message.classList.remove('highlight')
  })
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
const deleteMessage = async () => {
  await messagesModel.deleteMessage(isEditing.value)
  curPrompt.value = ''
  isEditing.value = false

  const $messagesEl = $messages.value.querySelectorAll('.message')
  $messagesEl.forEach($message => {
    $message.classList.remove('highlight')
  })

  curPrompt.value = ''
  $promptEl.value.focus()
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
 * Regenerate message
 */
const regenerateMessage = async () => {
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
}

/**
 * Show more panel
 */
const isShowingMore = ref(false)
const showMore =()=> {
  isShowingMore.value = !isShowingMore.value
}

/**
 * Render markdown
 */
const md = new MarkdownIt()
const renderMarkdown = (text) => {
  return md.render(text)
}

/**
 * Keyboard shortcuts
 */
onMounted(() => {
  setTimeout(() => {
    scrollBottom()
    $promptEl.value?.focus()
  }, 10)
  
  // New channel
  Mousetrap.bindGlobal('ctrl+shift+n', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    showNewChannelModal()
  })

  // Edit channel
  Mousetrap.bindGlobal('ctrl+shift+e', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    showEditChannelModal()
  })

  // Delete messsage
  Mousetrap.bindGlobal('ctrl+shift+d', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    deleteMessage()
  })

  // Delete channel
  Mousetrap.bindGlobal('ctrl+shift+r', async (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    
    // Delete if not general and not have messages, otherwise just clear
    if (channelsModel.currentChannel !== 'general' && !sortedMessages.value.length) {
      await deleteChannel()
    } else {
      await clearMessages()
    }

    $promptEl.value.focus()
  })

  // Show the dropdown and focus it
  Mousetrap.bindGlobal('ctrl+shift+l', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    $channels.value.focus()
  })

  // Enter selection mode (or select the prev message)
  Mousetrap.bindGlobal('ctrl+shift+up', (ev) => {
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
  })

  Mousetrap.bindGlobal('ctrl+shift+down', (ev) => {
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
  })

  /**
   * Cancel
   */
  Mousetrap.bindGlobal('esc', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    cancelEditing()
    $promptEl.value.focus()
  })
})
onBeforeUnmount(() => {
  Mousetrap.unbind('ctrl+shift+n')
  Mousetrap.unbind('ctrl+shift+e')
  Mousetrap.unbind('ctrl+shift+d')
  Mousetrap.unbind('ctrl+shift+r')
  Mousetrap.unbind('ctrl+shift+l')
  Mousetrap.unbind('ctrl+shift+up')
  Mousetrap.unbind('ctrl+shift+down')
})
</script>