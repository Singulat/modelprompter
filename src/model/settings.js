import {defineStore} from 'pinia'

export const useSettingsModel = defineStore({
  id: 'settings',

  state: () => ({
    namespaceName: ''
  }),

  actions: {
    async init () {
      await this.getNamespaceName()
    },

    async getNamespaceName () {
      this.namespaceName = await chrome.storage.sync.get('namespaceName')
      return this.namespaceName?.namespaceName || this.namespaceName || ''
    },

    async setNamespaceName (name) {
      this.namespaceName = name
      await chrome.storage.sync.set({namespaceName: name})
    }
  }
})