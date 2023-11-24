<template>
<div id="connections-container" class="sunken-panel fullwidth">
  <div>
    <table class="interactive fullwidth fullheight">
      <thead>
        <tr>
          <th>Name</th>
          <th class="gt-md">Model Name</th>
          <th class="gt-md">Base URL</th>
          <th>Temp</th>
          <th>Default</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in Object.keys(connectionsModel.connections)" :key="key" @click="selectRow" :data-id="key">
          <td>{{ connectionsModel.connections[key].name }}</td>
          <td class="gt-md">{{ connectionsModel.connections[key].model }}</td>
          <td class="gt-md">{{ connectionsModel.connections[key].baseurl }}</td>
          <td>{{ connectionsModel.connections[key].temp }}</td>
          <td>
            <div class="field-row">
              <input name="connection" :checked="connectionsModel.defaultConnection == key" type="radio" :id="`connection-radio-${key}`" @change="onConnectionRadioChange">
              <label :for="`connection-radio-${key}`">&nbsp;</label>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Bottom of  form -->
<div class="flex-auto pt2">
  <button @click="showAddConnectionModal" >Add connection</button>
  <button :class="{hidden: !highlightedRow, 'float-right': true}" @click="showEditConnectionModal">Edit</button>
  <button :class="{'mr1': true, hidden: !highlightedRow, 'float-right': true}" @click="deleteConnection">Delete</button>
</div>

<Window v-if="isModalOpen" :title="isEditMode ? 'Update connection' : 'Add new connection'" class="modal" canClose isModal @close="toggleModal(false)">
  <div class="field-row-stacked">
    <label for="connections-name">Connection name:</label>
    <input type="text" id="connections-name" ref="connectionName" autofocus placeholder="Local Mistral 7B" v-model="connectionForm.name" />
  </div>

  <div class="field-row-stacked">
    <label for="connections-model">Model:</label>
    <input type="text" id="connections-model" placeholder="gpt-4-1106-preview" v-model="connectionForm.model" />
  </div>

  <div class="field-row-stacked">
    <label for="connections-baseurl">Base URL:</label>
    <input type="text" id="connections-baseurl" placeholder="http://localhost:1234/v1" v-model="connectionForm.baseurl" />
  </div>

  <div class="field-row-stacked">
    <label for="connections-apikey">API key:</label>
    <input type="text" id="connections-apikey" placeholder="sk-1234" v-model="connectionForm.apiKey" />
  </div>

  <div class="field-row-stacked">
    <label for="connections-organization">Organization:</label>
    <input type="text" id="connections-organization" placeholder="OpenAI" v-model="connectionForm.organization" />
  </div>

  <div class="field-row-stacked">
    <label for="connections-temp">Temperature:</label>
    <input type="text" id="connections-temp" placeholder="0.7" v-model="connectionForm.temp" />
  </div>

  <div class="flex pt3">
    <button class="flex-auto mr2" @click="closeModal">Cancel</button>
    <button ref="addConnectionButton" :disabled="!isValidForm" @click="submitConnectionForm">
      <span v-if="isEditMode">Update connection</span>
      <span v-else>Add connection</span>
    </button>
  </div>
</Window>
</template>


<script setup>
import Window from '../components/Window.vue'
import {ref, computed} from 'vue'
import {useTabsModel} from '../model/tabs.js'
import {useConnectionsModel} from '../model/connections.js'

const connectDefaults = {
  name: 'GPT4 Turbo',
  model: 'gpt-4-1106-preview',
  baseurl: 'https://api.openai.com/v1/',
  apiKey: '',
  organization: '',
  temp: '0.7'
}

const connectionName = ref(null)
const addConnectionButton = ref(null)
const isModalOpen = ref(false)
const connectionForm = ref(connectDefaults)
const tabsModel = useTabsModel()
const connectionsModel = useConnectionsModel()

const isEditMode = ref(false)

const toggleModal = (val) => {
  isModalOpen.value = val
  tabsModel.adjustZIndex()

  // Focus the first input when the modal opens
  if (val) {
    setTimeout(() => {
      connectionName.value.focus()
    }, 0)
  }
}

const closeModal = () => {
  toggleModal(false)
}

const isValidForm = computed(() => {
  return !!connectionForm.value.name && !!connectionForm.value.baseurl && !!connectionForm.value.temp
})

const submitConnectionForm = async () => {
  let id
  if (!isValidForm.value) {
    return
  }

  if (isEditMode.value) {
    id = highlightedRow.value.attributes['data-id'].value
    connectionsModel.updateConnection(id, connectionForm.value)
  } else {
    id = await connectionsModel.addConnection(connectionForm.value)
  }
  connectionForm.value = connectDefaults
  toggleModal(false)

  // Set default
  if (Object.keys(connectionsModel.connections).length < 2) {
    console.log('length', Object.keys(connectionsModel.connections).length, id)
    connectionsModel.setDefault(id)
  }
}

/**
 * Select a row in the table
 */
const highlightedRow = ref(null)
const selectRow = (e) => {
  const $table = e.target.closest('table')
  const $row = e.target.closest('tr')

  let isHighlighted = $row.classList.contains('highlighted')
  $table.querySelectorAll('tr').forEach(($row) => {
    $row.classList.remove('highlighted')
  })

  $row.classList.toggle('highlighted')
  if (isHighlighted) {
    $row.classList.remove('highlighted')
    highlightedRow.value = null
  } else {
    highlightedRow.value = $row
  }
}

/**
 * Delete a connection
 */
const deleteConnection = () => {
  const id = highlightedRow.value.attributes['data-id'].value
  connectionsModel.deleteConnection(id)
  highlightedRow.value = null
}

const showAddConnectionModal = () => {
  isEditMode.value = false
  toggleModal(true)
} 

/**
 * Edit a connection
 */
const showEditConnectionModal = () => {
  const id = highlightedRow.value.attributes['data-id'].value
  const connection = connectionsModel.getConnection(id)
  
  isEditMode.value = true
  connectionForm.value = Object.assign({}, connection)
  toggleModal(true)
}


const onConnectionRadioChange = (e) => {
  const $row = e.target.closest('tr')
  const id = $row.attributes['data-id'].value
  connectionsModel.setDefault(id)
}
</script>