<template>
  <Window title="ModelPrompter" :canMax="!isIframe" canClose @close="onClose" :style="{height}" bodyClass="flex column overflow-hidden m-0 p-1 fullwidth fullheight">
    <Tabs v-model="activeTab" :tabs="{connections: 'Connections', prompt: 'Prompt'}">
      <template v-slot:connections>
      </template>
      <template v-slot:prompt>
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
import {ref, onMounted} from 'vue'

// Sync store with local storage
const activeTab = ref('prompt')
const height = ref('')
const isIframe = ref(false)
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  
  isIframe.value = params.get('context') === 'iframe'
  height.value = isIframe.value ? '100%' : '450px'

  chrome.storage.local('connections', (connections) => {
    console.log(connections)
  })
})

// Close window
const onClose = () => {
  window.close()
}
</script>