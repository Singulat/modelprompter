<template>
<Window :title="props.isEditing ? 'Update channel' : 'Add new channel'" class="modal" canClose isModal @close="closeModal">
  <div class="field-row-stacked">
    <label for="channel-name">Channel:</label>
    <input type="text" id="channel-name" ref="channelName" autofocus placeholder="Untitled" v-model="channelForm.name" @keydown.escape.prevent="closeModal" @keydown.enter.prevent="submitChannelForm" />
  </div>

  <div class="flex pt3">
    <button class="flex-auto mr2" @click="closeModal">Cancel</button>
    <button ref="addChannelButton" :disabled="!isValidForm" @click="submitChannelForm">
      <span v-if="isEditing">Update channel</span>
      <span v-else>Add channel</span>
    </button>
  </div>
</Window>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import Window from '../components/Window.vue'
import {useTabsModel} from '../model/tabs.js'
import {useChannelsModel} from '../model/channels.js'

const channelDefaults = {
  name: 'Untitled',
}
const channelsModel = useChannelsModel()

const tabsModel = useTabsModel()
const channelName = ref(null)
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
      channelForm.value.name = channel.name
    }
    
    channelName.value.focus()
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