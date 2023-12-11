import {defineStore} from 'pinia'

export const useChannelsModel = defineStore({
  id: 'channels',

  state: () => ({
    channels: {},
    currentChannel: 'general'
  }),

  actions: {
    async init () {
      await this.getChannels()
      await this.getCurrentChannel()
    },

    async save () {
      await chrome.storage.sync.set({channels: this.channels})
      await chrome.storage.sync.set({currentChannel: this.currentChannel})
    },

    async getCurrentChannel () {
      this.currentChannel = await chrome.storage.sync.get('currentChannel')
      return this.currentChannel?.currentChannel || 'general'
    },

    /**
     * Get all channels
     * @returns {channels}
     */
    async getChannels () {
      // Load from memory
      let channels = await chrome.storage.sync.get('channels') || {}
      if (typeof channels != 'object') {
        channels = {}
      }
      this.channels = channels?.channels || {}

      return this.channels
    },

    /**
     * Add Channel
     * @param {*} channel 
     * @returns id
     */
    async addChannel (channel) {
      const id = crypto.randomUUID()
      
      channel = Object.assign({
        id: id,
        name: 'Untitled',
        created_at: Date.now(),
      }, channel)
      
      this.channels[id] = Object.assign({}, channel)
      await chrome.storage.sync.set({channels: this.channels})

      return id
    },

    /**
     * Select a channel as the current one
     */
    async setCurrentChannel (id) {
      await chrome.storage.sync.set({currentChannel: id})
    },

    /**
     * Delete specific channel
     */
    async deleteChannel (id) {
      delete this.channels[id]
      await chrome.storage.sync.set({channels: this.channels})
    },

    /**
     * Update
     */
    async updateChannel (id, channel) {
      this.channels[id].updated_at = Date.now()
      Object.keys(channel).forEach(key => {
        this.channels[id][key] = channel[key]
      })

      await chrome.storage.sync.set({channels: this.channels})
    }
  }
})