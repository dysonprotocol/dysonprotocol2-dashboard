<template>
  <div class="container">
    <h1>IBC Transfers</h1>

    <section class="panel">
      <h3 class="title">Addresses</h3>
      <form class="form" @submit.prevent="onSubmit">
        <label>
          Local address
          <input v-model="localAddress" placeholder="dys2..." />
        </label>
        <label>
          Remote address
          <input v-model="remoteAddress" placeholder="cosmos1..." />
        </label>
        <div>
          <button type="submit">Apply</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <h3 class="title">Approved Channels</h3>
      <div class="list">
        <div v-for="peer in peers" :key="peer.id" class="item">
          <div class="item-head">
            <div class="name">{{ peer.name }}</div>
            <div class="id">{{ peer.id }}</div>
          </div>
          <div class="desc">{{ peer.description }}</div>
          <div class="meta">
            <div>REST: {{ peer.rest_address }}</div>
            <div>localChannelId: {{ peer.localChannelId }}</div>
            <div>remoteChannelId: {{ peer.remoteChannelId }}</div>
          </div>
          <div class="actions">
            <RouterLink
              :to="{
                name: 'IbcTransferDetail',
                params: { other_chain_id: peer.id },
                query: { local: localAddress || '', remote: remoteAddress || '' },
              }"
            >
              View balances ↗
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { IBC_TRANSFER_PEERS } from '../../config/ibcTransfers'

const route = useRoute()
const router = useRouter()

const peers = IBC_TRANSFER_PEERS
const localAddress = ref('')
const remoteAddress = ref('')

onMounted(() => {
  const ql = String((route.query.local as string) || '')
  const qr = String((route.query.remote as string) || '')
  if (ql) localAddress.value = ql
  if (qr) remoteAddress.value = qr
})

function onSubmit() {
  // Persist addresses in query for easy routing
  router.replace({
    name: 'IbcTransfers',
    query: { local: localAddress.value || '', remote: remoteAddress.value || '' },
  })
}
</script>

<style scoped>
.container {
  display: block;
  padding: 16px;
}
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.title {
  margin: 0 0 8px 0;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
button {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.item {
  border: 1px solid #e5e7eb;
  padding: 10px;
  border-radius: 6px;
}
.item-head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}
.id {
  color: #6b7280;
  font-weight: 400;
}
.desc {
  margin: 6px 0;
  color: #374151;
}
.meta {
  font-size: 12px;
  color: #6b7280;
}
.actions {
  margin-top: 8px;
}
a {
  color: #2563eb;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>
