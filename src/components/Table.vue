<template>
<table class="interactive fullwidth fullheight">
  <thead>
    <slot name="theader">
      <tr>
        <th v-for="heading in props.headings" :class="heading.class">{{ heading.content }}</th>
      </tr>
    </slot>
  </thead>
  <tbody>
    <slot name="tbody"></slot>
  </tbody>
</table>
</template>

<script setup>
const props = defineProps({
  headings: {
    type: Array,
    required: true
  },
  data: {
    type: Object,
    required: true
  }
})
</script>