import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const NameList = () => import('@/views/chain/NameList.vue')
const NameDetails = () => import('@/views/chain/NameDetails.vue')
const DemoPiniaOrm = () => import('../views/DemoPiniaOrm.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/names' },
  { path: '/names', name: 'NameList', component: NameList },
  { path: '/names/:name', name: 'NameDetails', component: NameDetails, props: true },
  { path: '/demo-pinia-orm', name: 'DemoPiniaOrm', component: DemoPiniaOrm },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
