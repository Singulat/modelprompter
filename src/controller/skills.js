export default {
  /**
   * Extract skills
   */
  async extractSkills (prompt) {
    let response
    let neededPlan = false

    if (!this.skillsModel.allSkillsDisabled) {
      const skillsToParse = await this.getSkills(prompt)
      const rawSkills = Object.values(this.skillsModel.skills)
      const passedSkills = []
      const responses = []
      const placeholders = []

      // Check each skill individually
      console.log('🤸 Evaluating required skills', rawSkills)
      for (let i = 0; i < skillsToParse.length; i++) {
        if (!this.isWorking) return

        console.log('🤔 Checking skill:', rawSkills[i].name)
        response = await this.sendToLLM({
          messages: skillsToParse[i],
          channel: this.activeChannel,
          defaults: {
            role: 'placeholder',
            text: `📋 Checking skill: ${rawSkills[i].name}`,
            isGeneratingSkills: true
          }
        })

        response.skillPassedTest && passedSkills.push(rawSkills[i])
        responses.push(response)
        placeholders.push({id: response.assistantId})
      }
      this.removePlaceholders(placeholders)

      
      if (this.isWorking) {
        /**
         * Send as normal message if no skills needed
         */
        if (passedSkills.length === 0) {
          const messages = await this.messagesModel.getPreparedMessages(this.activeChannel)
          console.log('💬 No skills needed. Generating response.')
          response = await this.sendToLLM({
            messages,
            channel: this.activeChannel,
            defaults: {text: '🤔 Thinking...', role: 'assistant'}
          })
          this.removePlaceholders([response.placeholders])
        
        /**
         * Otherwise generate a plan
         */
        } else {
          const messages = await this.messagesModel.getPreparedMessages(this.activeChannel)

          /**
           * Planning stage
           */
          // Add skills
          for (const skill of passedSkills.reverse()) {
            messages.unshift({
              role: 'system',
              content: `<skill>Skill name: ${skill.name}
  <trigger>
    ${skill.triggers}
  </trigger>
  <reaction>
    ${skill.response}
  </reaction>
</skill>`
            })
          }

          // Add planning prompt
          messages.unshift({
            role: 'system',
            content: this.skillsModel.planningPrompt,
          })
          
          // Send it
          neededPlan = true
          console.log('📋 Generating plan')
          response = await this.sendToLLM({
            messages,
            channel: this.activeChannel,
            defaults: {text: '🤔 Thinking...', role: 'assistant'},
          })

          
          // Remove placeholders
          console.log('📋 Plan generated:\n', response.combinedMessage)
          this.removePlaceholders([response.placeholders])
          await this.messagesModel.updateMessage(response.assistantId, {
            text: response.combinedMessage
          })
        }
      }
    } else {
      if (this.isWorking) {
        const messages = await this.messagesModel.getPreparedMessages(this.activeChannel)
        response = await this.sendToLLM({
          messages,
          channel: this.activeChannel,
          defaults: {text: '🤔 Thinking...', role: 'assistant'}
        })
        this.removePlaceholders([response.placeholders])
      }
    }

    // Extract scripts from the response and run them
    if (this.isWorking) {
      console.log('🖨️ Scanning for scripts')

      /**
       * Print additional data
       */
      await this.scanAndRunScripts(response)
      neededPlan && console.log('📋 Reviewing plan and results')
      neededPlan && console.log('🫡 Confirming')

    // End the message round
    } else {
      console.log('✋ Message round cancelled')
    }
    console.log('💤 Message round over')
  },




  /**
   * Get skills
   */
  async getSkills (prompt = '.') {
    // Send each skill for inference to check if it's a good match
    const rawSkills = Object.values(this.skillsModel.skills)
    const skills = []
    
    for (const skill of rawSkills) {
      // System prompt
      let skillMessages = [
        {
          role: 'system',
          text: `${this.skillsModel.systemPrompt}`,
          skill
        }
      ]
      
      // Skill compare against
      skillMessages.push({
        role: 'system',
        text: `<skill>
  <name>${skill.name}</name>
  <trigger>${skill.triggers}</trigger>
</skill>`,
      })

      // User Prompt
      skillMessages.push({
        role: 'user',
        text: `${prompt}`
      })
      
      const prepped = await this.messagesModel.prepareMessages(skillMessages)
      skills.push(prepped)
    }

    return skills
  }  
}