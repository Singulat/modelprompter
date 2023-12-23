export default {
  mode: 'sync',

  /**
   * Set a value
   * @param {*} data 
   */
  async set (data) {
    await chrome.storage[this.mode].set(data)
  },

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