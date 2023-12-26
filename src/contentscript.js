/**
 * Listen for messages from the background script.
 */
globalThis.__GPT_SCRATCHPAD__ = {
  listener: null,
  id: null,
  init () {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        /**
         * Get the whole page as text
         */
        case 'contentscript:runGPTScript':
          console.log('🤖 GPT Scratchpad Function Call:', message.script)
          ;(async ()=> {
            // Determine the function to call
            switch (message.script[0]) {
              /**
               * Return the whole page as text
               */
              case 'getPageText':
                await sendResponse({text: document.body.innerText})
              break

              /**
               * Truthy
               */
              case 'prompt':
              case 'output':
                await sendResponse({send: 'it'}) // can be any value
              break

              default:
                await sendResponse({error: 'No matching function found: ' + message.script[0]})
              break
            }
          })()
        return true
      }
    })
    console.log('🤖 GPT Scratchpad listeners initialized')
  }
}
globalThis.__GPT_SCRATCHPAD__.init()