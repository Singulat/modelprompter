import {defineStore} from 'pinia'
import Scripts from '../controller/scripts'
import Skills from '../controller/skills'
import { useMessagesModel } from '../model/messages'
import { useConnectionsModel } from '../model/connections'
import { useSkillsModel } from '../model/skills'

export const usePromptCtrl = defineStore({
  id: 'prompt',

  state: () => ({
    messagesModel: null,
    skillsModel: null,
    isWorking: false,
    activeChannel: 'general',
  }),

  actions: {
    ...Scripts,
    ...Skills,

    async init () {
      this.skillsModel = useSkillsModel()
      this.messagesModel = useMessagesModel()
      this.connectionsModel = useConnectionsModel()
    },

    /**
     * Send to the llm for inference
     * @returns {skillPassedTest}
     */
    async sendToLLM ({messages, channel, defaults}) {
      // Add a placeholder message to start updating
      const assistantId = await this.messagesModel.addMessage(Object.assign({
        channel,
        role: 'assistant',
        text: '🤔 Thinking...',
      }, defaults))
    
      // Extract possible non message
      let isGeneratingSkills = !!defaults.isGeneratingSkills
      delete defaults.isGeneratingSkills
      
      // Setup connection
      let defaultConnection = this.connectionsModel.defaultConnection
      defaultConnection = this.connectionsModel.connections[defaultConnection]
    
      // Pull out all placeholders into a seperate array
      // and remove them from the messages
      const placeholders = [...messages.filter(message => message.role === 'placeholder')]
      messages = messages.filter(message => message.role !== 'placeholder')

      // Remove any with skip
      messages = messages.filter(message => !message.skip)
    
      // Send to openai
      console.log('📦 Sending to LLM', messages)
      const completion = await (async ()=> new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'sendToLLM',
          assistantId,
          messages,
          channel,
          model: defaultConnection.model,
          isGeneratingSkills,
          defaults,
          connection: {
            baseurl: defaultConnection.baseurl,
            apiKey: defaultConnection.apiKey,
            organization: defaultConnection.organization,        
          },
          temperature: +defaultConnection.temp,
          stream: true
        }, response => {
          if (response.error) {
            reject(response.error)
          } else {
            resolve(response)
          }
        })
      }))()
    
      return {
        placeholders,
        skillPassedTest: completion.skillPassedTest,
        combinedMessage: completion.combinedMessage,
        assistantId
      }
    },
  
    /**
     * Remove placeholder elements
     * (they already get removed from store)
     */
    removePlaceholders (placeholders) {
      for (const placeholder of placeholders) {
        // Remove the placeholder from the dom
        const $placeholder = document.querySelector(`.messages [data-id="${placeholder.id}"]`)
        if ($placeholder) {
          $placeholder.remove()
        }
        
        // Remove from store if it's there too
        this.messagesModel.deleteMessage(placeholder.id)
      }
    }
  },
})