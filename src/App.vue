<template lang="pug">
// The main window ✨
// CTRL+SHIFT+M to maximize into a new tab
Window(
  canClose
  :title='title'
  :canMax="true"
  :bubbleEsc="true"
  @close="onClose"
  :style="{height}"
  hotkeysScope=""
  bodyClass="flex column overflow-hidden m0 p1 fullwidth fullheight"
)
  // The main tabs
  // Use arrow keys to navigate between them
  // Use CTRL+ALT+SHIFT+Arrow to break out of inputs and navigate
  Tabs(
  ref="tabs"
  v-model="activeTab"
  :tabs="mainTabs"
  @updateTab="$ev => updateTab($ev)"
  )
    template(v-slot:settings)
      Settings
    template(v-slot:connections)
      Connections
    template(v-slot:skills)
      Skills
    template(v-slot:prompt)
      Prompt

WindowSkillSystemPrompt(v-if='isShowingSystemPromptModel' @close='closeSystemPromptModal')
</template>

<style>
/* @see https://jdan.github.io/98.css */
@import '98.css';
@import './assets/styles/core.css';
@import './assets/styles/helpers.css';
@import './assets/styles/overrides.css';
@import './assets/styles/app.css';
</style>

<script setup>
import Window from './components/Window.vue'
import Tabs from './components/Tabs.vue'
import Prompt from './layouts/Prompt.vue'
import Settings from './layouts/Settings.vue'
import Skills from './layouts/Skills.vue'
import Connections from './layouts/Connections.vue'
import WindowSkillSystemPrompt from './components/WindowSkillSystemPrompt.vue'
import { useConnectionsModel } from './model/connections'
import { useMessagesModel } from './model/messages'
import { useChannelsModel } from './model/channels'
import { useSkillsModel } from './model/skills'
import { useSettingsModel } from './model/settings'
import {useTabsModel} from './model/tabs.js'
import {ref, onMounted, computed, onBeforeMount, watch, provide} from 'vue'
import hotkeys from 'hotkeys-js'
import pkg from '../package.json'

/**
 * Event bus
 */
const bus = ref({})
provide('bus', bus)
// Assign
bus.value.$on = (ev, callback) => {
  bus.value[ev] = callback
}
// Emitter
bus.value.$emit = (ev, ...args) => {
  bus.value[ev] && bus.value[ev](...args)
}

// Refs
const tabsModel = useTabsModel()
const activeTab = ref('prompt')
const height = ref('')
const isIframe = ref(false)
const mainTabs = ref({settings: 'Settings', connections: 'Connections', prompt: 'Prompt', skills: 'Skills'})
const isShowingSystemPromptModel = ref(false)

// Title
const title = computed(() => {
  // @fixme This should always be a string
  let title = settingsModel.namespaceName?.namespaceName || settingsModel.namespaceName || 'ModelPrompter'
  return title + ' - Skills[' + (skillsModel.allSkillsDisabled ? 'off' : 'on') + ']'
})

// Watch for changes to activeTab and persist
watch(activeTab, async (value) => await chrome.storage.local.set({activeTab: value}))
const updateTab = (tab) => {activeTab.value = tab}

/**
 * Load data
 */
// @todo This should be automated so that any files in the ./model folder are autoloaded
const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const skillsModel = useSkillsModel()
const settingsModel = useSettingsModel()
onBeforeMount(async () => {
  // Initialize models
  await connectionsModel.init()
  await messagesModel.init(true)
  await channelsModel.init()
  await skillsModel.init()
  await settingsModel.init()

  // Load the latest tab
  // @todo this should be in settingsModel
  let lastTab = await chrome.storage.local.get('activeTab')
  lastTab = lastTab.activeTab
  if (lastTab) {
    activeTab.value = lastTab
  }

  // Redirect to Connections view if there are no connections
  if (!connectionsModel.defaultConnection) {
    activeTab.value = 'connections'
  }
})



/**
 * Kickstart the app
 */
onMounted(async () => {
  // Force the dimensions based on the context
  // This helps define the browser popup page size
  const params = new URLSearchParams(window.location.search)
  isIframe.value = params.get('context') === 'iframe'
  height.value = isIframe.value ? '100%' : '450px'
  
  // CTRL+M to create a new window
  hotkeys.filter =()=> true
  hotkeys('ctrl+shift+m', () => chrome.runtime.sendMessage({type: 'maximizePopup'}))


  /**
   * Handle previous tab navigation
   */
  const prevTab =(ev)=> {
    if (isThereAModalVisible() && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) {
      return
    }

    // Overrides input arrow key behavior with shortcut
    // when .bubble-arrow-hotkeys 
    if (!(ev.shiftKey && ev.ctrlKey && ev.altKey)
      && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)
      && !ev.target.classList.contains('bubble-arrow-hotkeys')
    ) {
      return
    }
    
    // Select previous tab with wraparound
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex - 1
    if (nextIndex < 0) nextIndex = tabs.length - 1
    activeTab.value = tabs[nextIndex]
  }
  hotkeys('ctrl+alt+shift+left', prevTab)
  hotkeys('ctrl+shift+left', prevTab)
  hotkeys('ctrl+left', prevTab)
  hotkeys('left', prevTab)

  
  
  /**
   * Handle previous tab navigation
   */
  const nextTab =(ev)=> {
    if (isThereAModalVisible() && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) {
      return
    }

    // Overrides input arrow key behavior with shortcut
    // when .bubble-arrow-hotkeys 
    if (!(ev.shiftKey && ev.ctrlKey && ev.altKey)
      && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)
      && !ev.target.classList.contains('bubble-arrow-hotkeys')
    ) {
      return
    }
    
    // Select previous tab with wraparound
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex + 1
    if (nextIndex >= tabs.length) nextIndex = 0
    activeTab.value = tabs[nextIndex]
  }
  hotkeys('ctrl+alt+shift+right', nextTab)
  hotkeys('ctrl+shift+right', nextTab)
  hotkeys('ctrl+right', nextTab)
  hotkeys('right', nextTab)

  // Other shortcuts
  hotkeys('ctrl+s', exportEverything)
  hotkeys('ctrl+o', importEverything)
  hotkeys('ctrl+shift+e', toggleAllSkills)
  hotkeys('ctrl+shift+s', (ev) => bus.value.$emit('showSystemPromptEditor', ev))

  // Inject contentscript
  chrome.runtime.sendMessage({type: 'injectContentscript'})
})


/**
 * Export
 */
const exportEverything = async(ev)=> {
  if (ev) {
    ev.preventDefault()
    ev.stopPropagation()
  }
  
  let data = {
    version: pkg.version,
    namespace: {
      namespaceName: settingsModel.namespaceName?.namespaceName || settingsModel.namespaceName || ''
    },
    connections: {
      defaultConnection: connectionsModel.defaultConnection,
      connections: connectionsModel.connections
    },
    messages: {
      messages: messagesModel.messages
    },
    channels: {
      channels: channelsModel.channels,
      currentChannel: channelsModel.currentChannel
    },
    skills: {
      skills: skillsModel.skills,
      activeSkills: skillsModel.activeSkills,
      allSkillsDisabled: skillsModel.allSkillsDisabled,
      defaultSkill: skillsModel.defaultSkill,
      systemPrompt: skillsModel.systemPrompt,
      planningPrompt: skillsModel.planningPrompt,
    }
  }

  // Remove API keys from connections
  data = JSON.parse(JSON.stringify(data))
  if (data.connections.connections) {
    for (const key in data.connections.connections) {
      data.connections.connections[key].apiKey = ''
    }
  }

  // title is "yy-mm-dd mp"
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let title = `${year}-${month}-${day}`

  // @fixme this is so much
  // inscrutable spaghetti code
  // it could feed me for a week
  let namespaceName = settingsModel.namespaceName?.namespaceName || settingsModel.namespaceName || ''
  if (typeof namespaceName === 'object') {
    namespaceName = ''
  }
  title = namespaceName ? `${namespaceName} -- ${title}` : `ModelPrompter -- ${title}`
  
  // Download the json file
  // Convert the data to a JSON string
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.json`
  link.click()
  URL.revokeObjectURL(url)  
}
bus.value.$on('exportEverything', exportEverything)


/**
 * Import everything
 */
const importEverything = async(ev)=> {
  if (ev) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'application/json'
  file.onchange = async()=> {
    const reader = new FileReader()
    reader.onload = async()=> {
      const json = reader.result
      const data = JSON.parse(json)

      if (data.namespace?.namespaceName) {
        settingsModel.namespaceName = data.namespace.namespaceName
      } else {
        settingsModel.namespaceName = ''
      }

      // Remove any API keys
      const connections = data.connections.connections
      for (const key in connections) {
        delete connections[key].apiKey
      }
      connectionsModel.connections = connections
      connectionsModel.defaultConnection = data.defaultConnection
      
      // Load everything
      channelsModel.channels = data.channels?.channels
      channelsModel.currentChannel = data.channels?.currentChannel
      messagesModel.messages = data.messages.messages
      
      skillsModel.skills = data.skills.skills
      skillsModel.activeSkills = data.skills.activeSkills
      skillsModel.systemPrompt = data.skills.systemPrompt
      skillsModel.planningPrompt = data.skills.planningPrompt
      skillsModel.defaultSkill = data.skills.defaultSkill
      skillsModel.allSkillsDisabled = data.skills.allSkillsDisabled

      // Save everything
      await connectionsModel.save()
      await channelsModel.save()
      await messagesModel.save()
      await skillsModel.save()
      await settingsModel.save()


      // Delete elements
      file.remove()
    }
    reader.readAsText(file.files[0])
  }
  file.click()
}
bus.value.$on('importEverything', importEverything)

/**
 * Toggle all skills
 */
const toggleAllSkills =(ev)=> {
  if (ev) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  if (skillsModel.allSkillsDisabled) {
    skillsModel.enableAllSkills()
  } else {
    skillsModel.disableAllSkills()
  }
}

/**
 * Update system prompt
 */
const closeSystemPromptModal =()=> {
  isShowingSystemPromptModel.value = false
  tabsModel.adjustZIndex()
}
bus.value.$on('showSystemPromptEditor', (ev)=> {
  ev.preventDefault()
  ev.stopPropagation()
  isShowingSystemPromptModel.value = true
})


/**
 * Checks if another modal is visible
 * @todo This may not be needed with hotkey-js namespaces
 */
const isThereAModalVisible =()=> document.querySelector('.window.modal') !== null



/**
 * Closes the window, popup, or context
 */
const onClose = () => globalThis.close()
</script>