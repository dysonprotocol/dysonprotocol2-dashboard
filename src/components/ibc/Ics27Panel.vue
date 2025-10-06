<template>
  <div class="panel">
    <h3 class="title">ICS-27 (Interchain Accounts)</h3>
    <div class="grid">
      <div>
        <div class="label">controller_enabled</div>
        <div>{{ controller?.controller_enabled ? 'true' : 'false' }}</div>
      </div>
      <div>
        <div class="label">host_enabled</div>
        <div>{{ host?.host_enabled ? 'true' : 'false' }}</div>
      </div>
    </div>
    <form class="form" @submit.prevent>
      <label>
        Owner
        <input name="owner" placeholder="cosmos1..." v-model="owner" />
      </label>
      <label>
        Connection ID
        <input name="connection_id" placeholder="connection-0" v-model="connectionId" />
      </label>
      <Button type="button" @click="lookupIca">Lookup ICA Address</Button>
    </form>
    <div v-if="icaAddress" class="mt-2">ICA: {{ icaAddress }}</div>
    <IcaControllerForms class="mt-2" />
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed, onMounted, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import IcaControllerParams from '@/orm/models/ibc/applications/interchain_accounts/controller/v1/Params'
import IcaHostParams from '@/orm/models/ibc/applications/interchain_accounts/host/v1/Params'
import IcaControllerForms from '@/components/ibc/forms/IcaControllerForms.vue'

const repoCtl = useRepo(IcaControllerParams)
const repoHost = useRepo(IcaHostParams)
const controller = computed(() => (repoCtl.find('default') as any) || { controller_enabled: false })
const host = computed(() => (repoHost.find('default') as any) || { host_enabled: false })

const owner = ref('')
const connectionId = ref('')
const icaAddress = ref('')

onMounted(async () => {
  await Promise.allSettled([
    useAxiosRepo(IcaControllerParams).api().fetch(),
    useAxiosRepo(IcaHostParams).api().fetch(),
  ])
})

async function lookupIca() {
  icaAddress.value = ''
  const o = owner.value.trim()
  const c = connectionId.value.trim()
  if (!o || !c) return
  await useAxiosRepo(IcaControllerParams).api().fetchIcaAddress(o, c)
  const row = repoCtl.find('default') as any
  icaAddress.value = String((row && (row as any).ica_address) || '')
}
</script>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.title {
  margin: 0 0 8px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.label {
  font-size: 12px;
  color: #6b7280;
}
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
</style>
