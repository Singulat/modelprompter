<template lang="pug">
Window.modal(
title='Update System Prompts'
hotkeysScope="SkillsWindow"
canClose
isModal
@close='closeModal')
  .field-row-stacked
    label(for='skill-system-prompt') Skills Prompt:
    textarea#skill-system-prompt(ref='skillSystemPrompt' rows='7' autofocus placeholder='Untitled' v-model='skillForm.systemPrompt' @keydown.ctrl.exact.enter.prevent='submitSkillForm' style='rows: 7;')
  .field-row-stacked
    label(for='skill-planning-prompt') Planning Prompt:
    textarea#skill-planning-prompt(ref='skillPlanningPrompt' rows='7' autofocus placeholder='Untitled' v-model='skillForm.planningPrompt' @keydown.ctrl.exact.enter.prevent='submitSkillForm' style='rows')
  .flex.pt3
    button.flex-auto.mr2(@click='closeModal') Cancel
    button(@click='submitSkillForm') Update prompt
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
    skillForm.value.planningPrompt = skillsModal.planningPrompt
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
  await skillsModal.updatePlanningPrompt(skillForm.value.planningPrompt)
  closeModal()
}
</script>