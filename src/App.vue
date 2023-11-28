<template>
  <Window title="ModelPrompter" :canMax="!isIframe" :bubbleEsc="true" canClose @close="onClose" :style="{height}" bodyClass="flex column overflow-hidden m0 p1 fullwidth fullheight">
    <Tabs ref="tabs" v-model="activeTab" :tabs="mainTabs" @updateTab="$ev => updateTab($ev)">
      <template v-slot:connections>
        <Connections />
      </template>
      <template v-slot:skills>
        <Skills />
      </template>
      <template v-slot:prompt>
        <Prompt />
      </template>
    </Tabs>
  </Window>
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
import Prompt from './layouts/Prompt.vue'
import Skills from './layouts/Skills.vue'
import Connections from './layouts/Connections.vue'
import { useConnectionsModel } from './model/connections'
import { useMessagesModel } from './model/messages'
import { useChannelsModel } from './model/channels'
import { useSkillsModel } from './model/skills'
import {ref, onMounted, onBeforeMount, watch} from 'vue'
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

const activeTab = ref('prompt')
const height = ref('')
const isIframe = ref(false)
const mainTabs = ref({connections: 'Connections', prompt: 'Prompt', skills: 'Skills'})

const messagesModel = useMessagesModel()
const connectionsModel = useConnectionsModel()
const channelsModel = useChannelsModel()
const skillsModel = useSkillsModel()

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

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  
  isIframe.value = params.get('context') === 'iframe'
  height.value = isIframe.value ? '100%' : '450px'
  
  Mousetrap.bindGlobal('ctrl+shift+left', () => {
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex - 1
    if (nextIndex < 0) {
      return
    }
    activeTab.value = tabs[nextIndex]
  })
  Mousetrap.bindGlobal('ctrl+shift+right', () => {
    const tabs = Object.keys(mainTabs.value)
    const currentIndex = tabs.indexOf(activeTab.value)
    const nextIndex = currentIndex + 1
    if (nextIndex >= tabs.length) {
      return
    }
    activeTab.value = tabs[nextIndex]
  })
  // Maximize
  Mousetrap.bindGlobal('ctrl+shift+m', () => {
    chrome.runtime.sendMessage({type: 'maximizePopup'})
  })
})

// Close window
const onClose = () => {
  window.close()
}
</script>