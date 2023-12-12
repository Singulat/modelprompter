<template lang="pug">
.mb1
  textarea(
    ref='$promptEl'
    :class='{"bubble-arrow-hotkeys": !isEditing && !curPrompt?.trim()?.length}'
    :disabled='isSelecting'
    v-model='curPrompt'
    autofocus
    multiline
    :rows="isEditing ? 7 : 3"
    placeholder='Prompt...'
    @keydown.ctrl.exact.enter='runPrompt'
  )

//- More button
.mb1(v-if='isShowingMore')
  button.fullwidth(@click='clearMessages') Clear messages

//- Prompt buttons
.flex(v-if='!isEditing && !isSelecting')
  .flex-auto.mr1
    div(style='display: flex; position: relative')
      button(@click='showMore' :class='{active: isShowingMore}') More
  div
    button.fullwidth(v-if='!isWorking' :disabled='!curPrompt' @click='runPrompt') Run prompt
    button.fullwidth(v-else='' @click='cancelPrompt') Cancel prompt
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'

// Refs
const $promptEl = ref(null)
const curPrompt = ref('')

// Props and stores
const props = defineProps({
  hotkeysScope: {type: String, default: 'PromptBox'},
  isEditing: {type: Boolean, default: false},
  isSelecting: {type: Boolean, default: false},
  isWorking: {type: Boolean, default: false},
})




/**
 * Emits
 */
const emit = defineEmits(['clearMessages', 'cancelPrompt'])


/**
 * Define expose
 */
defineExpose({
  curPrompt,
  focus: () => $promptEl.value.focus(),
  clear: () => curPrompt.value = '',
  runPrompt: () => runPrompt(),
})
</script>