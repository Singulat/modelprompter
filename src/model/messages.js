import {defineStore} from 'pinia'
import store from './store'

export const useMessagesModel = defineStore({
  id: 'messages',

  state: () => ({
    messages: {},
    curPrompt: '',
  }),

  actions: {
    async init (bindListeners = false) {
      await this.getMessages()
      await this.getCurPrompt()

      if (bindListeners) {
        chrome.storage.onChanged.addListener(({messages}) => {
          if (messages?.newValue) {
            this.messages = messages.newValue
          }
        })
      }
    },

    async save () {
      await store.set({messages: this.messages})
    },

    /**
     * Get all messages
     * @returns {messages}
     */
    async getMessages () {
      return this.messages = await store.get('messages', [])
    },

    /**
     * Get current prompt
     */
    async getCurPrompt () {
      return this.curPrompt = await store.get('curPrompt', '')
    },

    /**
     * Add Message
     * @param {*} message 
     * @returns id
     */
    async addMessage (message) {
      const id = message.id || crypto.randomUUID()
      
      message = Object.assign({
        id: id,
        created_at: Date.now(),
        role: 'user',
        channel: 'default',
      }, message)
      
      this.messages[id] = Object.assign({}, message)
      await store.set({messages: this.messages})

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
    async updateMessage (id, message) {
      Object.keys(message).forEach(key => {
        if (this.messages[id] && message[key]) {
          this.messages[id][key] = message[key]
        }
      })
      await store.set({messages: this.messages})
    
      return id
    },

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
      await store.set({messages: this.messages})
    },

    /**
     * Delete specific message
     */
    async deleteMessage (id) {
      delete this.messages[id]
      await store.set({messages: this.messages})
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
    },

    /**
     * Persist the prompt box in case the page closes
     */
    setCurPrompt (prompt) {
      store.set({'curPrompt': prompt})
    }
  }
})