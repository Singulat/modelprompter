import OpenAI from 'openai'
import {useMessagesModel} from './model/messages'
import {createPinia} from 'pinia'
const pinia = createPinia()

// Determines which channels are actively prompting
const channelsActivelyPrompting = {}

/**
 * Handle messages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    /**
     * Either maximizes the popup or creates a new tab if already maximized
     */
    case 'maximizePopup':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Open tab with tabID
        const ID = +request.tabID || tabs[0]?.id
        if (ID) chrome.tabs.create({url: chrome.runtime.getURL(`index.html?context=iframe&tabID=${ID}`)})
      })
    return false

    /**
     * Handle initial prompt to LLM
     */
    case 'sendToLLM':
      // Create openai instance
      const openai = new OpenAI({
        baseURL: request.connection.baseurl,
        apiKey: request.connection.apiKey || '123',
        organization: request.connection.organization,
        dangerouslyAllowBrowser: true
      })
      
      // Send the request
      ;(async ()=> {
        // Chunk the response directly to memory and update by listening to reactive changes in UI
        const messagesModel = useMessagesModel(pinia)
        await messagesModel.init()

        channelsActivelyPrompting[request.channelID] = true
        const completion = await openai.chat.completions.create({
          messages: messagesModel.prepareMessages(request.messages),
          model: request.model,
          temperature: +request.temp,
          stream: true
        })

        let combinedMessage = request.isGeneratingSkills ? request.defaults.text : ''
        let skillPassedTest = false
        for await (const completionChunk of completion) {
          if (!request.isGeneratingSkills) {
            const chunk = completionChunk.choices?.[0]?.delta?.content || ''
            
            // Concat the chunk
            combinedMessage += chunk
            messagesModel.updateMessage(request.assistantId, {
              text: combinedMessage
            })
          } else {
            // If it's a skill, check if its a good match
            const chunk = completionChunk.choices?.[0]?.delta?.content?.trim() || ''
            if (chunk) {
              if (chunk[0] == '1' || chunk.toLowerCase() == 'yes' || chunk.toLowerCase() == 'true') {
                console.log('✅ Passed on chunk', chunk)
                await messagesModel.updateMessage(request.assistantId, {
                  text: combinedMessage + '\n✅'
                })
                skillPassedTest = true
              } else {
                console.log('❌ Failed on chunk', chunk)
                await messagesModel.updateMessage(request.assistantId, {
                  text: combinedMessage + '\n❌'
                })
              }
              break
            }
          }

          if (!channelsActivelyPrompting[request.channelID]) {
            break
          }          
        }
        
        channelsActivelyPrompting[request.channelID] = false
        sendResponse({
          combinedMessage,
          skillPassedTest
        })
      })()

    return true
    
    /**
     * Cancel editing
     */
    case 'cancelPrompting':
      channelsActivelyPrompting[request.channelID] = false
    return false

    /**
     * Inject ModelPrompter
     */
    case 'injectContentscript':
      // Try injecting into current tab
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const ID = +request.tabID || tabs[0]?.id
          if (ID) {
            // Inject the content script into the current tab
            chrome.scripting.executeScript({
              files: ['contentscript.js'],
              target: { tabId: ID }
            })
          }
        })

      // @todo
      } catch (err) {
      }
    return false

    /**
     * Run a line of ModelPrompter
     */
    case 'runModelPrompterScript':
      ;(async ()=> {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const ID = +request.tabID || tabs[0]?.id
          if (ID) {
            // Parse the prompt on the frontend
            const completion = await (async ()=> new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(ID, {
                type: 'contentscript:runModelPrompterScript',
                script: request.script
              }, response => {
                if (response) {
                  resolve(response)
                } else {
                  reject({error: 'NO RESPONSE'})
                }
              })
            }))()

            // Determine how to react to the function to call
            sendResponse(completion)
          } else {
            sendResponse({error: 'NO TABS FOUND'})
          }
        })
      })()
    return true
  }
})
