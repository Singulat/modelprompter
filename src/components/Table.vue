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
        <tr @click="clickedRow" v-for="(record, dataKey) in data" :key=dataKey :class="{'highlighted': dataKey == props.highlightedRow}" :data-key="dataKey">
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
    <button class="flex-auto mr1" :class="{hidden: !props.highlightedRow,}" @click="deleteRecord">Delete</button>
    <button class="mr1" :class="{hidden: !props.highlightedRow}" @click="showEditModal">Edit</button>
    <button @click="showAddModal">New</button>
  </div>
</div>

<!-- Modal -->
<Window v-if="isModalOpen" :title="isEditMode ? 'Update connection' : 'Add new connection'" class="modal" canClose isModal @close="toggleModal(false)">
  <div class="autoscroll">
    <div class="flex column fullheight">
      <div ref="$form">
        <!-- Loop for each root form field -->
        <div v-for="key in Object.keys(defaults)" class="field-row-stacked">
          <label :for="`field-${key}`">{{ key }}:</label>
          <input @keydown.ctrl.exact.enter.prevent="submitForm" id="`field-${key}`" type="text" :value="defaults[key]">
        </div>
      </div>
      <div>
        <div class="flex pt3">
          <button class="flex-auto mr2" @click="closeModal">Cancel</button>
          <button ref="addButton" :disabled="!isValidForm" @click="submitForm">
            <span v-if="isEditMode">Update connection</span>
            <span v-else>Add connection</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Window>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'
import {useTabsModel} from '../model/tabs.js'
import Window from '../components/Window.vue'
import Table from '../components/Table.vue'
import Mousetrap from 'mousetrap'

// Props
const props = defineProps({
  headings: {
    type: Array,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  form: {
    type: Object,
    required: true
  },
  isValidForm: {
    type: Boolean,
    required: false
  },
  highlightedRow: {
    type: String,
    required: false
  },
  defaults: {
    type: Object,
    required: false
  }
})

const $table = ref(null)
const $form = ref(null)
const addButton = ref(null)
const isModalOpen = ref(false)
const tabsModel = useTabsModel()
const isEditMode = ref(false)
const curForm = ref({})

const emit = defineEmits(['submit', 'delete', 'updateHighlightedRow'])

/**
 * Toggle modal on/off
 */
const toggleModal = (val) => {
  isModalOpen.value = val
  tabsModel.adjustZIndex()

  // Focus the first input when the modal opens
  if (val) {
    setTimeout(() => {
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
  if (!props.isValidForm.value) {
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
  emit('updateHighlightedRow', $row.getAttribute('data-key'))
}



const showAddModal = () => {
  isEditMode.value = false
  curForm.value = Object.assign({}, props.connectDefaults)
  toggleModal(true)
} 

/**
 * Edit a connection
 */
const showEditModal = () => {
  const id = props.highlightedRow.value.attributes['data-id'].value
  const connection = connectionsModel.getConnection(id)
  
  isEditMode.value = true
  curForm.value = Object.assign({}, connection)
  toggleModal(true)
}


const onConnectionRadioChange = (e) => {
  const $row = e.target.closest('tr')
  const id = $row.attributes['data-id'].value
  connectionsModel.setDefault(id)
}

/**
 * Expose methods
 */
defineExpose({
  selectRow: (rowToSelect) => {
    // Select the default connection if one exists
    if (rowToSelect) {
      const $row = document.querySelector(`[data-id="${rowToSelect}"]`)
      if ($row) {
        $row.classList.add('highlighted')
        props.highlightedRow.value = $row
      }
    }
  }
})


/**
 * Show popup if no connections
 */
onMounted(() => {
  // Show new connection
  Mousetrap.bindGlobal('ctrl+shift+n', (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    showAddModal()
  })
  // Edit connection
  Mousetrap.bindGlobal('ctrl+shift+e', (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    if (props.highlightedRow.value) {
      showEditModal()
    }
  })
  // Delete connection
  Mousetrap.bindGlobal('ctrl+shift+d', (ev) => {
    if (isModalOpen.value) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()
    if (props.highlightedRow.value) {
      deleteConnection()
    }
  })

  // Select connections
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