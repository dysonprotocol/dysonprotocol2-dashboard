import type { RouteRecordRaw } from 'vue-router'

const IbcTransferList = () => import('@/views/ibc-transfers/IbcTransferList.vue')
const IbcTransferDetail = () => import('@/views/ibc-transfers/IbcTransferDetail.vue')

const ibcTransfersRoutes: RouteRecordRaw[] = [
  { path: '/ibc-transfers', name: 'IbcTransfers', component: IbcTransferList },
  {
    path: '/ibc-transfers/:other_chain_id',
    name: 'IbcTransferDetail',
    component: IbcTransferDetail,
    props: true,
  },
]

export default ibcTransfersRoutes
