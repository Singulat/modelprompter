/**
 * Let the background script know that the content script has been loaded.
 */
chrome.runtime.sendMessage({type: 'contentscriptLoaded'})

/**
 * Listen for messages from the background script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    /**
     * Get the whole page as text
     */
    case 'contentscript:getWholePage':
      console.log('🤖 ModelPrompter Function Calling - contentscript:getWholePage')
      sendResponse({text: document.body.innerText})
    return true
  }
})