import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { setupPiniaOrm } from './orm/setup'
import App from './App.vue'
import router from './router'
import './style.css'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (['css', 'scss', 'less'].includes(label)) return new cssWorker()
    if (['html', 'handlebars', 'razor'].includes(label)) return new htmlWorker()
    if (['typescript', 'javascript'].includes(label)) return new tsWorker()
    return new editorWorker()
  },
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
setupPiniaOrm(pinia)
app.use(router)
app.mount('#app')
