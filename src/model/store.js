const store = {
  /**
   * Set a value
   * @param {*} data
   * @param {*} mode 'local', 'sync', or 'managed'
   * @param {boolean} throttle
   */
  async set (data, mode='local') {
    await chrome.storage[mode].set(data)
  },

  /**
   * Get a value with optional default
   * @param {*} key 
   * @param {*} defaultValue 
   * @returns 
   */
  async get (key, defaultValue, mode='local') {
    if (mode === 'managed') mode = this.mode
    const data = await chrome.storage[mode].get(key) || {}
    return data[key] || defaultValue
  },

  /**
   * Clear everything in the store
   */
  async clear (mode='local') {
    if (mode === 'managed') mode = this.mode
    await chrome.storage[mode].clear()
  }
}


export default store