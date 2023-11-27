<template>
<Table
ref="$table"
:headings="headings"
:form="skillForm"
:data="skillsModel.skills"
:isValidForm="isValidForm"
:defaults="skillDefaults"
:highlightedRow="skillsModel.skills[skillsModel.defaultskill]"
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
  {key: 'triggers', content: ''},
  {key: 'response', content: '', class: 'gt-md'},
]

const $table = ref(null)
const skillsModel = useSkillsModel()
const skillForm = ref(skillDefaults)

const isValidForm = computed(() => {
  return !!skillForm.value.name && !!skillForm.value.response
})


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
</script>