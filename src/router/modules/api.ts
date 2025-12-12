import type { RouteRecordRaw } from 'vue-router'

const ApiIndex = () => import('@/views/api/ApiIndex.vue')
const ApiMsgDetail = () => import('@/views/api/ApiMsgDetail.vue')

const apiRoutes: RouteRecordRaw[] = [
  {
    path: '/docs/api',
    name: 'ApiIndex',
    component: ApiIndex,
    meta: { title: 'API Explorer' },
  },
  {
    path: '/docs/api/:module/:msgType',
    name: 'ApiMsgDetail',
    component: ApiMsgDetail,
    meta: { title: 'API Message' },
  },
]

export default apiRoutes





