import {defineStore} from 'pinia'

export const useConnectionsModel = defineStore({
  id: 'connections',
  
  state: () => ({
    defaultConnection: '',
    connections: {}
  }),
  
  actions: {
    /**
     * - Load initial data
     * - Handle storage events
     */
    async init () {
      await this.getConnections()
      const data = await chrome.storage.sync.get('defaultConnection') || {}
      this.defaultConnection = data.defaultConnection || ''
    },

    async save () {
      await chrome.storage.sync.set({connections: this.connections})
      await chrome.storage.sync.set({defaultConnection: this.defaultConnection})
    },

    async setDefault (id) {
      this.defaultConnection = id
      await chrome.storage.sync.set({defaultConnection: id})
    },
    
    async addConnection (connection) {
      const id = crypto.randomUUID()
      this.connections[id] = Object.assign({}, connection)
      await chrome.storage.sync.set({connections: this.connections})
      return id
    },

    async deleteConnection (id) {
      delete this.connections[id]

      if (id === this.defaultConnection) {
        const newDefault = Object.keys(this.connections)?.[0]
    
        if (newDefault) {
          this.setDefault(newDefault)
        } else {
          this.setDefault(null)
        }
      }      

      await chrome.storage.sync.set({connections: this.connections})
    },

    getConnection (id) {
      return this.connections[id]
    },

    async getConnections () {
      // Load from memory
      let connections = await chrome.storage.sync.get('connections') || {}
      if (typeof connections != 'object') {
        connections = {}
      }
      this.connections = connections?.connections || {}

      return this.connections
    },

    async updateConnection (id, connection) {
      this.connections[id] = Object.assign({}, connection)
      await chrome.storage.sync.set({connections: this.connections})
    }
  }
})