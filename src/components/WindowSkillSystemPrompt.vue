<template>
<Window title="Update Skill System Prompt" class="modal" canClose isModal @close="closeModal">
  <div class="field-row-stacked">
    <label for="skill-system-prompt">System Prompt:</label>
    <textarea id="skill-system-prompt" ref="skillSystemPrompt" rows="10" autofocus placeholder="Untitled" v-model="skillForm.systemPrompt" @keydown.ctrl.exact.enter.prevent="submitSkillForm" />
  </div>

  <div class="flex pt3">
    <button class="flex-auto mr2" @click="closeModal">Cancel</button>
    <button @click="submitSkillForm">Update prompt</button>
  </div>
</Window>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import Window from './Window.vue'
import {useTabsModel} from '../model/tabs.js'
import {useSkillsModel} from '../model/skills.js'

const skillsModal = useSkillsModel()
const tabsModel = useTabsModel()
const skillSystemPrompt = ref(null)
const skillForm = ref({systemPrompt: ''})

const props = defineProps({
  isEditing: String
})
const emit = defineEmits(['close', 'updated'])

/**
 * Manage tab z-index bug
 */
onMounted(() => {
  setTimeout(() => {
    tabsModel.adjustZIndex()
    skillForm.value.systemPrompt = skillsModal.systemPrompt
    skillSystemPrompt.value.focus()
  }, 0)
})
const closeModal = () => {
  emit('close')
}

/**
 * Submit the form
 */
const submitSkillForm = async () => {
  await skillsModal.updateSystemPrompt(skillForm.value.systemPrompt)
  closeModal()
}
</script>