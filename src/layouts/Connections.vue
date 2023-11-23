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
  <button @click="toggleModal(true)" >Add connection</button>

  <Window v-if="isModalOpen" title="Add new connection" class="modal" canClose isModal @close="toggleModal(false)">
    <div class="field-row-stacked">
      <label for="connections-name">Connection name:</label>
      <input type="text" id="connections-name" placeholder="Local Mistral 7B" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-baseurl">Base URL:</label>
      <input type="text" id="connections-baseurl" placeholder="http://localhost:1234/v1" />
    </div>

    <div class="field-row-stacked">
      <label for="connections-temp">Temperature:</label>
      <input type="text" id="connections-temp" placeholder="0.7" />
    </div>

    <div class="flex pt3">
      <button class="flex-auto mr2" @click="closeModal">Cancel</button>
      <button>Add connection</button>
    </div>
  </Window>
</div>
</template>


<script setup>
import Window from '../components/Window.vue'
import {ref, watch, onMounted} from 'vue'
import {useTabsModel} from '../model/tabs.js'

let isModalOpen = ref(false)
const tabsModel = useTabsModel()

const toggleModal = (val) => {
  isModalOpen.value = val
  tabsModel.adjustZIndex()
}

const closeModal = () => {
  toggleModal(false)
}
</script>