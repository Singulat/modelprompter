<template>
<Table
ref="$table"
:headings="headings"
:form="connectionForm"
:data="connectionsModel.connections"
:isValidForm="isValidForm"
:defaults="connectDefaults"
:highlightedRow="connectionsModel.defaultConnection"
@updateHighlightedRow="connectionsModel.setDefault"
@submit="onSubmit"
@delete="deleteConnection"
></Table>
</template>


<script setup>
import {ref, computed, onMounted} from 'vue'
import {useConnectionsModel} from '../model/connections.js'
import Table from '../components/Table.vue'

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

const isValidForm = computed(() => {
  return !!connectionForm.value.name && !!connectionForm.value.baseurl && !!connectionForm.value.temp
})


/**
 * Submit form
 */
const onSubmit = async (isEditMode, data) => {
  let id = connectionsModel.defaultConnection
  if (isEditMode.value) {
    connectionsModel.updateConnection(id, data)
  } else {
    id = await connectionsModel.addConnection(connectionForm.data)
  }
  connectionForm.value = Object.keys({}, connectDefaults)
  
  // Set default
  if (Object.keys(connectionsModel.connections).length < 2) {
    connectionsModel.setDefault(id)
  }
}

/**
 * Delete a connection
 */
 const deleteConnection = () => {
  const id = connectionsModel.defaultConnection
  connectionsModel.deleteConnection(id)
}



/**
 * Show modal if no connections,
 * otherwise show default connection
 */
onMounted(() => {
  setTimeout(() => {
    if (Object.keys(connectionsModel.connections).length === 0) {
      showAddConnectionModal()
    }
    $table.value.selectRow(connectionsModel.defaultConnection)
  }, 0)
})
</script>