<template lang="pug">
.window.menu(ref='$menu' v-if='modelValue' @click='stopBubble')
  .window-body
    menu
      slot
</template>

<script setup>
import { ref, watch } from 'vue'

const $menu = ref(null)

const props = defineProps({
  modelValue: null,
  dir: {
    type: String,
    // n/e/s/w
    default: 's'
  }
})

// On modelValue change
watch(() => props.modelValue, (value) => {
  // Align the bottom of this element with the top of the parent element
  if (value && $menu.value) {
    const parent = $menu.value.parentElement
    
    switch (dir) {
      case 'n':
        $menu.value.style.bottom = `${parent.offsetTop - parent.clientHeight}px`
        $menu.value.style.left = `${parent.offsetLeft}px`
        break
    }
  }
})

/**
 * Prevent bubbling
 */
const stopBubble = (e) => {
  e.stopPropagation()
}
</script>