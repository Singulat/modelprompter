import {defineStore} from 'pinia'
import store from './store'

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
      await store.set({channels: this.channels})
      await store.set({currentChannel: this.currentChannel})
    },

    async getCurrentChannel () {
      return this.currentChannel = await store.get('currentChannel', 'general')
    },

    /**
     * Get all channels
     * @returns {channels}
     */
    async getChannels () {
      return this.channels = await store.get('channels', {})
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
      await store.set({channels: this.channels})

      return id
    },

    /**
     * Select a channel as the current one
     */
    async setCurrentChannel (id) {
      await store.set({currentChannel: id})
    },

    /**
     * Delete specific channel
     */
    async deleteChannel (id) {
      delete this.channels[id]
      await store.set({channels: this.channels})
    },

    /**
     * Update
     */
    async updateChannel (id, channel) {
      this.channels[id].updated_at = Date.now()
      Object.keys(channel).forEach(key => {
        this.channels[id][key] = channel[key]
      })

      await store.set({channels: this.channels})
    }
  }
})