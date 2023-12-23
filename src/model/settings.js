import {defineStore} from 'pinia'
import store from './store'

export const useSettingsModel = defineStore({
  id: 'settings',

  state: () => ({
    namespaceName: ''
  }),

  actions: {
    async init () {
      await this.getNamespaceName()
    },

    async save () {
      await store.set({namespaceName: this.namespaceName})
    },

    async getNamespaceName () {
      return this.namespaceName = await store.get('namespaceName', '')
    },

    async setNamespaceName (name) {
      this.namespaceName = name
      await store.set({namespaceName: name})
    }
  }
})