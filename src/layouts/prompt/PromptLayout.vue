<template lang="pug">
//- Channel section
.flex-auto
  fieldset.overflow.fullheight
    legend Channel
    .flex
      select.mr1(ref='$channels' name='channel' v-model='activeChannel' @change='changeCurrentChannel(false)' @keydown.enter='changeCurrentChannel(true)')
        option(value='general') Scratchpad
        option(v-for='channel in channelsModel.channels' :key='channel.id' :value='channel.id') {{channel.name}}
      button(:class="{'flex-auto': true, active: isShowingMoreChannel}" @click='toggleShowMoreChannel') More
    .flex.pt1(v-if='isShowingMoreChannel')
      button.flex-auto.mr1(:disabled="activeChannel == 'general'" @click='deleteChannel') Delete
      button.flex-auto.mr1(:disabled="activeChannel == 'general'" @click='showEditChannelModal') Edit
      button.flex-auto(@click='showNewChannelModal') New


//- Contains all the scripts to run
.hidden
  div(ref='$scriptsContainer')


//- Channel edit window
WindowChannel(
  v-if='isShowingChannelModal'
  @created='onChannelCreated'
  @updated='onChannelUpdated'
  @close='closeChannelModal'
  restoreHotkeysScope='PromptLayout'
  :isediting='channelBeingEdited'
)


//- Display messages and editing area
Messages(
  ref='$messages'
  :messages='messages'
)
  template(v-slot:prompting)
  template(v-slot:editing)
</template>



<script setup>
import {ref, onMounted, onBeforeUnmount, computed, nextTick} from 'vue'
import { useConnectionsModel } from '../../model/connections'
import {useChannelsModel} from '../../model/channels'
import { useSkillsModel } from '../../model/skills'
import {useTabsModel} from '../../model/tabs.js'
import Messages from '../../components/Messages.vue'
import WindowChannel from '../../components/WindowChannel.vue'
import hotkeys from 'hotkeys-js'

/**
 * Helpers
 */
import channel from './channel'
import prompt from './prompt'
import keyboard from './keyboard'


// Refs
const $messages = ref(null)



const isThinking = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)
const $scriptsContainer = ref(null)


/**
 * Stores
 */
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()
const skillsModel = useSkillsModel()



/**
 * Channel management
 */
const $channels = ref(null)
const activeChannel = ref('general')
const isShowingMoreChannel = ref(false)
const isShowingChannelModal = ref(false)
const channelBeingEdited = ref(null) 

const toggleShowMoreChannel =()=> channel.toggleShowMoreChannel({isShowingMoreChannel})
const showNewChannelModal =()=> channel.showNewChannelModal({channelBeingEdited, isShowingChannelModal})
const showEditChannelModal =()=> channel.showEditChannelModal({isShowingChannelModal, channelBeingEdited, activeChannel})
const closeChannelModal =()=> {
  channel.closeChannelModal({isShowingChannelModal, tabsModel})
  hotkeys.setScope('PromptLayout')
}

const onChannelCreated = async(id)=> channel.onChannelCreated({activeChannel, tabsModel, $promptEl, maybeAddSystemPrompt, isShowingMoreChannel, id})
const onChannelUpdated = async(id)=> channel.onChannelUpdated({id, isShowingChannelModal, isShowingMoreChannel, tabsModel, maybeAddOrUpdateSystemPrompt, $promptEl})
const changeCurrentChannel = async(focusPrompt = false)=> channel.changeCurrentChannel({activeChannel, channelsModel, scrollBottom, focusPrompt, $promptEl})
const deleteChannel =()=> channel.deleteChannel({messagesModel, channelsModel, activeChannel, isShowingMoreChannel, isShowingChannelModal, tabsModel, $promptEl, scrollBottom})


/**
 * Prompting
 */
const maybeAddSystemPrompt = async()=> await prompt.maybeAddSystemPrompt({channelsModel, activeChannel, messagesModel})
const maybeAddOrUpdateSystemPrompt = async()=> await prompt.maybeAddOrUpdateSystemPrompt({channelsModel, activeChannel, messagesModel, sortedMessages})
const runPrompt = async(regenerate = false)=> await prompt.runPrompt({regenerate, isWorking, $messages, $scriptsContainer, isEditing, curPrompt, skillsModel, messagesModel, activeChannel, sendToLLM, updateMessage})
const sendToLLM = async(messages, assistantDefaults = {}) => await prompt.sendToLLM({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, isWorking, $promptEl, scrollBottom})
const cancelThinking =()=> prompt.cancelThinking({isThinking, $promptEl})


const deleteMessage = async()=> channel.deleteMessage({isEditing, isSelecting, messagesModel, curPrompt, $messages, $promptEl, selectMessage})
const changeRole = async(role)=> channel.changeRole({role, isEditing, messagesModel, $messages, $promptEl})
const regenerateMessage = async()=> channel.regenerateMessage({isEditing, messagesModel, sortedMessages, $messages, $promptEl, curPrompt, sendToLLM})



/**
 * Keyboard shortcuts
 */
onMounted(() => {
  // Set active channel
  setTimeout(async () => {
    activeChannel.value = await channelsModel.getCurrentChannel()
  }, 0)

  // Focus things
  setTimeout(() => {
    $messages.value?.scrollBottom()
    $messages.value.$promptEl?.focus()
  }, 100)

  
  // Channel Management
  hotkeys('ctrl+shift+r', 'PromptLayout', (ev) => keyboard.resetChannel({ev, channelsModel, sortedMessages, deleteChannel, clearMessages, $promptEl, isWorking, isEditing, isSelecting}))
  hotkeys('ctrl+n', 'PromptLayout', (ev) => keyboard.newChannel({ev, showNewChannelModal}))
  hotkeys('ctrl+shift+e', 'PromptLayout', (ev) => keyboard.editChannel({ev, showEditChannelModal}))
  hotkeys('ctrl+shift+l', 'PromptLayout', (ev) => keyboard.selectChannels({ev, $channels}))
  
  // Message management
  hotkeys('enter', 'PromptLayout', (ev) => keyboard.editSelectedMessage({ev, isEditing, isSelecting, isKey: true, messagesModel, $promptEl, $messages, curPrompt}))
  hotkeys('delete', 'PromptLayout', async()=> channel.deleteMessage({isKey: true, selectMessage, isEditing, isSelecting, messagesModel, curPrompt, $messages, $promptEl}))

  // Navigation
  hotkeys('up', 'PromptLayout', (ev) => keyboard.prevMessage({ev, $messages, selectMessage, isSelecting}))
  hotkeys('down', 'PromptLayout', (ev) => keyboard.nextMessage({ev, $messages, selectMessage, isSelecting, $promptEl}))

  // Escaping
  hotkeys('esc', 'PromptLayout', (ev)=> keyboard.onEsc({ev, isWorking, curPrompt, isEditing, isSelecting, $promptEl}))
  hotkeys.setScope('PromptLayout')
})

onBeforeUnmount(() => {
  hotkeys.deleteScope('PromptLayout')
})
</script>