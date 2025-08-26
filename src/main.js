import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { setupPiniaOrm } from '@/orm/setup'
import { setupPiniaOrmAxios } from '@/orm/setup-axios'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

// Install Pinia ORM + Axios (http://localhost:1317)
setupPiniaOrm(pinia)
setupPiniaOrmAxios(pinia)

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin)

app.mount('#app')
