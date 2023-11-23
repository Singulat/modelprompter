<template>
<div id="connections-container" class="sunken-panel fullwidth">
  <table class="interactive fullwidth fullheight">
    <thead>
      <tr>
        <th>Name</th>
        <th>Temp</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="flex-auto pt2">
  <div class="inline-block spacer"></div>
  <button @click="toggleModal(true)" >Add connection</button>

  <Window v-if="isModalOpen" title="Add new connection" class="modal" canClose isModal @close="toggleModal(false)">
    <div class="field-row-stacked">
      <label for="connections-name">Connection name:</label>
      <input type="text" id="connections-name" ref="connectionName" autofocus placeholder="Local Mistral 7B" v-model="connection.name" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-model">Model:</label>
      <input type="text" id="connections-model" placeholder="gpt-4-1106-preview" v-model="connection.model" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-baseurl">Base URL:</label>
      <input type="text" id="connections-baseurl" placeholder="http://localhost:1234/v1" v-model="connection.baseurl" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-apikey">API key:</label>
      <input type="text" id="connections-apikey" placeholder="sk-1234" v-model="connection.apiKey" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-organization">Organization:</label>
      <input type="text" id="connections-organization" placeholder="OpenAI" v-model="connection.organization" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-temp">Temperature:</label>
      <input type="text" id="connections-temp" placeholder="0.7" v-model="connection.temp" />
    </div>

    <div class="flex pt3">
      <button class="flex-auto mr2" @click="closeModal">Cancel</button>
      <button ref="addConnectionButton" :disabled="!isValidForm" @click="submitConnectionForm">Add connection</button>
    </div>
  </Window>
</div>
</template>


<script setup>
import Window from '../components/Window.vue'
import {ref, computed} from 'vue'
import {useTabsModel} from '../model/tabs.js'

const connectionName = ref(null)
const addConnectionButton = ref(null)
const isModalOpen = ref(false)
const connection = ref({
  name: 'GPT4 Turbo',
  model: 'gpt-4-1106-preview',
  baseurl: 'https://api.openai.com/v1/',
  apiKey: '',
  organization: '',
  temp: '0.7'
})
const tabsModel = useTabsModel()

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
  return !!connection.value.name && !!connection.value.baseurl && !!connection.value.temp
})

const submitConnectionForm = () => {
  if (!isValidForm.value) {
    return
  }

  toggleModal(false)
}
</script>