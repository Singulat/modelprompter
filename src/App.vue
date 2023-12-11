<template lang="pug">
Window(
canClose
title="ModelPrompter"
:canMax="true"
:bubbleEsc="true"
@close="onClose"
:style="{height}"
hotkeysScope=""
bodyClass="flex column overflow-hidden m0 p1 fullwidth fullheight"
)
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
      PromptLayout
</template>

<style>
@import '98.css';
@import './assets/styles/core.css';
@import './assets/styles/helpers.css';
@import './assets/styles/overrides.css';
@import './assets/styles/app.css';
</style>

<script setup>
import Window from './components/Window.vue'
import Tabs from './components/Tabs.vue'
import PromptLayout from './layouts/prompt/PromptLayout.vue'
import Settings from './layouts/Settings.vue'
import Skills from './layouts/Skills.vue'
import Connections from './layouts/Connections.vue'
import { useConnectionsModel } from './model/connections'
import { useMessagesModel } from './model/messages'
import { useChannelsModel } from './model/channels'
import { useSkillsModel } from './model/skills'
import { useSettingsModel } from './model/settings'
import {ref, onMounted, onBeforeMount, watch} from 'vue'
import hotkeys from 'hotkeys-js'

const activeTab = ref('prompt')
const height = ref('')
const isIframe = ref(false)
const mainTabs = ref({settings: 'Settings', connections: 'Connections', prompt: 'Prompt', skills: 'Skills'})

const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const skillsModel = useSkillsModel()
const settingsModel = useSettingsModel()

// Watch for changes to activeTab and persist
watch(activeTab, async (value) => {
  await chrome.storage.local.set({activeTab: value})
})

const updateTab = (tab) => {
  activeTab.value = tab
}

/**
 * Load data
 */
onBeforeMount(async () => {
  // Load models
  await connectionsModel.init()
  await messagesModel.init()
  await channelsModel.init()
  await skillsModel.init()
  await settingsModel.init()

  let lastTab = await chrome.storage.local.get('activeTab')
  lastTab = lastTab.activeTab
  if (lastTab) {
    activeTab.value = lastTab
  }

  // Redirect to connections if there are no connections
  if (!connectionsModel.defaultConnection) {
    activeTab.value = 'connections'
  }
})

// @todo clean this up
onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  
  isIframe.value = params.get('context') === 'iframe'
  height.value = isIframe.value ? '100%' : '450px'
  
  // CTRL+M to create a new window
  hotkeys.filter =()=> true
  hotkeys('ctrl+shift+m', () => {
    chrome.runtime.sendMessage({type: 'maximizePopup'})
  })

  // Select previous tab
  const prevTab =(ev)=> {
    if (isThereAModalVisible() && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) {
      return
    }

    if (!(ev.shiftKey && ev.ctrlKey && ev.altKey)
    && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)
    && !ev.target.classList.contains('bubble-arrow-hotkeys')) {
      return
    }
    
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex - 1
    if (nextIndex < 0) {
      return
    }
    activeTab.value = tabs[nextIndex]
  }
  hotkeys('ctrl+alt+shift+left', prevTab)
  hotkeys('ctrl+shift+left', prevTab)
  hotkeys('ctrl+left', prevTab)
  hotkeys('left', prevTab)

  // Select next tab
  const nextTab =(ev)=> {
    if (isThereAModalVisible() && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) {
      return
    }

    if (!(ev.shiftKey && ev.ctrlKey && ev.altKey)
    && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)
    && !ev.target.classList.contains('bubble-arrow-hotkeys')) {
      return
    }
    
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex + 1
    if (nextIndex >= tabs.length) {
      return
    }
    activeTab.value = tabs[nextIndex]
  }
  hotkeys('ctrl+alt+shift+right', nextTab)
  hotkeys('ctrl+shift+right', nextTab)
  hotkeys('ctrl+right', nextTab)
  hotkeys('right', nextTab)
})

// Check if a .window.modal is visible
const isThereAModalVisible = () => {
  return document.querySelector('.window.modal') !== null
}

// Close window
const onClose = () => {
  globalThis.close()
}
</script>