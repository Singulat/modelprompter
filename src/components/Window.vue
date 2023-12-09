<template lang="pug">
div(:class="{'window': true, 'modal': isModal}" :style='{...props.style, height: windowHeight}' role='tabpanel')
  .title-bar
    .title-bar-text {{title}}
    .title-bar-controls
      button(v-if='canRestore' aria-label='Restore' @click='onRestore')
      button(v-if='canMin' aria-label='Minimize' @click='onMinimize')
      button(v-if='canMax' aria-label='Maximize' @click='onMaximize')
      button(v-if='canClose' aria-label='Close' @click='onClose')
  div(:class="'window-body ' + bodyClass" :style='bodyStyle')
    slot
</template>

<script setup>
import {ref, onMounted} from 'vue'
import hotkeys from 'hotkeys-js'

const props = defineProps({
  title: String,
  bubbleEsc: {
    type: Boolean,
    default: false
  },
  canMin: Boolean,
  canMax: Boolean,
  canClose: Boolean,
  canRestore: Boolean,
  style: Object,
  bodyStyle: Object,
  bodyClass: {
    type: String,
    default: ''
  },
  isModal: {
    type: Boolean,
    default: false
  },

  // shortcut namespaces
  hotkeysScope: {
    type: String,
    default: 'Window'
  },
  restoreHotkeysScope: String
})

const windowHeight = ref(props.style?.height || '450px')

const emit = defineEmits(['minimize', 'maximize', 'close'])
const onMinimize = () => {emit('minimize')}
const onClose = () => {
  if (props.restoreHotkeysScope) {
    hotkeys.setScope(props.restoreHotkeysScope)
  }
  emit('close')
}
const onRestore = () => {emit('restore')}

const onMaximize = () => {
  chrome.runtime.sendMessage({type: 'maximizePopup'})
  emit('maximize')
}

onMounted(() => {
  setTimeout(() => {
    if (globalThis.mp?.params?.get('context') === 'iframe') {
      windowHeight.value = '100vh'
      emit('maximize')
    } 

    props.hotkeysScope && hotkeys.setScope(props.hotkeysScope)
  }, 0)

  if (!props.bubbleEsc) {
    hotkeys('esc', props.hotkeysScope, (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      onClose()
    })
  }
  props.hotkeysScope && hotkeys.setScope(props.hotkeysScope)
})
</script>