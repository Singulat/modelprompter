export async function asyncThrottle(fn, wait, options = {}) {
  let lastCallTime = 0
  let isThrottled = false
  let result

  return async function (...args) {
    const now = Date.now()

    if (!isThrottled || now - lastCallTime >= wait) {
      isThrottled = true
      lastCallTime = now
      result = await fn.apply(this, args)

      if (options.trailing) {
        isThrottled = false
      }
    }

    return result
  }
}
