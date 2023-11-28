<template>
<div class="sunken-panel fullwidth flex column">
  <div>
    <table ref="$table" class="interactive fullwidth">
      <thead>
        <slot name="theader">
          <tr style="flex: 0">
            <th v-for="heading in props.headings" :class="heading.class">{{ heading.content }}</th>
          </tr>
        </slot>
      </thead>
      <tbody>
        <tr @click="clickedRow" v-for="(record, dataKey) in data" :key=dataKey :class="{'highlighted': dataKey == props.highlightedRow}" :data-id="dataKey">
          <td v-for="heading in props.headings" :class="heading.class" :key="heading.key">
            {{ record[heading.key] }}
          </td>
        </tr>
        <slot name="tbody"></slot>
      </tbody>
    </table>
  </div>
</div>

<!-- Bottom of  form -->
<div class="flex-auto pt1">
  <div class="flex">
    <button class="flex-auto mr1" :class="{hidden: !props.highlightedRow}" @click="deleteRecord">Delete</button>
    <button class="mr1" :class="{hidden: !props.highlightedRow}" @click="showEditModal">Edit</button>
    <button @click="showAddModal">New</button>
  </div>
</div>

<!-- Modal -->
<Window v-if="isModalOpen" :title="isEditMode ? 'Update ' + props.title.toLowerCase() : 'Add new ' + props.title.toLowerCase()" class="modal" canClose isModal @close="toggleModal(false)">
  <div class="autoscroll">
    <div class="flex column fullheight">
      <div ref="$form">
        <!-- Loop for each root form field -->
        <div v-for="key, n in Object.keys(defaults)" class="field-row-stacked">
          <label :for="`field-${key}`">{{ key }}:</label>
          <input v-if="!headings[n]?.field?.type || headings[n]?.field?.type == 'text'" @keydown.ctrl.exact.enter.prevent="submitForm" :id="`field-${key}`" type="text" v-model="curForm[key]">
          <textarea v-else-if="headings[n]?.field?.type == 'textarea'" @keydown.ctrl.exact.enter.prevent="submitForm" :id="`field-${key}`" :rows="headings[n]?.field?.rows || 3" v-model="curForm[key]"></textarea>
        </div>
      </div>
      <div>
        <div class="flex pt3">
          <button class="flex-auto mr2" @click="closeModal">Cancel</button>
          <button ref="addButton" :disabled="!isValidForm" @click="submitForm">
            <span v-if="isEditMode">Update {{ props.title }}</span>
            <span v-else>Add {{ props.title }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Window>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch} from 'vue'
import {useTabsModel} from '../model/tabs.js'
import Window from '../components/Window.vue'
import Table from '../components/Table.vue'
import Mousetrap from 'mousetrap'

// Props
const props = defineProps({
  title: String,
  headings: Array,
  data: Object,
  form: Object,
  highlightedRow: String,
  defaults: Object,
  validateForm: Function,
})

const $table = ref(null)
const $form = ref(null)
const addButton = ref(null)
const isModalOpen = ref(false)
const tabsModel = useTabsModel()
const isEditMode = ref(false)
const curForm = ref({})
const isValidForm = ref(false)

const emit = defineEmits(['submit', 'delete', 'updateHighlightedRow'])

watch(curForm, (val) => {
  isValidForm.value = props.validateForm(val)
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
const showEditModal = () => {
  isEditMode.value = true
  curForm.value = Object.assign({}, props.highlightedRow)
  toggleModal(true)
}


/**
 * Expose methods
 */
defineExpose({
  selectRow: (rowToSelect) => {
    // Select the defaults if one exists
    if (rowToSelect) {
      const $row = document.querySelector(`[data-id="${rowToSelect}"]`)
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
  Mousetrap.bindGlobal('ctrl+shift+n', (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    showAddModal()
  })
  // Edit
  Mousetrap.bindGlobal('ctrl+shift+e', (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    if (props.highlightedRow) {
      showEditModal()
    }
  })
  
  // Delete
  Mousetrap.bindGlobal('ctrl+shift+d', (ev) => {
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
    if (isModalOpen.value) {
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
  Mousetrap.bindGlobal('up', selectPrev)
  Mousetrap.bindGlobal('ctrl+shift+up', selectPrev)

  // Select next
  const selectNext = (ev) => {
    if (isModalOpen.value) {
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
  Mousetrap.bindGlobal('down', selectNext)
  Mousetrap.bindGlobal('ctrl+shift+down', selectNext)
})

onBeforeUnmount(() => {
  Mousetrap.unbind('ctrl+shift+n')
  Mousetrap.unbind('ctrl+shift+e')
  Mousetrap.unbind('ctrl+shift+d')
  Mousetrap.unbind('ctrl+shift+up')
  Mousetrap.unbind('ctrl+shift+down')
  Mousetrap.unbind('up')
  Mousetrap.unbind('down')
})
</script>