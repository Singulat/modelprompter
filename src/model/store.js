import throttle from '@jcoreio/async-throttle'

const throttledSet = throttle(async data => {
  await chrome.storage[store.mode].set(data)
}, 600)

const store = {
  mode: 'sync',

  /**
   * Set a value
   * @param {*} data
   */
  set: throttledSet,

  /**
   * Get a value with optional default
   * @param {*} key 
   * @param {*} defaultValue 
   * @returns 
   */
  async get (key, defaultValue) {
    const data = await chrome.storage[this.mode].get(key) || {}
    return data[key] || defaultValue
  },

  /**
   * Clear everything in the store
   */
  async clear () {
    await chrome.storage[this.mode].clear()
  }
}


export default store