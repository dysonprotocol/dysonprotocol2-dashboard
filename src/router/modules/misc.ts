import type { RouteRecordRaw } from 'vue-router'

const Placeholder = () => import('@/views/Placeholder.vue')

export const miscRoutes: RouteRecordRaw[] = [
  { path: '/tasks', name: 'TaskManager', component: () => import('@/views/chain/TaskManager.vue') },
  {
    path: '/tasks/:taskId',
    name: 'TaskDetails',
    component: () => import('@/views/chain/TaskDetail.vue'),
    props: true,
  },

  {
    path: '/demo-ws-block',
    name: 'DemoWsBlock',
    component: () => import('@/views/DemoWsBlock.vue'),
  },

  {
    path: '/demo/whaleswap-grpc-pair',
    name: 'DemoWhaleswapGrpcPair',
    component: () => import('@/views/DemoWhaleswapGrpcPair.vue'),
    meta: { title: 'Whaleswap gRPC Pair Queries' },
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
