<template lang="pug">
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

.hidden
  div(ref='$scriptsContainer')

WindowChannel(
v-if='isShowingChannelModal'
@created='onChannelCreated'
@updated='onChannelUpdated'
@close='closeChannelModal'
restoreHotkeysScope='PromptLayout'
:isediting='channelBeingEdited')

.overflow.fullheight
  fieldset.messages-wrap.overflow.fullheight(ref='$messages')
    legend Messages
    .messages
      .message(v-for='message in sortedMessages' :data-role='message.role' :key='message.id' :data-id='message.id' @dblclick='$ev => editMessage($ev)')
        .window
          .window-body
            div(v-html='renderMarkdown(message.text)')

div(style='flex: 0;')
  .flex.column.fullheight.pt1.pb1
    .spacer
    div(style='flex: 0')
      .mb1
        textarea#prompt(ref='$promptEl' v-model='curPrompt' autofocus='' multiline='' placeholder='Prompt...' @keydown.ctrl.exact.enter='runPrompt')
      .mb1(v-if='isShowingMore')
        button.fullwidth(@click='clearMessages') Clear messages
      // Prompting
      .flex(v-if='!isEditing')
        .flex-auto.mr1
          div(style='display: flex; position: relative')
            button(@click='showMore' :class='{active: isShowingMore}') More
        div
          button.fullwidth(v-if='!isThinking' :disabled='!curPrompt' @click='runPrompt') Run prompt
          button.fullwidth(v-else='' disabled='') Thinking...
      // Editing
      div(v-else='')
        .flex
          .mr1
            button(@click='showingChangeRole = !showingChangeRole' :class='{fullwidth: true, active: showingChangeRole}')
              | Change role
              Menu(v-model='roleToChangeTo' dir='n')
                li.hoverable(@click="changeRole('system')") System
                li.hoverable(@click="changeRole('user')") User
                li.hoverable(@click="changeRole('assistant')") Assistant
          div
            button.fullwidth(@click='regenerateMessage') Regenerate
        .flex.pt1
          .mr1
            button.fullwidth(@click='cancelEditing') Cancel
          .mr1
            button.fullwidth(@click='deleteMessage') Delete
          div
            button.fullwidth(:disabled='!curPrompt' @click='updateMessage') Update
</template>



<script setup>
/**
 * Dependencies
 */
import {ref, onMounted, onBeforeUnmount, computed, nextTick} from 'vue'
import MarkdownIt from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import DOMPurify from 'dompurify'


/**
 * Vue
 */
import { useConnectionsModel } from '../../model/connections'
import {useMessagesModel} from '../../model/messages'
import {useChannelsModel} from '../../model/channels'
import { useSkillsModel } from '../../model/skills'
import {useTabsModel} from '../../model/tabs.js'
import Menu from '../../components/Menu.vue'
import WindowChannel from '../../components/WindowChannel.vue'
import hotkeys from 'hotkeys-js'

/**
 * Helpers
 */
import helpers from './helpers'
import channel from './channel'
import prompt from './prompt'
import keyboard from './keyboard'


/**
 * Refs
 */
const md = new MarkdownIt({
  html: true,
})
md.use(MarkdownItAttrs)

const curPrompt = ref('')
const isThinking = ref(false)
const isShowingMore = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)

const $messages = ref(null)
const $promptEl = ref(null)
const $scriptsContainer = ref(null)


/**
 * Stores
 */
const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()
const skillsModel = useSkillsModel()


/**
 * Set active channel
 */
onMounted(() => {
  setTimeout(async () => {
    scrollBottom()
    activeChannel.value = await channelsModel.getCurrentChannel()
  }, 0)
})


/**
 * Helpers
 */
const scrollBottom =()=> helpers.scrollBottom({$messages})
const sortedMessages = computed(() => helpers.sortedMessages({messagesModel, activeChannel}))
const showMore =()=> {isShowingMore.value = !isShowingMore.value}
const renderMarkdown = (text) => {
  text = DOMPurify.sanitize(md.render(text), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })
  return md.render(text)
}



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
const runPrompt = async()=> await prompt.runPrompt({$messages, $scriptsContainer, isEditing, curPrompt, skillsModel, messagesModel, activeChannel, sendToLLM, updateMessage})
const sendToLLM = async(messages, assistantDefaults = {}) => await prompt.sendToLLM({messages, assistantDefaults, isThinking, connectionsModel, activeChannel, messagesModel, $promptEl, scrollBottom})


/**
 * Message management
 */
const isEditing = ref(false)
const clearMessages =()=> channel.clearMessages({isShowingMore, messagesModel, activeChannel, maybeAddSystemPrompt, $promptEl})
const editMessage = (ev, stopBubble = false)=> channel.editMessage({ev, stopBubble, isEditing, isShowingMore, messagesModel, curPrompt, $messages, $promptEl})
const cancelEditing =()=> channel.cancelEditing({isEditing, curPrompt, $messages, $promptEl})
const updateMessage = async()=> channel.updateMessage({isEditing, messagesModel, curPrompt, activeChannel, channelsModel, sortedMessages, $messages, $promptEl})
const deleteMessage = async()=> channel.deleteMessage({isEditing, messagesModel, curPrompt, $messages, $promptEl})
const changeRole = async(role)=> channel.changeRole({role, isEditing, messagesModel, $messages, $promptEl})
const regenerateMessage = async()=> channel.regenerateMessage({isEditing, messagesModel, sortedMessages, $messages, $promptEl, curPrompt, sendToLLM})



/**
 * Keyboard shortcuts
 */
onMounted(() => {
  setTimeout(() => {
    scrollBottom()
    $promptEl.value?.focus()
  }, 100)

  hotkeys('ctrl+shift+n', 'PromptLayout', (ev) => keyboard.newChannel({ev, showNewChannelModal}))
  hotkeys('ctrl+shift+e', 'PromptLayout', (ev) => keyboard.editChannel({ev, showEditChannelModal}))
  hotkeys('ctrl+shift+d', 'PromptLayout', (ev) => keyboard.deleteMessage({ev, deleteMessage}))
  hotkeys('ctrl+shift+r', 'PromptLayout', (ev) => keyboard.resetChannel({ev, channelsModel, sortedMessages, deleteChannel, clearMessages, $promptEl}))
  hotkeys('ctrl+shift+l', 'PromptLayout', (ev) => keyboard.selectChannels({ev, $channels}))
  hotkeys('ctrl+shift+up', 'PromptLayout', (ev) => keyboard.prevMessage({ev, $messages, editMessage, isEditing, $promptEl}))
  hotkeys('ctrl+shift+down', 'PromptLayout', (ev) => keyboard.nextMessage({ev, $messages, editMessage, isEditing, $promptEl}))
  hotkeys.setScope('PromptLayout')
})

onBeforeUnmount(() => {
  hotkeys.deleteScope('PromptLayout')
})
</script>