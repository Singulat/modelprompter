<template lang="pug">
fieldset.overflow.fullheight
  legend Channel
  //- Main section
  .flex
    select.mr1(ref='$channels' name='channel' v-model='activeChannel' @change='changeCurrentChannel(false)' @keydown.enter='changeCurrentChannel(true)')
      option(value='general') Scratchpad
      option(v-for='channel in channelsModel.channels' :key='channel.id' :value='channel.id') {{channel.name}}
    button(:class="{'flex-auto': true, active: isShowingMoreChannel}" @click='toggleShowMoreChannel') More

  //- Expanded/Edit section
  .flex.pt1(v-if='isShowingMoreChannel')
    button.flex-auto.mr1(:disabled="activeChannel == 'general'" @click='deleteChannel') Delete
    button.flex-auto.mr1(:disabled="activeChannel == 'general'" @click='showEditChannelModal') Edit
    button.flex-auto(@click='showNewChannelModal') New


  //- Channel edit window
  WindowChannel(
    v-if='isShowingChannelModal'
    @created='onChannelCreated'
    @updated='onChannelUpdated'
    @close='closeChannelModal'
    restoreHotkeysScope='PromptLayout'
    :isEditing='isChannelBeingEdited'
    :activeChannel='activeChannel'
  )
</template>


<script setup>
import {ref, onMounted, watch} from 'vue'
import hotkeys from 'hotkeys-js'
import {useChannelsModel} from '../model/channels'
import {useMessagesModel} from '../model/messages'
import {useTabsModel} from '../model/tabs.js'
import WindowChannel from '../components/WindowChannel.vue'

// Refs
const $channels = ref(null)
const activeChannel = ref('general')
const isShowingMoreChannel = ref(false)
const isShowingChannelModal = ref(false)
const isChannelBeingEdited = ref(null) 

// Props and stores
const channelsModel = useChannelsModel()
const messagesModel = useMessagesModel()
const tabsModel = useTabsModel()
const props = defineProps({
  hotkeysScope: {type: String, default: 'Channels'},
  isEditing: {type: Boolean, default: false},
  isWorking: {type: Boolean, default: false},
  activeChannel: {type: String, default: 'general'}
})

// Emiters
const emit = defineEmits(['scrollBottom', 'focusPrompt', 'maybeAddOrUpdateSystemPrompt', 'maybeAddSystemPrompt', 'resetChannel'])
watch(activeChannel, (val) => emit('update:activeChannel', val))


/**
 * Change channel
 */
const changeCurrentChannel = async (focusPrompt) => {
  await channelsModel.setCurrentChannel(activeChannel.value)
  activeChannel.value = activeChannel.value
  emit('scrollBottom')
  focusPrompt && emit('focusPrompt')
}


/**
 * Toggle show more
 */
const toggleShowMoreChannel = () => {
  isShowingMoreChannel.value = !isShowingMoreChannel.value
}


/**
 * Show new vs edit modals
 */
const showNewChannelModal = () => {
  isChannelBeingEdited.value = null
  isShowingChannelModal.value = true
}
const showEditChannelModal = () => {
  isChannelBeingEdited.value = activeChannel.value
  isShowingChannelModal.value = true
}


/**
 * Handle channel creation and changing
 */
const onChannelCreated = async (id) => {
  await channelsModel.setCurrentChannel(id)
  activeChannel.value = id
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  emit('maybeAddSystemPrompt')
  emit('focusPrompt')
}

const onChannelUpdated = async (id) => {
  isShowingChannelModal.value = false
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  emit('maybeAddOrUpdateSystemPrompt')
  emit('focusPrompt')
}




/**
 * Delete channel
 */
const deleteChannel = async () => {
  await messagesModel.deleteAll(activeChannel.value)
  await channelsModel.deleteChannel(activeChannel.value)
  await channelsModel.setCurrentChannel('general')
  activeChannel.value = 'general'
  isShowingMoreChannel.value = false
  emit('scrollBottom')
}

/**
 * Close channel modal
 */
const closeChannelModal = () => {
  isShowingChannelModal.value = false
  tabsModel.adjustZIndex()
}



/**
 * New channel
 */
const newChannel = (ev) => {
  ev.preventDefault()
  ev.stopPropagation()
  showNewChannelModal()
}

/**
 * Edit channel
 */
const editChannel = (ev) => {
  ev.preventDefault()
  ev.stopPropagation()
  showEditChannelModal()
}

/**
 * Delete message
 */
const deleteMessage = (ev) => {
  ev.preventDefault()
  ev.stopPropagation()
  deleteMessage()
}




/**
 * Reset channel
 */
const resetChannel = async (ev) => {
  ev?.preventDefault()
  ev?.stopPropagation()
  
  props.isSelecting = false
  props.isEditing = false
  props.isWorking = false    
  
  // Delete if not general and not have messages, otherwise just clear
  if (channelsModel.currentChannel !== 'general' && !Object.keys(messagesModel.messages).length) {
    await deleteChannel()
  }
  emit('resetChannel')

  setTimeout(() => {
    emit('focusPrompt')
  }, 0)
}

/**
 * Show the dropdown and focus it
 */
const selectChannels = (ev) => {
  ev.preventDefault()
  ev.stopPropagation()
  $channels.value.focus()
}



/**
 * On mounted
 */
onMounted(()=> {
  // Set active channel
  setTimeout(async () => {
    await channelsModel.setCurrentChannel(await channelsModel.getCurrentChannel())
    activeChannel.value = channelsModel.currentChannel?.currentChannel
  }, 0)

  // Channel Management
  hotkeys('ctrl+shift+r', props.hotkeysScope, (ev) => resetChannel(ev))
  hotkeys('ctrl+n', props.hotkeysScope, (ev) => newChannel(ev))
  hotkeys('ctrl+e', props.hotkeysScope, (ev) => editChannel(ev))
  hotkeys('ctrl+l', props.hotkeysScope, (ev) => selectChannels(ev))
})



/**
 * Define exports
 */
defineExpose({
  closeChannelModal,
  onChannelCreated,
  onChannelUpdated,
  changeCurrentChannel
})
</script>