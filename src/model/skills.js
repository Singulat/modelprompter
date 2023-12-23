import {defineStore} from 'pinia'
import store from './store'

export const useSkillsModel = defineStore({
  id: 'skills',

  state: () => ({
    skills: {},
    activeSkills: [],
    allSkillsDisabled: false,

    // @todo Rename this to something else...it's now used as the highlighted skill
    defaultSkill: '',
    systemPrompt: '',
    planningPrompt: ''
  }),

  actions: {
    async init () {
      await this.getSkills()
      await this.getActiveSkills()

      this.allSkillsDisabled = await store.get('allSkillsDisabled', false)
      this.systemPrompt = await store.get('systemPrompt', this.systemPrompt)
      this.planningPrompt = await store.get('planningPrompt', this.planningPrompt)
      this.defaultSkill = await store.get('defaultSkill', '')
    },

    async save () {
      await store.set({skills: this.skills})
      await store.set({activeSkills: this.activeSkills})
      await store.set({allSkillsDisabled: this.allSkillsDisabled})
      await store.set({defaultSkill: this.defaultSkill})
      await store.set({systemPrompt: this.systemPrompt})
      await store.set({planningPrompt: this.planningPrompt})
    },

    async getActiveSkills () {
      return this.activeSkills = await store.get('activeSkills', [])
    },

    /**
     * Get all channels
     * @returns {channels}
     */
    async getSkills () {
      return this.skills = await store.get('skills', {})
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
      await store.set({skills: this.skills})

      return id
    },

    /**
     * Select a skill as the current one
     */
    async setActiveSkills (ids) {
      await store.set({activeSkills: []})
    },
    async setDefaultSkill (id) {
      await store.set({defaultSkill: id})
      this.defaultSkill = id
    },

    /**
     * Delete specific skill
     */
    async deleteSkill (id) {
      delete this.skills[id]
      await store.set({skills: this.skills})
    },

    /**
     * Update
     */
    async updateSkill (id, skill) {
      this.skills[id].updated_at = Date.now()
      Object.keys(skill).forEach(key => {
        this.skills[id][key] = skill[key]
      })

      await store.set({skills: this.skills})
    },

    /**
     * Enable all skills
     */
    async enableAllSkills () {
      this.allSkillsDisabled = false
      await store.set({allSkillsDisabled: false})
    },

    /**
     * Disable all skills
     */
    async disableAllSkills () {
      this.allSkillsDisabled = true
      await store.set({allSkillsDisabled: true})
    },

    /**
     * Update system prompt
     */
    async updateSystemPrompt (systemPrompt) {
      this.systemPrompt = systemPrompt
      await store.set({systemPrompt: systemPrompt})
    },

    /**
     * Update planning prompt
     */
    async updatePlanningPrompt (planningPrompt) {
      this.planningPrompt = planningPrompt
      await store.set({planningPrompt: planningPrompt})
    },
  }
})