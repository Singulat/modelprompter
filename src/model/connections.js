import {defineStore} from 'pinia'

export const useConnectionsModel = defineStore({
  id: 'connections',
  
  state: () => ({
    connections: {}
  }),
  
  actions: {
    async init () {
      await this.getConnections()
    },
    
    async addConnection (connection) {
      const id = crypto.randomUUID()
      this.connections[id] = Object.assign({}, connection)
      await chrome.storage.sync.set({connections: this.connections})
      return id
    },

    removeConnection (id) {
      delete this.connections[id]
      chrome.storage.sync.set({connections: this.connections})
    },

    async getConnections () {
      // Load from memory
      let connections = await chrome.storage.sync.get('connections') || {}
      if (typeof connections != 'object') {
        connections = {}
      }
      this.connections = connections?.connections || {}

      return this.connections
    }
  }
})