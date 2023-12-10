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
      @change='onNamespaceNameChange')

  fieldset.flex.mb1
    legend Data
    div
      .flex
        button.mr1(@click='clearEverything') Clear
        button.mr1(@click='importEverything') Import
        button(@click='exportEverything') Export
</template>

<script setup>
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useConnectionsModel} from '../model/connections.js'
import { useChannelsModel } from '../model/channels'
import { useSettingsModel } from '../model/settings'
import {useSkillsModel} from '../model/skills.js'
import {useMessagesModel} from '../model/messages.js'
import pkg from '../../package.json'
import { set } from '@vueuse/core'

const connectionsModel = useConnectionsModel()
const skillsModel = useSkillsModel()
const messagesModel = useMessagesModel()
const channelsModel = useChannelsModel()
const settingsModel = useSettingsModel()

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
  window.location.reload()
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

      // Ignore some data
      // connectionsModel.defaultConnection = data.connections.defaultConnection
      // skillsModel.defaultSkill = data.skills.defaultSkill
      // skillsModel.allSkillsDisabled = data.skills.allSkillsDisabled
      const settings = data.settings?.settings || {}
      if (data.namespace?.namespaceName) {
        settingsModel.namespaceName = data.namespace.namespaceName
      } else {
        settingsModel.namespaceName = ''
      }

      const connections = data.connections.connections
      for (const key in connections) {
        delete connections[key].apiKey
      }
      connectionsModel.connections = connections

      channelsModel.channels = data.channels?.channels
      channelsModel.currentChannel = data.channels?.currentChannel
      messagesModel.messages = data.messages.messages
      
      skillsModel.skills = data.skills.skills
      skillsModel.activeSkills = data.skills.activeSkills
      skillsModel.systemPrompt = data.skills.systemPrompt
      skillsModel.planningPrompt = data.skills.planningPrompt

      // Delete elements
      file.remove()
    }
    reader.readAsText(file.files[0])
  }
  file.click()
}

/**
 * Export
 */
const exportEverything = async()=> {
  let data = {
    version: pkg.version,
    namespace: {
      namespaceName: settingsModel.namespaceName?.namespaceName || settingsModel.namespaceName || ''
    },
    connections: {
      defaultConnection: connectionsModel.defaultConnection,
      connections: connectionsModel.connections
    },
    messages: {
      messages: messagesModel.messages
    },
    channels: {
      channels: channelsModel.channels,
      currentChannel: channelsModel.currentChannel
    },
    skills: {
      skills: skillsModel.skills,
      activeSkills: skillsModel.activeSkills,
      allSkillsDisabled: skillsModel.allSkillsDisabled,
      defaultSkill: skillsModel.defaultSkill,
      systemPrompt: skillsModel.systemPrompt,
      planningPrompt: skillsModel.planningPrompt,
    }
  }

  // Remove API keys from connections
  data = JSON.parse(JSON.stringify(data))
  if (data.connections.connections) {
    for (const key in data.connections.connections) {
      data.connections.connections[key].apiKey = ''
    }
  }

  // title is "yy-mm-dd mp"
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let title = `${year}-${month}-${day}`

  // @fixme this is so much
  // inscrutable spaghetti code
  // it could feed me for a week
  let namespaceName = settingsModel.namespaceName?.namespaceName || settingsModel.namespaceName || ''
  if (typeof namespaceName === 'object') {
    namespaceName = ''
  }
  title = namespaceName ? `${namespaceName} -- ${title}` : `ModelPrompter -- ${title}`
  
  // Download the json file
  // Convert the data to a JSON string
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.json`
  link.click()
  URL.revokeObjectURL(url)  
}

onMounted(() => {
  // setTimeout(() => {
  //   $namespaceName.value.focus()
  // }, 0)
})
</script>