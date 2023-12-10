<template lang="pug">
div.flex.column
  fieldset.flex-auto.mb1
    button.mr1 Clear
    button.mr1(@click='importEverything') Import
    button(@click='exportEverything') Export
</template>

<script setup>
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useConnectionsModel} from '../model/connections.js'
import { useChannelsModel } from '../model/channels'
import {useSkillsModel} from '../model/skills.js'
import {useMessagesModel} from '../model/messages.js'
import pkg from '../../package.json'

const connectionsModel = useConnectionsModel()
const skillsModel = useSkillsModel()
const messagesModel = useMessagesModel()
const channelsModel = useChannelsModel()

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
  const title = `ModelPrompter ${year}-${month}-${day}`
  
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
</script>