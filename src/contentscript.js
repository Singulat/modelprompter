/**
 * Listen for messages from the background script.
 */
globalThis.___MODELPROMPTER___ = {
  listener: null,
  id: null,
  init () {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        /**
         * Get the whole page as text
         */
        case 'contentscript:runMPScript':
          console.log('🤖 ModelPrompter Function Call:', message.script)
          ;(async ()=> {
            // Determine the function to call
            switch (message.script[0]) {
              case 'getPageText':
                await sendResponse({text: document.body.innerText})
              break
              case 'output':
                await sendResponse({send: 'it'})
              break
              default:
                await sendResponse({error: 'No matching function found: ' + message.script[0]})
              break
            }
          })()
        return true
      }
    })
    console.log('🤖 ModelPrompter listeners initialized')
  }
}
globalThis.___MODELPROMPTER___.init()