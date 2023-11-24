import {defineStore} from 'pinia'
import {throttle} from 'lodash'

export const useMessagesModel = defineStore({
  id: 'messages',

  state: () => ({
    messages: {}
  }),

  actions: {
    async init () {
      await this.getMessages()
    },

    /**
     * Get all messages
     * @returns {messages}
     */
    async getMessages () {
      // Load from memory
      let messages = await chrome.storage.sync.get('messages') || {}
      if (typeof messages != 'object') {
        messages = {}
      }
      this.messages = messages?.messages || {}

      return this.messages
    },

    /**
     * Add Message
     * @param {*} message 
     * @returns id
     */
    async addMessage (message) {
      const id = crypto.randomUUID()
      
      message.id = id
      message.created_at = message.created_at || Date.now()
      message.role = message.role || 'user'
      message.channel = message.channel || 'default'
      
      this.messages[id] = Object.assign({}, message)
      await chrome.storage.sync.set({messages: this.messages})

      return id
    },

    /**
     * Transforms our messages into the format OpenAI expects
     * @returns [openai messages]
     */
    async getPreparedMessages () {
      await this.getMessages()
      const messages = this.getSortedByDate()
      const preparedMessages = []

      // Loop through each message and prepare it for sending
      messages.forEach(message => {
        preparedMessages.push({
          role: message.role,
          content: message.text,
        })
      })

      return preparedMessages
    },

    /**
     * Update message
     */
    updateMessage: throttle(async function (id, message) {
      Object.keys(message).forEach(key => {
        this.messages[id][key] = message[key]
      })
      await chrome.storage.sync.set({messages: this.messages})

      return id
    }, 200),

    /**
     * Delete all messages
     */
    async deleteAll () {
      this.messages = {}
      await chrome.storage.sync.set({messages: this.messages})
    },

    getSortedByDate () {
      const messages = Object.values(this.messages).sort((a, b) => {
        return a.created_at - b.created_at
      })
      return messages
    }
  }
})