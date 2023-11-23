import { createApp } from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'

const params = new URLSearchParams(window.location.search)
const app = createApp(App)
app.use(createPinia())

globalThis.mp = {
  app: app.mount('#app'),
  params
}