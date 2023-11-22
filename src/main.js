import { createApp } from 'vue'
import App from './App.vue'

const params = new URLSearchParams(window.location.search)

globalThis.mp = {
  app: createApp(App).mount('#app'),
  params
}