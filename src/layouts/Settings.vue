<template lang="pug">
div.flex.column
  fieldset.flex-auto.mb1
    legend Namespace
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
const importEverything = async()=> {
  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'application/json'
  file.onchange = async()=> {
    const reader = new FileReader()
    reader.onload = async()=> {
      const json = reader.result
      const data = JSON.parse(json)

      if (data.namespace?.namespaceName) {
        settingsModel.namespaceName = data.namespace.namespaceName
      } else {
        settingsModel.namespaceName = ''
      }

      // Remove any API keys
      const connections = data.connections.connections
      for (const key in connections) {
        delete connections[key].apiKey
      }
      connectionsModel.connections = connections
      connectionsModel.defaultConnection = data.defaultConnection
      
      // Load everything
      channelsModel.channels = data.channels?.channels
      channelsModel.currentChannel = data.channels?.currentChannel
      messagesModel.messages = data.messages.messages
      
      skillsModel.skills = data.skills.skills
      skillsModel.activeSkills = data.skills.activeSkills
      skillsModel.systemPrompt = data.skills.systemPrompt
      skillsModel.planningPrompt = data.skills.planningPrompt
      skillsModel.defaultSkill = data.skills.defaultSkill
      skillsModel.allSkillsDisabled = data.skills.allSkillsDisabled

      // Save everything
      await connectionsModel.save()
      await channelsModel.save()
      await messagesModel.save()
      await skillsModel.save()
      await settingsModel.save()


      // Delete elements
      file.remove()
    }
    reader.readAsText(file.files[0])
  }
  file.click()
}


const exportEverything =()=> {
  bus.value.$on('exportEverything')
}
</script>