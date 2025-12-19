import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import namesRoutes from './modules/names'
import addressRoutes from './modules/address'
import explorerRoutes from './modules/explorer'
import miscRoutes from './modules/misc'
import redirectRoutes from './modules/redirects'
import ibcRoutes from './modules/ibc'
import ibcTransfersRoutes from './modules/ibcTransfers'
import migrationRoutes from './modules/migration'
import apiRoutes from './modules/api'

NProgress.configure({ showSpinner: false })

const Index = () => import('@/views/Index.vue')
const DemoProtobuf = () => import('@/views/DemoProtobuf.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Index',
    component: Index,
    meta: { title: 'Dyson Protocol 2' },
  },
  { path: '/demo/protobuf', name: 'DemoProtobuf', component: DemoProtobuf },
  {
    path: '/demo-pinia-orm',
    name: 'DemoPiniaOrm',
    component: () => import('@/views/DemoPiniaOrm.vue'),
  },
  ...namesRoutes,
  ...redirectRoutes,
  ...explorerRoutes,
  ...ibcRoutes,
  ...ibcTransfersRoutes,
  ...migrationRoutes,
  ...addressRoutes,
  ...miscRoutes,
  ...apiRoutes,
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(() => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
