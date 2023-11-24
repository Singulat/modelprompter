<template>
<fieldset ref="$messages" class="messages-wrap overflow" style="flex: 0 1 100%; justify-content: space-between">
  <legend>Messages</legend>
  <div class="messages">
    <div class="message" v-for="message in sortedMessages" :data-role="message.role" :key="message.id" :data-id="message.id">
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
      <div class="flex">
        <div class="flex-auto">
          <div style="display: flex; position: relative">
            <button @click="showMore" :class="{active: showingMore}">
              More
              <Menu v-model="showingMore" dir="n">
                <li class="hoverable" @click="clearMessages">Clear messages</li>
              </Menu>
            </button>
            <button class="mr1" @click="startGettingTabHTMLAsString">Scan</button>
          </div>
        </div>
        <div>
          <button v-if="!isThinking" class="fullwidth" :disabled="!prompt" @click="runPrompt">Run prompt</button>
          <button v-else class="fullwidth" disabled>Thinking...</button>
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
  showingMore.value = false
  await messagesModel.deleteAll()
}

// Show more panel
const showingMore = ref(false)
const showMore = () => {
  showingMore.value = !showingMore.value
}

// Sort by date
const sortedMessages = computed(messagesModel.getSortedByDate)

/**
 * Scan the page by stringifying the DOM and sending it to Claude
 */
const startGettingTabHTMLAsString = async () => {
  chrome.runtime.sendMessage({type: 'startGettingTabHTMLAsString'})
}
</script>