<template>
<fieldset ref="$messages" class="messages-wrap overflow" style="flex: 0 1 100%; justify-content: space-between">
  <legend>Messages</legend>
  <div class="messages">
    <div
    v-for="message in sortedMessages"
    class="message"
    :data-role="message.role"
    :key="message.id"
    :data-id="message.id"
    @dblclick="$ev => editMessage($ev)"
    @contextmenu="$ev => editMessage($ev)"
    >
      <div class="window">
        <div class="window-body">
          <div v-html="message.text"></div>
        </div>
      </div>
    </div>
  </div>
</fieldset>

<div style="flex: 0;">
  <div class="flex column fullheight pt1 pb1">
    <div class="spacer"></div>
    <div style="flex: 0">
      <div class="mb1">
        <textarea id="prompt" v-model="prompt" autofocus multiline placeholder="Prompt..." @keydown.ctrl.exact.enter="runPrompt"></textarea>
      </div>

      <!-- Prompting -->
      <div v-if="!isEditing" class="flex">
        <div class="flex-auto mr1">
          <div style="display: flex; position: relative">
            <button @click="showMore" :class="{active: isShowingMore}">
              More
              <Menu v-model="isShowingMore" dir="n">
                <li class="hoverable" @click="clearMessages">Clear messages</li>
              </Menu>
            </button>
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
            <button class="fullwidth">Regenerate</button>
          </div>
        </div>
        <div class="flex pt1">
          <div class="mr1">
            <button class="fullwidth" @click="cancelEditing">Cancel</button>
          </div>
          <div class="mr1">
            <button class="fullwidth" :disabled="!prompt" @click="deleteMessage">Delete</button>
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
import {ref, onMounted, computed} from 'vue'
import { useConnectionsModel } from '../model/connections'
import {useMessagesModel} from '../model/messages'
import Menu from '../components/Menu.vue'
import OpenAI from 'openai'

const prompt = ref('')
const isThinking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)
const $messages = ref(null)

const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()

// Scroll to bottom
const scrollBottom = () => {
  const target = $messages.value
  if (target) {
    target.scrollTop = target.scrollHeight
  }
}
const scrollBlast = () => {
  for (let i = 0; i < 25; i += 20) {
    setTimeout(() => {scrollBottom()}, i*25)
  }
}
onMounted(() => {
  scrollBlast()
})

// Run prompt
const runPrompt = async () => {
  if (isEditing.value) {
    updateMessage()
    return
  }
  
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

  // Add the users message
  await messagesModel.addMessage({
    role: 'user',
    text: prompt.value,
  })
  prompt.value = ''
  
  // Send to openai
  const messages = await messagesModel.getPreparedMessages()
  const completion = await openai.chat.completions.create({
    messages,
    model: defaultConnection.model,
    temperature: +defaultConnection.temp,
    stream: true
  })

  // Add an empty message to start updating
  const assistantId = await messagesModel.addMessage({
    role: 'assistant',
    text: '',
  })

  // focus prompt
  const promptEl = document.getElementById('prompt')
  promptEl.focus()

  let combinedMessage = ''
  for await (const chunk of completion) {
    combinedMessage += chunk.choices?.[0]?.delta?.content || ''
    messagesModel.updateMessage(assistantId, {
      text: combinedMessage
    })
    
    scrollBlast()
  }

  isThinking.value = false
}

// Clear messages
const clearMessages = async () => {
  isShowingMore.value = false
  await messagesModel.deleteAll()
}

// Show more panel
const isShowingMore = ref(false)
const showMore = () => {
  isShowingMore.value = !isShowingMore.value
}

// Sort by date
const sortedMessages = computed(messagesModel.getSortedByDate)

/**
 * Edit message
 */
const isEditing = ref(false)
const editMessage = async (ev) => {
  // Prevent bubbling, otherwise it would select all the text or bring up native context menu
  ev.stopPropagation()
  ev.preventDefault()
  isShowingMore.value = false
  
  // Get message
  const $message = ev.target.closest('.message')
  const id = $message.getAttribute('data-id')
  const message = messagesModel.messages[isEditing.value]

  // If already editing, cancel
  if (isEditing.value && id === isEditing.value) {
    cancelEditing()
    return
  }
  isEditing.value = id

  // Unhighlight others
  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })
  
  // Highlight current one
  $message.classList.add('highlight')

  // Update prompt with message
  prompt.value = message.text

  const promptEl = document.getElementById('prompt')
  promptEl.focus()
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

  prompt.value = ''
  isEditing.value = false

  const $messages = document.querySelectorAll('.message')
  $messages.forEach($message => {
    $message.classList.remove('highlight')
  })

  const promptEl = document.getElementById('prompt')
  promptEl.focus()
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

  const promptEl = document.getElementById('prompt')
  promptEl.focus()
  prompt.value = ''
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
  
  const promptEl = document.getElementById('prompt')
  promptEl.focus()
  prompt.value = ''
}
</script>