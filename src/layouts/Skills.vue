<template lang="pug">
.flex.column
  fieldset.flex-auto.mb1
    legend Skill Settings
    .flex
      .field-row.flex-auto
        input#skills-enabled(type='checkbox' @change='toggleAllSkills' :checked='!skillsModel.allSkillsDisabled')
        label(for='skills-enabled') Enabled
      div(style='flex: 0 1 25%')
      button(@click='showSystemPromptEditor') Skill system prompt
  Table.fullheight(
    ref='$table'
    hotkeysScope="Skills"
    title='Skill'
    :headings='headings'
    :form='skillForm'
    :data='skillsModel.skills'
    :validateForm='validateForm'
    :defaults='skillDefaults'
    :highlightedRow='skillsModel.defaultSkill'
    @updateHighlightedRow='id => skillsModel.setDefaultSkill(id)'
    @submit='onSubmit'
    @delete='deleteSkill'
    @close='onTableClose'
  )
</template>


<script setup>
import {ref, inject, onMounted, onBeforeUnmount} from 'vue'
import hotkeys from 'hotkeys-js'
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

const bus = inject('bus')
const $table = ref(null)
const skillsModel = useSkillsModel()
const skillForm = ref(skillDefaults)

const validateForm =(record)=> {
  return !!record.name
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
const toggleAllSkills =(ev)=> {
  bus.value.$emit('toggleAllSkills', ev)
}

const showSystemPromptEditor =(ev)=> {
  bus.value.$emit('showSystemPromptEditor', ev)
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

  // Show skills modal
  hotkeys.setScope('Skills')
  bindEscape()
})

onBeforeUnmount(()=> {
  hotkeys.deleteScope('Skills')
})

/**
 * Bind escape key (just let it pass through to close the window)
 */
const onTableClose =()=> bindEscape()
const bindEscape =()=> hotkeys('esc', 'Skills', ()=> {})
</script>