import {defineStore} from 'pinia'
import {throttle} from 'lodash'

export const useChannelsModel = defineStore({
  id: 'channels',

  state: () => ({
    channels: {}
  }),

  actions: {
    async init () {
      await this.getChannels()
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
     * Delete all channels
     */
    async deleteChannels () {
      this.channels = {}
      await chrome.storage.sync.set({channels: this.channels})
    },

    /**
     * Delete specific channel
     */
    async deleteChannel (id) {
      delete this.channels[id]
      await chrome.storage.sync.set({channels: this.channels})
    }
  }
})