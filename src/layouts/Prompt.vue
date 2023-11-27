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
        <textarea ref="$prompt" id="prompt" v-model="prompt" autofocus multiline placeholder="Prompt..." @keydown.ctrl.exact.enter="runPrompt"></textarea>
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
          <button v-if="!isThinking" class="fullwidth" :disabled="!prompt" @click="runPrompt">Run prompt</button>
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
            <button class="fullwidth" :disabled="!prompt" @click="updateMessage">Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>



<script setup>
import {ref, onMounted, onUnmounted, computed} from 'vue'
import OpenAI from 'openai'
import MarkdownIt from 'markdown-it'

import { useConnectionsModel } from '../model/connections'
import {useMessagesModel} from '../model/messages'
import {useChannelsModel} from '../model/channels'
import {useTabsModel} from '../model/tabs.js'
import Menu from '../components/Menu.vue'
import WindowChannel from '../components/WindowChannel.vue'
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

const prompt = ref('')
const isThinking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)
const $messages = ref(null)
const $prompt = ref(null)
const $channels = ref(null)

const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()

/**
 * Handle scrolling
 */
// Scroll to bottom once
const scrollBottom = () => {
  const target = $messages.value
  if (target) {
    target.scrollTop = target.scrollHeight
  }
}
onMounted(() => {
  setTimeout(async () => {
    scrollBottom()
    activeChannel.value = await channelsModel.getCurrentChannel()
  }, 0)
})

/**
 * Sort by date
 */
const sortedMessages = computed(function () {
  const messages = messagesModel.getSortedByDate(activeChannel.value)
  return messages
})





/**
 * Channel management
 */
const activeChannel = ref('general')
const isShowingMoreChannel = ref(false)
const isShowingChannelModal = ref(false)

const toggleShowMoreChannel = () => {
  isShowingMoreChannel.value = !isShowingMoreChannel.value
}

// Show new vs edit modals
const channelBeingEdited = ref(null) 
const showNewChannelModal = () => {
  channelBeingEdited.value = null
  isShowingChannelModal.value = true
}
const showEditChannelModal = () => {
  channelBeingEdited.value = activeChannel.value
  isShowingChannelModal.value = true
}

/**
 * Handle channel creation and changing
 */
const onChannelCreated = async (id) => {
  activeChannel.value = id
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  await maybeAddSystemPrompt()
  $prompt.value.focus()
}
const onChannelUpdated = async (id) => {
  isShowingChannelModal.value = false
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  await maybeAddOrUpdateSystemPrompt()
  $prompt.value.focus()
}
const changeCurrentChannel = async (focusPrompt = false) => {
  await channelsModel.setCurrentChannel(activeChannel.value)
  scrollBottom()
  focusPrompt && $prompt.value.focus()
}

/**
 * Delete channel
 */
const deleteChannel = async () => {
  await messagesModel.deleteAll(activeChannel.value)
  await channelsModel.deleteChannel(activeChannel.value)
  activeChannel.value = 'general'
  isShowingMoreChannel.value = false
}

/**
 * Close channel modal
 */
const closeChannelModal = () => {
  isShowingChannelModal.value = false
  tabsModel.adjustZIndex()
}

/**
 * Add system prompt
 */
const maybeAddSystemPrompt = async () => {
  const channel = channelsModel.channels[activeChannel.value]
  if (channel.systemPrompt) {
    await messagesModel.addMessage({
      role: 'system',
      text: channel.systemPrompt,
      channel: activeChannel.value
    })
  }
}

const maybeAddOrUpdateSystemPrompt = async () => {
  const channel = channelsModel.channels[activeChannel.value]
  // Check if the first sorted message is a system prompt, if so update. if not, add a new one with the date a bit before the first
  const sortedClone = [...sortedMessages.value]
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
      channel: activeChannel.value,
      created_at: firstMessage.created_at - 10
    })
  }
}



/**
 * Run prompt
 */
const runPrompt = async () => {
  if (isEditing.value) {
    updateMessage()
    return
  }
  
  // Add the users message
  await messagesModel.addMessage({
    role: 'user',
    text: prompt.value,
    channel: activeChannel.value
  })
  prompt.value = ''

  // Send the messages
  const messages = await messagesModel.getPreparedMessages(activeChannel.value)
  sendToLLM(messages)
}

/**
 * Send to the llm for inference
 */
 const sendToLLM = async (messages, assistantDefaults = {}) => {
  isThinking.value = true
  
  let defaultConnection = connectionsModel.defaultConnection
  defaultConnection = connectionsModel.connections[defaultConnection]

  // Create openai instance
  const openai = new OpenAI({
    baseURL: defaultConnection.baseurl,
    apiKey: defaultConnection.apiKey,
    organization: defaultConnection.organization,
    dangerouslyAllowBrowser: true
  })

  // Send to openai
  const completion = await openai.chat.completions.create({
    messages,
    model: defaultConnection.model,
    temperature: +defaultConnection.temp,
    stream: true
  })

  // Add an empty message to start updating
  const assistantId = await messagesModel.addMessage(Object.assign(assistantDefaults, {
    channel: activeChannel.value,
    role: 'assistant',
    text: '',
  }))
  $prompt.value.focus()

  let combinedMessage = ''
  for await (const chunk of completion) {
    combinedMessage += chunk.choices?.[0]?.delta?.content || ''
    messagesModel.updateMessage(assistantId, {
      text: combinedMessage
    })
    
    scrollBottom()
  }

  isThinking.value = false  
}

// Clear messages
const clearMessages = async () => {
  isShowingMore.value = false
  await messagesModel.deleteAll(activeChannel.value)
  await maybeAddSystemPrompt()
  $prompt.value.focus()
}

/**
 * Edit message
 */
const isEditing = ref(false)
const editMessage = async (ev, stopBubble = false) => {
  // Prevent bubbling, otherwise it would select all the text or bring up native context menu
  if (!isEditing.value || stopBubble) {
    ev.stopPropagation()
    ev.preventDefault()
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
  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })
  
  // Highlight current one
  $message.classList.add('highlight')

  // Update prompt with message
  prompt.value = message.text
  $prompt.value.focus()
}

/**
 * Cancel editing
 */
const cancelEditing = () => {
  isEditing.value = false
  prompt.value = ''
  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
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
    text: prompt.value
  })

  // If this is the first message and it's also a system prompt, update the channel system prompt
  if (message.role === 'system' && sortedMessages.value[0].id === message.id) {
    await channelsModel.updateChannel(activeChannel.value, {
      systemPrompt: prompt.value
    })
  }

  prompt.value = ''
  isEditing.value = false

  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })

  $prompt.value.focus()
}

/**
 * Delete message
 */
const deleteMessage = async () => {
  await messagesModel.deleteMessage(isEditing.value)
  prompt.value = ''
  isEditing.value = false

  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })

  prompt.value = ''
  $prompt.value.focus()
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

  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })
  
  prompt.value = ''
  $prompt.value.focus()
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
  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })

  prompt.value = ''
  $prompt.value.focus()
}

/**
 * Show more panel
 */
const isShowingMore = ref(false)
const showMore = () => {
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
    $prompt.value.focus()
  }, 100)
  
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

    $prompt.value.focus()
  })

  // Show the dropdown and focus it
  Mousetrap.bindGlobal('ctrl+shift+l', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    $channels.value.focus()
  })
})
onUnmounted(() => {
  Mousetrap.unbind('ctrl+shift+n')
  Mousetrap.unbind('ctrl+shift+e')
  Mousetrap.unbind('ctrl+shift+r')
  Mousetrap.unbind('ctrl+shift+l')
})
</script>