import {defineStore} from 'pinia'

export const useSkillsModel = defineStore({
  id: 'skills',

  state: () => ({
    skills: {},
    activeSkills: [],
    allSkillsDisabled: false,

    // @todo Rename this to something else...it's now used as the highlighted skill
    defaultSkill: '',
    systemPrompt: ``,
    planningPrompt: ``
  }),

  actions: {
    async init () {
      await this.getSkills()
      await this.getActiveSkills()

      const data = await chrome.storage.sync.get('defaultSkill') || {}
      this.allSkillsDisabled = !!(await chrome.storage.sync.get('allSkillsDisabled'))?.allSkillsDisabled
      this.systemPrompt = (await chrome.storage.sync.get('systemPrompt'))?.systemPrompt || this.systemPrompt
      this.planningPrompt = (await chrome.storage.sync.get('planningPrompt'))?.planningPrompt || this.planningPrompt
      this.defaultSkill = data.defaultSkill || ''
    },

    async save () {
      await chrome.storage.sync.set({skills: this.skills})
      await chrome.storage.sync.set({activeSkills: this.activeSkills})
      await chrome.storage.sync.set({allSkillsDisabled: this.allSkillsDisabled})
      await chrome.storage.sync.set({defaultSkill: this.defaultSkill})
      await chrome.storage.sync.set({systemPrompt: this.systemPrompt})
      await chrome.storage.sync.set({planningPrompt: this.planningPrompt})
    },

    async getActiveSkills () {
      this.activeSkills = await chrome.storage.sync.get('activeSkills')
      return this.activeSkills?.activeSkills || []
    },

    /**
     * Get all channels
     * @returns {channels}
     */
    async getSkills () {
      // Load from memory
      let skills = await chrome.storage.sync.get('skills')
      if (typeof skills != 'object') {
        skills = {}
      }
      this.skills = skills?.skills || {}

      return this.skills
    },

    /**
     * Add Skill
     * @param {*} skill 
     * @returns id
     */
    async addSkill (skill) {
      const id = crypto.randomUUID()
      
      skill = Object.assign({
        id: id,
        name: 'Untitled',
        created_at: Date.now(),
        triggers: '',
        response: '',
      }, skill)
      
      this.skills[id] = Object.assign({}, skill)
      await chrome.storage.sync.set({skills: this.skills})

      return id
    },

    /**
     * Select a skill as the current one
     */
    async setActiveSkills (ids) {
      await chrome.storage.sync.set({activeSkills: []})
    },
    async setDefaultSkill (id) {
      await chrome.storage.sync.set({defaultSkill: id})
      this.defaultSkill = id
    },

    /**
     * Delete specific skill
     */
    async deleteSkill (id) {
      delete this.skills[id]
      await chrome.storage.sync.set({skills: this.skills})
    },

    /**
     * Update
     */
    async updateSkill (id, skill) {
      this.skills[id].updated_at = Date.now()
      Object.keys(skill).forEach(key => {
        this.skills[id][key] = skill[key]
      })

      await chrome.storage.sync.set({skills: this.skills})
    },

    /**
     * Enable all skills
     */
    async enableAllSkills () {
      this.allSkillsDisabled = false
      await chrome.storage.sync.set({allSkillsDisabled: false})
    },

    /**
     * Disable all skills
     */
    async disableAllSkills () {
      this.allSkillsDisabled = true
      await chrome.storage.sync.set({allSkillsDisabled: true})
    },

    /**
     * Update system prompt
     */
    async updateSystemPrompt (systemPrompt) {
      this.systemPrompt = systemPrompt
      await chrome.storage.sync.set({systemPrompt: systemPrompt})
    },

    /**
     * Update planning prompt
     */
    async updatePlanningPrompt (planningPrompt) {
      this.planningPrompt = planningPrompt
      await chrome.storage.sync.set({planningPrompt: planningPrompt})
    },
  }
})