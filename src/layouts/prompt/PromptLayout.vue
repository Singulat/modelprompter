<template>
<div class="flex-auto">
  <fieldset class="overflow fullheight">
    <legend>Channel</legend>
    <div class="flex">
      <select ref="$channels" class="mr1" name="channel" v-model="activeChannel" @change="changeCurrentChannel(false)" @keydown.enter="changeCurrentChannel(true)">
        <option value="general">Scratchpad</option>
        <option v-for="channel in channelsModel.channels" :key="channel.id" :value="channel.id">{{channel.name}}</option>
      </select>
      <button :class="{'flex-auto': true, active: isShowingMoreChannel}" @click="toggleShowMoreChannel">More</button>
    </div>
    <div v-if="isShowingMoreChannel" class="flex pt1">
      <button :disabled="activeChannel == 'general'" class="flex-auto mr1" @click="deleteChannel">Delete</button>
      <button :disabled="activeChannel == 'general'" class="flex-auto mr1" @click="showEditChannelModal">Edit</button>
      <button class="flex-auto" @click="showNewChannelModal">New</button>
    </div>
  </fieldset>
</div>

<WindowChannel v-if="isShowingChannelModal" @created="onChannelCreated" @updated="onChannelUpdated" @close="closeChannelModal" :isEditing="channelBeingEdited"></WindowChannel>

<div class="overflow fullheight">
  <fieldset ref="$messages" class="messages-wrap overflow fullheight">
    <legend>Messages</legend>
    <div class="messages">
      <div
      v-for="message in sortedMessages"
      class="message"
      :data-role="message.role"
      :key="message.id"
      :data-id="message.id"
      @dblclick="$ev => editMessage($ev)"
      >
        <div class="window">
          <div class="window-body">
            <div v-html="renderMarkdown(message.text)"></div>
          </div>
        </div>
      </div>
    </div>
  </fieldset>
</div>

<div style="flex: 0;">
  <div class="flex column fullheight pt1 pb1">
    <div class="spacer"></div>
    <div style="flex: 0">
      <div class="mb1">
        <textarea ref="$promptEl" id="prompt" v-model="curPrompt" autofocus multiline placeholder="Prompt..." @keydown.ctrl.exact.enter="runPrompt"></textarea>
      </div>

      <div v-if="isShowingMore" class="mb1">
        <button class="fullwidth" @click="clearMessages">Clear messages</button>
      </div>

      <!-- Prompting -->
      <div v-if="!isEditing" class="flex">
        <div class="flex-auto mr1">
          <div style="display: flex; position: relative">
            <button @click="showMore" :class="{active: isShowingMore}">More</button>
          </div>
        </div>
        <div>
          <button v-if="!isThinking" class="fullwidth" :disabled="!curPrompt" @click="runPrompt">Run prompt</button>
          <button v-else class="fullwidth" disabled>Thinking...</button>
        </div>
      </div>

      <!-- Editing -->
      <div v-else>
        <div class="flex">
          <div class="mr1">
            <button @click="showingChangeRole = !showingChangeRole" :class="{fullwidth: true, active: showingChangeRole}">
              Change role
              <Menu v-model="roleToChangeTo" dir="n">
                <li class="hoverable" @click="changeRole('system')">System</li>
                <li class="hoverable" @click="changeRole('user')">User</li>
                <li class="hoverable" @click="changeRole('assistant')">Assistant</li>
              </Menu>
            </button>
          </div>
          <div>
            <button @click="regenerateMessage" class="fullwidth">Regenerate</button>
          </div>
        </div>
        <div class="flex pt1">
          <div class="mr1">
            <button class="fullwidth" @click="cancelEditing">Cancel</button>
          </div>
          <div class="mr1">
            <button class="fullwidth" @click="deleteMessage">Delete</button>
          </div>
          <div>
            <button class="fullwidth" :disabled="!curPrompt" @click="updateMessage">Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>



<script setup>
/**
 * Dependencies
 */
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import MarkdownIt from 'markdown-it'
import Mousetrap from 'mousetrap'


/**
 * Vue
 */
import { useConnectionsModel } from '../../model/connections'
import {useMessagesModel} from '../../model/messages'
import {useChannelsModel} from '../../model/channels'
import {useTabsModel} from '../../model/tabs.js'
import Menu from '../../components/Menu.vue'
import WindowChannel from '../../components/WindowChannel.vue'


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
const md = new MarkdownIt()

const curPrompt = ref('')
const isThinking = ref(false)
const isShowingMore = ref(false)
const roleToChangeTo = ref('user')
const showingChangeRole = ref(false)

const $messages = ref(null)
const $promptEl = ref(null)


/**
 * Stores
 */
const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const tabsModel = useTabsModel()


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
const renderMarkdown = (text) => md.render(text)


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
  bindEscape()
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
const runPrompt = async()=> await prompt.runPrompt({isEditing, curPrompt, messagesModel, activeChannel, sendToLLM, updateMessage})
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
  
  Mousetrap.bindGlobal('ctrl+shift+n', (ev) => keyboard.newChannel({ev, showNewChannelModal}))
  Mousetrap.bindGlobal('ctrl+shift+e', (ev) => keyboard.editChannel({ev, showEditChannelModal}))
  Mousetrap.bindGlobal('ctrl+shift+d', (ev) => keyboard.deleteMessage({ev, deleteMessage}))
  Mousetrap.bindGlobal('ctrl+shift+r', (ev) => keyboard.resetChannel({ev, channelsModel, sortedMessages, deleteChannel, clearMessages, $promptEl}))
  Mousetrap.bindGlobal('ctrl+shift+l', (ev) => keyboard.selectChannels({ev, $channels}))
  Mousetrap.bindGlobal('ctrl+shift+up', (ev) => keyboard.prevMessage({ev, $messages, editMessage, isEditing, $promptEl}))
  Mousetrap.bindGlobal('ctrl+shift+down', (ev) => keyboard.nextMessage({ev, $messages, editMessage, isEditing, $promptEl}))
  bindEscape()
})

onBeforeUnmount(() => {
  Mousetrap.unbind('ctrl+shift+n')
  Mousetrap.unbind('ctrl+shift+e')
  Mousetrap.unbind('ctrl+shift+d')
  Mousetrap.unbind('ctrl+shift+r')
  Mousetrap.unbind('ctrl+shift+l')
  Mousetrap.unbind('ctrl+shift+up')
  Mousetrap.unbind('ctrl+shift+down')
})



/**
 * Bind escape key
 */
 const bindEscape =()=> {
  Mousetrap.bindGlobal('esc', (ev) => keyboard.cancelEditing({ev, isEditing, cancelEditing, $promptEl}))
}
</script>