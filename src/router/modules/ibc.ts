import type { RouteRecordRaw } from 'vue-router'

const IBC = () => import('@/views/ibc/IBC.vue')

const ibcRoutes: RouteRecordRaw[] = [
  {
    path: '/ibc-connections',
    name: 'IBC',
    component: IBC,
  },
]

export default ibcRoutes

