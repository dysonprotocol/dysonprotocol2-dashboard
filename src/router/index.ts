import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import namesRoutes from './modules/names'
import addressRoutes from './modules/address'
import explorerRoutes from './modules/explorer'
import miscRoutes from './modules/misc'
import redirectRoutes from './modules/redirects'

const Index = () => import('@/views/Index.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Index', component: Index },
  {
    path: '/demo-pinia-orm',
    name: 'DemoPiniaOrm',
    component: () => import('@/views/DemoPiniaOrm.vue'),
  },
  ...namesRoutes,
  ...redirectRoutes,
  ...explorerRoutes,
  ...addressRoutes,
  ...miscRoutes,
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
