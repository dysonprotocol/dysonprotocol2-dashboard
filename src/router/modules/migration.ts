import type { RouteRecordRaw } from 'vue-router'

const MigrationWizard = () => import('@/views/migration/MigrationWizard.vue')
const IbcSetup = () => import('@/views/migration/IbcSetup.vue')

const migrationRoutes: RouteRecordRaw[] = [
  {
    path: '/migrate',
    name: 'Migration',
    component: MigrationWizard,
    meta: {
      title: 'Convert old DYS to DYS2',
    },
  },
  {
    path: '/migrate/ibc',
    name: 'MigrationIbcSetup',
    component: IbcSetup,
    meta: {
      title: 'IBC Channel Setup',
    },
  },
]

export default migrationRoutes

