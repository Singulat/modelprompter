<template lang="pug">
//- Channel section
.flex-auto
  Channels(ref='$channels' hotkeysScope='PromptLayout' @scrollBottom='$messages.scrollBottom()')

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
Messages(ref='$messages' hotkeysScope='PromptLayout')
  template(v-slot:prompting)
  template(v-slot:editing)
</template>



<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'
import { useConnectionsModel } from '../model/connections'
import {useChannelsModel} from '../model/channels'
import {useMessagesModel} from '../model/messages'
import { useSkillsModel } from '../model/skills'
import Messages from '../components/Messages.vue'
import Channels from '../components/Channels.vue'
import WindowChannel from '../components/WindowChannel.vue'
import hotkeys from 'hotkeys-js'

/**
 * Helpers
 */
import prompt from './prompt/prompt'


// Refs
const $channels = ref(null)
const $messages = ref(null)
const $scriptsContainer = ref(null)
const isThinking = ref(false)


/**
 * Stores
 */
const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const skillsModel = useSkillsModel()



/**
 * Channel management
 */
const closeChannelModal =()=> {
  $channels.closeChannelModal()
  hotkeys.setScope('PromptLayout')
}
const onChannelCreated = async(id)=> $channels.onChannelCreated(id)
const onChannelUpdated = async(id)=> $channels.onChannelUpdated(id)
const changeCurrentChannel = async(focusPrompt)=> $channels.changeCurrentChannel(focusPrompt)
const deleteChannel =()=> $channels.deleteChannel()


/**
 * Prompting
 */
const maybeAddSystemPrompt = async()=> await prompt.maybeAddSystemPrompt({channelsModel, activeChannel, messagesModel})
const maybeAddOrUpdateSystemPrompt = async()=> await prompt.maybeAddOrUpdateSystemPrompt({channelsModel, activeChannel, messagesModel, sortedMessages})
const runPrompt = async(regenerate = false)=> await prompt.runPrompt({regenerate, isWorking, $messages, $scriptsContainer, isEditing, curPrompt, skillsModel, messagesModel, activeChannel, sendToLLM, updateMessage})
const sendToLLM = async(messages, assistantDefaults = {}) => await prompt.sendToLLM({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, isWorking, $promptEl, scrollBottom})
const cancelThinking =()=> prompt.cancelThinking({isThinking, $promptEl})



/**
 * Keyboard shortcuts
 */
onMounted(() => hotkeys.setScope('PromptLayout'))
onBeforeUnmount(() => hotkeys.deleteScope('PromptLayout'))
</script>