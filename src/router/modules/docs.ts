import type { RouteRecordRaw } from 'vue-router'

const DocsLayout = () => import('@/views/docs/DocsLayout.vue')

export const docsRoutes: RouteRecordRaw[] = [
  {
    path: '/docs',
    component: DocsLayout,
    children: [
      {
        path: '',
        name: 'DocsIndex',
        component: () => import('@/docs/index.md'),
        meta: { title: 'Documentation' },
      },
      {
        path: ':path(.*)',
        name: 'DocsPage',
        component: () => import('@/views/docs/DocsPage.vue'),
        meta: { title: 'Documentation' },
      },
    ],
  },
]

export default docsRoutes
