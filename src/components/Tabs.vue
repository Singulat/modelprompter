<template>
<menu role="tablist">
  <li v-for="(label, id) in tabs" :key="id" role="tab" :aria-selected="(id === modelValue) ? 'true' : 'false'">
    <a :href="'#' + id" @click="modelValue=id">{{label}}</a>
  </li>
</menu>
<div class="window" role="tabpanel">
  <template v-for="(label, id) in tabs" :key="id">
    <div v-if="id===modelValue" class="window-body flex column overflow-hidden">
      <slot :name="id"></slot>
    </div>
  </template>
</div>
</template>

<script setup>
import { ref, useSlots } from 'vue'

const props = defineProps({
  modelValue: String,
  tabs: Object
})
let slots = useSlots()

if (slots.default && slots.default()?.[0]) {
  slots = slots.default()
}
</script>