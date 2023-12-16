<template lang="pug">
Table(
  ref="$table"
  title="Connection"
  hotkeysScope="Connections"
  :headings="headings"
  :form="connectionForm"
  :data="connectionsModel.connections"
  :validateForm="validateForm"
  :defaults="connectDefaults"
  :highlightedRow="connectionsModel.defaultConnection"
  @updateHighlightedRow='id => connectionsModel.setDefault(id)'
  @submit="onSubmit"
  @delete="deleteConnection"
  @close="onTableClose"
)
</template>


<script setup>
import {ref, computed, onBeforeUnmount, onMounted} from 'vue'
import {useConnectionsModel} from '../model/connections.js'
import Table from '../components/Table.vue'
import hotkeys from 'hotkeys-js'

const connectDefaults = {
  name: 'GPT4 Turbo',
  model: 'gpt-4-1106-preview',
  baseurl: 'https://api.openai.com/v1/',
  apiKey: '',
  organization: '',
  temp: '0.7'
}
const headings = [
  {key: 'name', content: 'Name'},
  {key: 'model', content: 'Model Name', class: 'gt-md'},
  {key: 'baseurl', content: 'Base URL', class: 'gt-md'},
  {key: 'temp', content: 'Temp'}
]

const $table = ref(null)
const connectionsModel = useConnectionsModel()
const connectionForm = ref(connectDefaults)

const validateForm = (record) => {
  return !!record?.name && !!record?.baseurl && !!record?.temp
}


/**
 * Submit form
 */
const onSubmit = async (isEditMode, data) => {
  let id = connectionsModel.defaultConnection
  if (isEditMode) {
    connectionsModel.updateConnection(id, data)
  } else {
    id = await connectionsModel.addConnection(data)
  }
  
  // Set default
  $table.value.selectRow(id)
}

/**
 * Delete a connection
 */
 const deleteConnection = () => {
  connectionsModel.deleteConnection(connectionsModel.defaultConnection)
}



/**
 * Show modal if no connections,
 * otherwise show default connection
 */
onMounted(() => {
  setTimeout(() => {
    if (!Object.keys(connectionsModel.connections).length) {
      $table.value.showAddModal()
    } else {
      $table.value.selectRow(connectionsModel.defaultConnection)
    }
  }, 0)
  hotkeys.setScope('Connections')
  bindEscape()
})
onBeforeUnmount(()=> {
  hotkeys.deleteScope('Connections')
})

/**
 * Bind escape key (just let it pass through to close the window)
 */
const onTableClose =()=> bindEscape()
const bindEscape =()=> hotkeys('esc', 'Connections', (ev)=> {})
</script>