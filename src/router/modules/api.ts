import type { RouteRecordRaw } from 'vue-router'

const ApiIndex = () => import('@/views/api/ApiIndex.vue')

const apiRoutes: RouteRecordRaw[] = [
  {
    path: '/api-explorer',
    name: 'ApiIndex',
    component: ApiIndex,
    meta: { title: 'API Explorer' },
  },
]

export default apiRoutes
