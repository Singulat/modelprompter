<template>
<div :class="{'window': true, 'modal': isModal}" :style="{...props.style, height: windowHeight}" role="tabpanel">
  <div class="title-bar">
    <div class="title-bar-text">{{title}}</div>
    <div class="title-bar-controls">
      <button v-if="canRestore" aria-label="Restore" @click="onRestore"></button>
      <button v-if="canMin" aria-label="Minimize" @click="onMinimize"></button>
      <button v-if="canMax" aria-label="Maximize" @click="onMaximize"></button>
      <button v-if="canClose" aria-label="Close" @click="onClose"></button>
    </div>
  </div>
  <div :class="'window-body ' + bodyClass" :style="bodyStyle">
    <slot></slot>
  </div>
</div>  
</template>

<script setup>
import {ref, onMounted} from 'vue'

const props = defineProps({
  title: String,
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
  }
})

const windowHeight = ref(props.style?.height || '450px')

const emit = defineEmits(['minimize', 'maximize', 'close'])
const onMinimize = () => {emit('minimize')}
const onClose = () => {emit('close')}
const onRestore = () => {emit('restore')}

const onMaximize = () => {
  if (globalThis.mp.params?.get('context') === 'iframe') {
    windowHeight.value = '100vh'
  } else {
    chrome.runtime.sendMessage({type: 'maximizePopup'})
  }
  emit('maximize')
}

onMounted(() => {
  setTimeout(() => {
    globalThis.mp?.params?.get('context') === 'iframe' && onMaximize()
  }, 0)
})
</script>