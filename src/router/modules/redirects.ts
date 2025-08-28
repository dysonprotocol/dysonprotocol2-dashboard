import type { RouteRecordRaw } from 'vue-router'

export const redirectRoutes: RouteRecordRaw[] = [
  {
    path: '/nfts/:class',
    redirect: (to) => {
      const cls = String(to.params.class || '')
      const root = cls.split('/')[0] || ''
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(cls)}`
    },
  },
  {
    path: '/nfts/:class/:id',
    redirect: (to) => {
      const cls = String(to.params.class || '')
      const id = String(to.params.id || '')
      const root = cls.split('/')[0] || ''
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(cls)}/${encodeURIComponent(id)}`
    },
  },
]

export default redirectRoutes
