<template>
<div class="flex column">
  <fieldset class="flex-auto mb1">
    <legend>Skill Settings</legend>
    <div class="flex">
      <div class="field-row flex-auto">
        <input type="checkbox" id="skills-enabled" @change="toggleAllSkills" :checked="skillsModel.allSkillsDisabled">
        <label for="skills-enabled">Enabled</label>
      </div>
      <div style="flex: 0 1 25%"></div>
      <button @click="isShowingSystemPromptModel = true">Skill system prompt</button>
    </div>
  </fieldset>
  
  <Table
  class="fullheight"
  ref="$table"
  title="Skill"
  :headings="headings"
  :form="skillForm"
  :data="skillsModel.skills"
  :validateForm="validateForm"
  :defaults="skillDefaults"
  :highlightedRow="skillsModel.defaultSkill"
  @updateHighlightedRow="skillsModel.setDefaultSkill"
  @submit="onSubmit"
  @delete="deleteSkill"
  @close="onTableClose"
  ></Table>
</div>

<WindowSkillSystemPrompt
v-if="isShowingSystemPromptModel"
@close="closeSystemPromptModal"
></WindowSkillSystemPrompt>
</template>


<script setup>
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import Mousetrap from 'mousetrap'
import {useSkillsModel} from '../model/skills.js'
import {useTabsModel} from '../model/tabs.js'
import Table from '../components/Table.vue'
import WindowSkillSystemPrompt from '../components/WindowSkillSystemPrompt.vue'

const skillDefaults = {
  name: 'Untitled',
  triggers: 'Always',
  response: ''
}

const headings = [
  {key: 'name', content: 'Name'},
  {key: 'triggers', content: 'Triggers', class: 'gt-md', field: {type: 'textarea'}},
  {key: 'response', content: 'Response', class: 'gt-md', field: {type: 'textarea'}},
]

const $table = ref(null)
const skillsModel = useSkillsModel()
const tabsModel = useTabsModel()
const skillForm = ref(skillDefaults)
const isShowingSystemPromptModel = ref(false)

const validateForm =(record)=> {
  return !!record.name && !!record.response
}


/**
 * Submit form
 */
const onSubmit = async (isEditMode, data)=> {
  let id = skillsModel.defaultSkill
  if (isEditMode) {
    skillsModel.updateSkill(id, data)
  } else {
    id = await skillsModel.addSkill(data)
  }
  
  // Set default
  $table.value.selectRow(id)
}


/**
 * Delete a connection
 */
const deleteSkill =()=> {
  skillsModel.deleteSkill(skillsModel.defaultSkill)
}


/**
 * Update settings
 */
const toggleAllSkills =(e)=> {
  if (e.target.checked) {
    skillsModel.disableAllSkills()
  } else {
    skillsModel.enableAllSkills()
  }
}


/**
 * Update system prompt
 */
const closeSystemPromptModal =()=> {
  isShowingSystemPromptModel.value = false
  tabsModel.adjustZIndex()
  bindEscape()
}




/**
 * Show modal if no connections,
 * otherwise show default connection
 */
onMounted(()=> {
  setTimeout(()=> {
    if (Object.keys(skillsModel.skills).length) {
      $table.value.selectRow(skillsModel.defaultSkill)
    }
  }, 0)

  Mousetrap.bindGlobal('ctrl+shift+s', showSkillSystemPromptModal)
  bindEscape()
})

onBeforeUnmount(()=> {
  Mousetrap.unbind('ctrl+shift+s')
})

const showSkillSystemPromptModal =(ev)=> {
  ev.preventDefault()
  ev.stopPropagation()
  isShowingSystemPromptModel.value = true
  bindEscape()
}


/**
 * Bind escape key (just let it pass through to close the window)
 */
const onTableClose =()=> bindEscape()
const bindEscape =()=> Mousetrap.bindGlobal('esc', ()=> {})
</script>