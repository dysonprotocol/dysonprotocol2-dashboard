import type { RouteRecordRaw } from 'vue-router'

const Placeholder = () => import('@/views/Placeholder.vue')

export const miscRoutes: RouteRecordRaw[] = [
  { path: '/tasks', name: 'TaskManager', component: Placeholder, meta: { title: 'Task Manager' } },
  {
    path: '/tasks/:taskId',
    name: 'TaskDetails',
    component: Placeholder,
    props: true,
    meta: { title: 'Task Details' },
  },

  { path: '/docs', name: 'ApiDocs', component: Placeholder, meta: { title: 'API Docs' } },
  { path: '/api', name: 'CodeSnippets', component: Placeholder, meta: { title: 'Code Snippets' } },

  { path: '/wallet', name: 'WalletView', component: Placeholder, meta: { title: 'Wallet' } },

  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: Placeholder,
    meta: { title: 'Not Found' },
  },
]

export default miscRoutes
