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

    async save () {
      await chrome.storage.sync.set({messages: this.messages})
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
      
      message = Object.assign({
        id: id,
        created_at: Date.now(),
        role: 'user',
        channel: 'default',
      }, message)
      
      this.messages[id] = Object.assign({}, message)
      await chrome.storage.sync.set({messages: this.messages})

      return id
    },

    /**
     * Transforms our messages into the format OpenAI expects
     * @returns [openai messages]
     */
    async getPreparedMessages (channelID) {
      await this.getMessages()
      const messages = this.getSortedByDate(channelID)
      return this.prepareMessages(messages)
    },
    prepareMessages (messages) {
      const preparedMessages = []

      // Loop through each message and prepare it for sending
      messages.forEach(message => {
        preparedMessages.push({
          role: message.role,
          // Alias since I keep mixing these up 😅
          content: message.text || message.content,
        })
      })

      return preparedMessages
    },

    /**
     * Update message
     */
    updateMessage: throttle(async function (id, message) {
      Object.keys(message).forEach(key => {
        if (this.messages[id] && message[key]) {
          this.messages[id][key] = message[key]
        }
      })
      await chrome.storage.sync.set({messages: this.messages})

      return id
    }, 200),

    /**
     * Delete all messages
     */
    async deleteAll (channelID) {
      // Delete all messages for a specific channel
      const messages = Object.values(this.messages).filter(message => {
        return message.channel != channelID
      })
      this.messages = {}
      messages.forEach(message => {
        this.messages[message.id] = message
      })
      await chrome.storage.sync.set({messages: this.messages})
    },

    /**
     * Delete specific message
     */
    async deleteMessage (id) {
      delete this.messages[id]
      await chrome.storage.sync.set({messages: this.messages})
    },

    /**
     * Get messages sorted by date
     * @returns [messages]
     */
    getSortedByDate (channelID) {
      const messages = Object.values(this.messages).filter(message => {
        return message.channel == channelID
      }).sort((a, b) => {
        return a.created_at - b.created_at
      })
      
      return messages
    }
  }
})