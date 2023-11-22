/**
 * Handle messages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // The callback for runtime.onMessage must return falsy if we're not sending a response
  (async () => {
    console.log('🔔 Background notification', request, sender)
    switch (request.type) {
      case 'maximizePopup':
        // Message tabs
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.create({url: chrome.runtime.getURL('index.html?context=iframe')})
          }
        })
      break

      case 'startGettingTabHTMLAsString':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {type: 'getTabHTMLAsString'})
          }
        })
      break
    }
  })()
})
