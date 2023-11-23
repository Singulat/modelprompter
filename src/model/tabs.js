import {defineStore} from 'pinia'

export const useTabsModel = defineStore({
  id: 'tabs',
  state: () => ({
    adjustZCallbacks: {}
  }),
  
  actions: {
    adjustZIndex() {
      setTimeout(() => {
        Object.keys(this.adjustZCallbacks).forEach(id => {
          this.adjustZCallbacks[id]()
        })
      }, 10)
    },

    onAdjustZIndex (id, cb) {
      this.adjustZCallbacks[id] = cb
    },
    removeOnAdjustZIndex (id) {
      delete this.adjustZCallbacks[id]
    }
  }
})