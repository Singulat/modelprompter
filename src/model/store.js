import {throttle} from 'lodash-es'

// Can only do 120 calls per minute, so throttle for a little
// less than 2 per second to account for other calls
const throttledSet = throttle(async data => {
  await chrome.storage[store.mode].set(data)
}, 600, {trailing: true})

const store = {
  /**
   * Set a value
   * @param {*} data
   * @param {boolean} throttle Whether to throttle or not
   * @param {*} mode 'local', 'sync', or 'managed'
   * @param {boolean} throttle
   */
  async set (data, throttle=false, mode='local') {
    if (throttle) {
      throttledSet(data)
    } else {
      await chrome.storage[mode].set(data)
    }
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