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
</template>


<script setup>
import {ref, onMounted} from 'vue'
import hotkeys from 'hotkeys-js'
import {useChannelsModel} from '../model/channels'
import {useTabsModel} from '../model/tabs.js'

// Refs
const $channels = ref(null)
const activeChannel = ref('general')
const isShowingMoreChannel = ref(false)
const isShowingChannelModal = ref(false)
const channelBeingEdited = ref(null) 

// Props and stores
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()
const props = defineProps({
  hotkeysScope: {type: String, default: 'Channels'}
})

// Emiters
const emit = defineEmits(['scrollBottom'])



/**
 * Change channel
 */
const changeCurrentChannel = async (focusPrompt) => {
  await channelsModel.setCurrentChannel(activeChannel.value)
  emit('scrollBottom')
  focusPrompt && $promptEl.value.focus()
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
  channelBeingEdited.value = null
  isShowingChannelModal.value = true
}
const showEditChannelModal = () => {
  channelBeingEdited.value = activeChannel.value
  isShowingChannelModal.value = true
}


/**
 * Handle channel creation and changing
 */
const onChannelCreated = async (id) => {
  activeChannel.value = id
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  await maybeAddSystemPrompt()
  $promptEl.value.focus()
}

const onChannelUpdated = async (id) => {
  isShowingChannelModal.value = false
  isShowingMoreChannel.value = false
  tabsModel.adjustZIndex()
  await maybeAddOrUpdateSystemPrompt()
  $promptEl.value.focus()
}




/**
 * Delete channel
 */
const deleteChannel = async () => {
  await messagesModel.deleteAll(activeChannel.value)
  await channelsModel.deleteChannel(activeChannel.value)
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
  
  isSelecting.value = false
  isEditing.value = false
  isWorking.value = false    
  
  // Delete if not general and not have messages, otherwise just clear
  if (channelsModel.currentChannel !== 'general' && !sortedMessages.value.length) {
    await deleteChannel()
  } else {
    await clearMessages()
  }

  setTimeout(() => {
    $promptEl.value.focus()
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
    activeChannel.value = await channelsModel.getCurrentChannel()
  }, 0)

  // Channel Management
  hotkeys('ctrl+shift+r', props.hotkeysScope, (ev) => resetChannel(ev))
  hotkeys('ctrl+n', props.hotkeysScope, (ev) => newChannel(ev))
  hotkeys('ctrl+shift+e', props.hotkeysScope, (ev) => editChannel(ev))
  hotkeys('ctrl+shift+l', props.hotkeysScope, (ev) => selectChannels(ev))
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