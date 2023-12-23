import {defineStore} from 'pinia'
import store from './store'

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
      this.defaultConnection = await store.get('defaultConnection', {})
    },

    async save () {
      await store.set({connections: this.connections})
      await store.set({defaultConnection: this.defaultConnection})
    },

    async setDefault (id) {
      this.defaultConnection = id
      await store.set({defaultConnection: id})
    },
    
    async addConnection (connection) {
      const id = crypto.randomUUID()
      this.connections[id] = Object.assign({}, connection)
      await store.set({connections: this.connections})
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

      await store.set({connections: this.connections})
    },

    getConnection (id) {
      return this.connections[id]
    },

    async getConnections () {
      return this.connections = await store.get('connections', {})
    },

    async updateConnection (id, connection) {
      this.connections[id] = Object.assign({}, connection)
      await store.set({connections: this.connections})
    }
  }
})