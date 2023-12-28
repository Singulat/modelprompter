<template lang="pug">
// The actual textbox
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

// More button
.mb1(v-if='isShowingMore')
  button.fullwidth(@click='clearMessages') Clear messages

// Prompt buttons
.flex(v-if='!isEditing && !isSelecting')
  .flex-auto.mr1
    div(style='display: flex; position: relative')
      button(@click='isShowingMore = !isShowingMore' :class='{active: isShowingMore}') More
  div
    button.fullwidth(v-if='!isWorking' :disabled='!curPrompt' @click='runPrompt') Run prompt
    button.fullwidth(v-else='' @click='cancelPrompt') Cancel prompt
</template>

<script setup>
import {ref, watch, onMounted} from 'vue'
import { useMessagesModel } from '../model/messages'
import { usePromptCtrl } from '../controller/prompt'

// Refs
const $promptEl = ref(null)
const curPrompt = ref('')
const isShowingMore = ref(false)

// Props and stores
const messagesModel = useMessagesModel()
const promptingCtrl = usePromptCtrl()
const props = defineProps({
  hotkeysScope: {type: String, default: 'PromptBox'},
  isEditing: {type: Boolean, default: false},
  isSelecting: {type: Boolean, default: false},
  isWorking: {type: Boolean, default: false},
  activeChannel: {type: String, default: 'general'},
})

// Store the prompt the user is writing in the channel
// in case they navigate away
watch(curPrompt, async (val) => {
  await messagesModel.setCurPrompt(val)
})




/**
 * Run prompt
 */
const runPrompt = async () => {
  if (props.isEditing) {
    emit('updateMessage')
    return
  }
  emit('startWorking')
  
  let response = ''
  console.log('\n\n\n---\n📜 New Prompt:', curPrompt.value)
  
  // Add the users message
  const prompt = curPrompt.value
  await messagesModel.addMessage({
    role: 'user',
    text: prompt,
    channel: props.activeChannel
  })
  curPrompt.value = ''
  
  await promptingCtrl.extractSkills(prompt)
  emit('scrollBottom')
  emit('stopWorking')
}


/**
 * Cancel prompting
 */
const cancelPrompt = () => {
  emit('stopWorking')
}



/**
 * Emits
 */
const emit = defineEmits(['clearMessages', 'startWorking', 'stopWorking', 'scrollBottom', 'updateMessage'])
const clearMessages = () => {
  emit('clearMessages')
  curPrompt.value = ''
  isShowingMore.value = false
  $promptEl.value?.focus()
}


/**
 * Define expose
 */
defineExpose({
  curPrompt,
  setPrompt: (val) => curPrompt.value = val,
  focus: () => $promptEl.value.focus(),
  clear: () => curPrompt.value = '',
  runPrompt: () => runPrompt(),
})


/**
 * On mounted
 */
onMounted(async () => {
  curPrompt.value = await messagesModel.getCurPrompt()
})

</script>