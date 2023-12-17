<template lang="pug">
// Channel section
.flex-auto
  Channels(
    ref='$channels'
    hotkeysScope='PromptLayout'
    :isEditing='isEditing'
    :isWorking='isWorking'
    :activeChannel='activeChannel'
    @update:activeChannel='activeChannel = $event'
    @scrollBottom='$messages.scrollBottom()'
    @focusPrompt='$messages?.$promptBox?.focus()'
    @maybeAddSystemPrompt='maybeAddSystemPrompt'
    @maybeAddOrUpdateSystemPrompt='maybeAddOrUpdateSystemPrompt'
    @resetChannel='$messages.clearMessages()'
  )


// Display messages and editing area
Messages(
  ref='$messages'
  hotkeysScope='PromptLayout'
  :activeChannel='activeChannel'
)
  template(v-slot:prompting)
  template(v-slot:editing)
</template>



<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'
import Messages from '../components/Messages.vue'
import Channels from '../components/Channels.vue'
import hotkeys from 'hotkeys-js'

// Refs
const $channels = ref(null)
const $messages = ref(null)
const activeChannel = ref('general')

/**
 * Channel management
 */
const closeChannelModal =()=> {
  $channels.value.closeChannelModal()
  hotkeys.setScope('PromptLayout')
}

/**
 * Message management
 */
const maybeAddSystemPrompt = async()=> await $messages.value.maybeAddSystemPrompt()
const maybeAddOrUpdateSystemPrompt = async()=> await $messages.value.maybeAddOrUpdateSystemPrompt()

/**
 * Keyboard shortcuts
 */
onMounted(() => hotkeys.setScope('PromptLayout'))
onBeforeUnmount(() => hotkeys.deleteScope('PromptLayout'))
</script>