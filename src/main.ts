import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { setupPiniaOrm } from './orm/setup'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
setupPiniaOrm(pinia)
app.use(router)
app.mount('#app')
