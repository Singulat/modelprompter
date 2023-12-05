<template>
<div class="flex column">
  <fieldset class="flex-auto mb1">
    <legend>Skill Settings</legend>
    <div class="field-row">
      <input type="checkbox" id="skills-enabled" @change="toggleAllSkills" :checked="skillsModel.allSkillsDisabled">
      <label for="skills-enabled">Enabled</label>
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
</template>


<script setup>
import {ref, computed, onMounted} from 'vue'
import Mousetrap from 'mousetrap'
import {useSkillsModel} from '../model/skills.js'
import Table from '../components/Table.vue'

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
const skillForm = ref(skillDefaults)

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
 * Show modal if no connections,
 * otherwise show default connection
 */
 onMounted(()=> {
  setTimeout(()=> {
    if (Object.keys(skillsModel.skills).length) {
      $table.value.selectRow(skillsModel.defaultSkill)
    }
  }, 0)

  bindEscape()
})


/**
 * Bind escape key (just let it pass through to close the window)
 */
const onTableClose =()=> bindEscape()
const bindEscape =()=> Mousetrap.bindGlobal('esc', (ev)=> {})
</script>