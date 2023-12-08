<template lang="pug">
window.modal(:title="props.isEditing ? 'Update channel' : 'Add new channel'" canclose='' ismodal='' @close='closeModal')
  .field-row-stacked
    label(for='channel-name') Channel:
    input#channel-name(type='text' ref='channelName' autofocus='' placeholder='Untitled' v-model='channelForm.name' @keydown.ctrl.exact.enter.prevent='submitChannelForm')
  .field-row-stacked
    label(for='channel-name') System Prompt:
    textarea#channel-system-prompt(ref='channelSystemPrompt' autofocus='' placeholder='Untitled' v-model='channelForm.systemPrompt' @keydown.ctrl.exact.enter.prevent='submitChannelForm')
  .flex.pt3
    button.flex-auto.mr2(@click='closeModal') Cancel
    button(ref='addChannelButton' :disabled='!isValidForm' @click='submitChannelForm')
      span(v-if='isEditing') Update channel
      span(v-else='') Add channel
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import Window from '../components/Window.vue'
import {useTabsModel} from '../model/tabs.js'
import {useChannelsModel} from '../model/channels.js'

const channelDefaults = {
  name: 'Untitled',
  systemPrompt: 'You are a friendly assistant.'
}
const channelsModel = useChannelsModel()

const tabsModel = useTabsModel()
const channelName = ref(null)
const channelSystemPrompt = ref(null)
const channelForm = ref(channelDefaults)

const props = defineProps({
  isEditing: String
})
const emit = defineEmits(['close', 'created', 'updated'])

/**
 * Manage tab z-index bug
 */
onMounted(() => {
  setTimeout(() => {
    tabsModel.adjustZIndex()

    if (props.isEditing) {
      const channel = channelsModel.channels[props.isEditing]
      // Exit if general, because we can't edit it yet
      if (!channel) return emit('close')
      
      channelForm.value.name = channel.name
      channelForm.value.systemPrompt = channel.systemPrompt
    }
    
    if (props.isEditing) {
      channelSystemPrompt.value.focus()
    } else {
      channelName.value.focus()
    }
  }, 0)
})
const closeModal = () => {
  emit('close')
}

/**
 * Validate form
 */
const isValidForm = computed(() => {
  return channelForm.value.name.trim().length
})

/**
 * Submit the form
 */
const submitChannelForm = async () => {
  if (isValidForm.value) {
    if (props.isEditing) {
      await channelsModel.updateChannel(props.isEditing, channelForm.value)
      emit('updated')
    } else {
      const id = await channelsModel.addChannel(channelForm.value)
      await channelsModel.setCurrentChannel(id)
      emit('created', id)
    }
    closeModal()
  }
}
</script>