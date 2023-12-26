import { createApp } from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'

// Clear any background.js messages, since they persist across reloads
console.clear()

const params = new URLSearchParams(window.location.search)
const app = createApp(App)
app.use(createPinia())

globalThis.gptScratchpad = {
  app: app.mount('#app'),
  params
}