<template lang="pug">
div.flex.column
  fieldset.flex-auto.mb1
    legend Workbook Name
    .field-row-stacked
      input#settings-namespace-name(
        type='text'
        ref='$namespaceName'
        :value="typeof settingsModel.namespaceName === 'string' ? settingsModel.namespaceName : settingsModel.namespaceName.namespaceName"
        autofocus
        placeholder='Untitled'
        @change='onNamespaceNameChange'
      )

  fieldset.flex.mb1
    legend Data
    div
      .flex
        button.mr1(@click='clearEverything') Clear
        button.mr1(@click='importEverything') Import
        button(@click='exportEverything') Export
</template>

<script setup>
import {ref, onMounted, inject} from 'vue'
import {useConnectionsModel} from '../model/connections.js'
import { useChannelsModel } from '../model/channels'
import { useSettingsModel } from '../model/settings'
import {useSkillsModel} from '../model/skills.js'
import {useMessagesModel} from '../model/messages.js'

// Stores
const connectionsModel = useConnectionsModel()
const skillsModel = useSkillsModel()
const messagesModel = useMessagesModel()
const channelsModel = useChannelsModel()
const settingsModel = useSettingsModel()

// Refs
const bus = inject('bus')
const $namespaceName = ref(null)

/**
 * Set the namespace
 */
const onNamespaceNameChange = async(ev)=> {
  const name = ev.target.value
  await settingsModel.setNamespaceName(name)
}

/**
 * Clear everything
 */
const clearEverything = async()=> {
  chrome.storage.sync.clear()
  globalThis.location.reload()
}


/**
 * Import everything
 */
const importEverything = ()=> {
  bus.value.$emit('importEverything')
}
const exportEverything =()=> {
  bus.value.$emit('exportEverything')
}
</script>