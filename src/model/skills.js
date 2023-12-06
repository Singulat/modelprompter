import {defineStore} from 'pinia'

export const useSkillsModel = defineStore({
  id: 'skills',

  state: () => ({
    skills: {},
    activeSkills: [],
    allSkillsDisabled: false,

    // @todo Rename this to something else...it's now used as the highlighted skill
    defaultSkill: '',
    systemPrompt: `You'll be shown a "Skill" in the form:

<pre>
\`\`\`skill_title
\${skill.name}
\`\`\`

---

\`\`\`skill_triggers
\${skill.triggers}
\`\`\`
</pre>

Your job is simply to respond with 0 or 1 if the skill is a good match for the users prompt.

It's very important that you do not respond with anything other than 0 or 1.`,
    

  planningPrompt: `You'll be shown a list of "Skills" that were selected to be used for the users prompt along with how you should use those skills. Only use the skills when they make sense though, these are just a list of what's available to use. The Skills will be shown to you in the form:

<pre>
\`\`\`skill_title
\${skill.name}
\`\`\`

---

\`\`\`skill_response
\${skill.response}
\`\`\`
</pre>

If no Skills make sense for the latest Prompt in the message history, then just reply to the users message as usual.`
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