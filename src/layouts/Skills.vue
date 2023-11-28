<template>
<Table
ref="$table"
title="Skill"
:headings="headings"
:form="skillForm"
:data="skillsModel.skills"
:validateForm="validateForm"
:defaults="skillDefaults"
:highlightedRow="skillsModel.skills[skillsModel.defaultSkill]"
@updateHighlightedRow="skillsModel.setDefault"
@submit="onSubmit"
@delete="deleteSkill"
></Table>
</template>


<script setup>
import {ref, computed, onMounted} from 'vue'
import {useSkillsModel} from '../model/skills.js'
import Table from '../components/Table.vue'

const skillDefaults = {
  name: 'Untitled',
  triggers: 'Always',
  response: ''
}

const headings = [
  {key: 'name', content: 'Name'},
  {key: 'triggers', content: 'Triggers', field: {type: 'textarea'}},
  {key: 'response', content: 'Response', class: 'gt-md', field: {type: 'textarea'}},
]

const $table = ref(null)
const skillsModel = useSkillsModel()
const skillForm = ref(skillDefaults)

const validateForm = (record) => {
  return !!record.name && !!record.response
}


/**
 * Submit form
 */
const onSubmit = async (isEditMode, data) => {
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
const deleteSkill = () => {
  skillsModel.deleteSkill(skillsModel.defaultSkill)
}




/**
 * Show modal if no connections,
 * otherwise show default connection
 */
 onMounted(() => {
  setTimeout(() => {
    if (!Object.keys(skillsModel.skills).length) {
      $table.value.showAddModal()
    } else {
      $table.value.selectRow(skillsModel.defaultSkill)
    }
  }, 0)
})
</script>