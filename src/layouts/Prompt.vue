<template lang="pug">
//- Channel section
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
  )

//- Contains all the scripts to run
.hidden
  div(ref='$scriptsContainer')

//- Display messages and editing area
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
import { useConnectionsModel } from '../model/connections'
import {useChannelsModel} from '../model/channels'
import {useMessagesModel} from '../model/messages'
import { useSkillsModel } from '../model/skills'
import Messages from '../components/Messages.vue'
import Channels from '../components/Channels.vue'
import hotkeys from 'hotkeys-js'
import OpenAI from 'openai'

// Refs
const $channels = ref(null)
const $messages = ref(null)
const $scriptsContainer = ref(null)
const isThinking = ref(false)
const activeChannel = ref('general')


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
  $channels.value.closeChannelModal()
  hotkeys.setScope('PromptLayout')
}
const onChannelCreated = async(id)=> $channels.value.onChannelCreated(id)
const onChannelUpdated = async(id)=> $channels.value.onChannelUpdated(id)
const changeCurrentChannel = async(focusPrompt)=> $channels.value.changeCurrentChannel(focusPrompt)
const deleteChannel =()=> $channels.value.deleteChannel()


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