<template lang="pug">
.sunken-panel.fullwidth.flex.column(v-bind='$attrs')
  div
    table.interactive.fullwidth(ref='$table')
      thead
        slot(name='theader')
          tr(style='flex: 0')
            th(v-for='heading in props.headings' :class='heading.class') {{ heading.content }}
      tbody
        tr(@click='clickedRow' @dblclick='showEditModal' @contextmenu='ev => clickedRow(ev) | showEditModal(ev)' v-for='(record, dataKey) in data' :key='dataKey' :class="{'highlighted': dataKey == props.highlightedRow}" :data-id='dataKey')
          td(v-for='heading in props.headings' :class='heading.class' :key='heading.key')
            | {{ record[heading.key] }}
        slot(name='tbody')

// Bottom of  form
.flex-auto.pt1
  .flex
    button.flex-auto.mr1(:class='{hidden: !props.highlightedRow}' @click='deleteRecord') Delete
    button.mr1(:class='{hidden: !props.highlightedRow}' @click='showEditModal') Edit
    button(@click='showAddModal') New

// Modal
Window.modal(
v-if='isModalOpen'
:title="isEditMode ? 'Update ' + props.title.toLowerCase() : 'Add new ' + props.title.toLowerCase()"
canClose
isModal
:hotkeysScope='props.hotkeysScope + "Modal"'
:restoreHotkeysScope='props.hotkeysScope'
@close='toggleModal(false)')
  .autoscroll
    .flex.column.fullheight
      div(ref='$form')
        // Loop for each root form field
        .field-row-stacked(v-for='key, n in Object.keys(defaults)')
          label(:for='`field-${key}`') {{ key }}:
          input(v-if="!headings[n]?.field?.type || headings[n]?.field?.type == 'text'" @keydown.ctrl.exact.enter.prevent='submitForm' :id='`field-${key}`' type='text' v-model='curForm[key]')
          textarea(v-else-if="headings[n]?.field?.type == 'textarea'" @keydown.ctrl.exact.enter.prevent='submitForm' :id='`field-${key}`' :rows='headings[n]?.field?.rows || 3' v-model='curForm[key]')
      div
        .flex.pt3
          button.flex-auto.mr2(@click='closeModal') Cancel
          button(ref='addButton' @click='submitForm')
            span(v-if='isEditMode') Update {{ props.title }}
            span(v-else='') Add {{ props.title }}
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch} from 'vue'
import {useTabsModel} from '../model/tabs.js'
import Window from '../components/Window.vue'
import hotkeys from 'hotkeys-js'

// Props
const props = defineProps({
  title: String,
  headings: Array,
  data: Object,
  form: Object,
  highlightedRow: String,
  defaults: Object,
  validateForm: Function,
  
  // shortcut namespaces
  hotkeysScope: {
    type: String,
    default: 'Table'
  },
  deleteHotkeysScope: {
    type: Boolean,
    default: true
  },
  restoreHotkeysScope: String
})

const $table = ref(null)
const $form = ref(null)
const addButton = ref(null)
const isModalOpen = ref(false)
const tabsModel = useTabsModel()
const isEditMode = ref(false)
const curForm = ref({})
const isValidForm = ref(false)

const emit = defineEmits(['submit', 'delete', 'updateHighlightedRow', 'close'])

watch(curForm, (val) => {
  isValidForm.value = props.validateForm(val)
  props.hotkeysScope && hotkeys.setScope(props.hotkeysScope)
}, {deep: true})

/**
 * Toggle modal on/off
 */
const toggleModal = (val) => {
  isModalOpen.value = val
  tabsModel.adjustZIndex()
  
  // Focus the first input when the modal opens
  if (val) {
    setTimeout(() => {
      if (isEditMode.value) {
        curForm.value = Object.assign({}, props.data[props.highlightedRow] || props.defaults)
      } else {
        curForm.value = Object.assign({}, props.defaults)
      }
      $form.value.querySelector('input').focus()
    }, 0)
  } else {
    if (props.restoreHotkeysScope) {
      hotkeys.setScope(props.restoreHotkeysScope)
    }
    if (props.deleteHotkeysScope) {
      hotkeys.deleteScope(props.deleteHotkeysScope)
    }
    emit('close')
  }
}

const closeModal = () => {
  toggleModal(false)
}



/**
 * Submit form
 */
const submitForm = () => {
  if (!isValidForm.value) {
    return
  }
  emit('submit', isEditMode.value, curForm.value)
  emit('close')
  toggleModal(false)
}




/**
 * Select a row in the table
 */
const clickedRow = (e) => {
  const $table = e.target.closest('table')
  const $row = e.target.closest('tr')

  $table.querySelectorAll('tr').forEach(($row) => {
    $row.classList.remove('highlighted')
  })

  $row.classList.toggle('highlighted')
  emit('updateHighlightedRow', $row.getAttribute('data-id'))
}



const showAddModal = () => {
  isEditMode.value = false
  curForm.value = Object.assign({}, props.defaults)
  toggleModal(true)
} 

/**
 * Edit
 */
const showEditModal = (ev) => {
  if (ev) {
    ev.preventDefault()
    ev.stopPropagation()
  }
  
  isEditMode.value = true
  curForm.value = Object.assign({}, props.highlightedRow)
  toggleModal(true)
}


/**
 * Expose methods
 */
defineExpose({
  showEditModal,

  isModalOpen,
  
  selectRow: (rowToSelect) => {
    // Select the defaults if one exists
    if (rowToSelect) {
      const $row = $table.value.querySelector(`[data-id="${rowToSelect}"]`)
      if ($row) {
        $table.value.querySelectorAll('tr').forEach(($row) => {
          $row.classList.remove('highlighted')
        })
        $row.classList.add('highlighted')
        emit('updateHighlightedRow', $row.getAttribute('data-id'))
      }
    }
  },

  showAddModal
})


/**
 * Delete
 */
const deleteRecord = () => {
  const $row = $table.value.querySelector('.highlighted')
  const $nextRow = $row.nextElementSibling
  const $prevRow = $row.previousElementSibling
  
  emit('delete')

  setTimeout(() => {
    if ($nextRow) {
      clickedRow({target: $nextRow})
    } else if ($prevRow) {
      clickedRow({target: $prevRow})
    } else {
      emit('updateHighlightedRow', null)
    }
  }, 0)
}


/**
 * Keyboard shortcuts
 */
onMounted(() => {
// Show new
  hotkeys('ctrl+n', props.hotkeysScope, (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    showAddModal()
  })
  // Edit
  hotkeys('enter', props.hotkeysScope, (ev) => {
    if (isModalOpen.value) {return}
    if (ev) {
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (props.highlightedRow) {showEditModal()}
  })
  
  // Delete
  hotkeys('ctrl+shift+d', props.hotkeysScope, (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    if (props.highlightedRow) {
      deleteRecord()
    }
  })

  // Select prev
  const selectPrev = (ev) => {
    if (isModalOpen.value || !$table.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    const $row = $table.value.querySelector('.highlighted')
    
    if ($row) {
      const $prevRow = $row.previousElementSibling
      if ($prevRow) {
        clickedRow({target: $prevRow})
      }
    }
  }
  hotkeys('up', props.hotkeysScope, selectPrev)
  hotkeys('ctrl+shift+up', props.hotkeysScope, selectPrev)
  
  // Select next
  const selectNext = (ev) => {
    if (isModalOpen.value || !$table.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    const $row = $table.value.querySelector('.highlighted')
    
    if ($row) {
      const $nextRow = $row.nextElementSibling
      if ($nextRow) {
        clickedRow({target: $nextRow})
      }
    }
  }
  hotkeys('down', props.hotkeysScope, selectNext)
  hotkeys('ctrl+shift+down', props.hotkeysScope, selectNext)
  hotkeys.setScope(props.hotkeysScope)
})
</script>