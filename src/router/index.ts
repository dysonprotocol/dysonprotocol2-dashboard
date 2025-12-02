import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import namesRoutes from './modules/names'
import addressRoutes from './modules/address'
import explorerRoutes from './modules/explorer'
import miscRoutes from './modules/misc'
import redirectRoutes from './modules/redirects'
import ibcRoutes from './modules/ibc'
import ibcTransfersRoutes from './modules/ibcTransfers'
import migrationRoutes from './modules/migration'

const Index = () => import('@/views/Index.vue')
const MigrationWizard = () => import('@/views/migration/MigrationWizard.vue')
const DemoProtobuf = () => import('@/views/DemoProtobuf.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Index', component: MigrationWizard, meta: { title: 'Convert old DYS to DYS2' } },
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
