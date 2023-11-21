<template>
  <Window title="ModelPrompter" :canMax="!isIframe" @maximize="onMaximize" canClose @close="onClose" :style="{height}" bodyClass="flex column overflow-hidden m-0 p-1 fullwidth fullheight">
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
import {ref} from 'vue'

const isIframe = ref(false)

// Close window
const onClose = () => {
  if (globalThis.mp.params.get('context') === 'iframe') {
    // Message parent window to close iframe
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'closeInstance' })
    })
  } else {
    window.close()
  }
}
const onMaximize = () => {
  window.close()
}
</script>