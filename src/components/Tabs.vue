<template lang="pug">
menu(role='tablist')
  li(v-for='(label, id) in tabs' :key='id' role='tab' :aria-selected="(id === modelValue) ? 'true' : 'false'")
    a(:href="'#' + id" @click="emit('updateTab', id)") {{label}}
.window(ref='tabPanel' role='tabpanel' :style='{zIndex: (hasModals ? 100 : 5)}')
  template(v-for='(label, id) in tabs' :key='id')
    .window-body.flex.column.overflow-hidden(v-if='id===modelValue')
      slot(:name='id')
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {useTabsModel} from '../model/tabs.js'

const tabsModel = useTabsModel()
const props = defineProps({
  modelValue: String,
  tabs: Object
})
const hasModals = ref(false)
const id = ref('')
const tabPanel = ref(null)

const emit = defineEmits(['updateTab'])

onMounted(() => {
  id.value = crypto.randomUUID()
  tabsModel.onAdjustZIndex(id.value, adjustZIndex)
})

onUnmounted(() => {
  tabsModel.removeOnAdjustZIndex(id.value)
})

const adjustZIndex = () => {
  hasModals.value = !!tabPanel.value.querySelectorAll('.modal:not(.hidden)').length
}
</script>