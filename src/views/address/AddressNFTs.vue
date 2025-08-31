<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="text-sm opacity-70">
        total: <code>{{ items.length }}</code>
      </div>
      <button class="btn btn-primary btn-sm" @click="refresh">Refresh</button>
    </div>

    <div v-if="items.length === 0" class="opacity-70">No NFTs</div>

    <div v-else class="space-y-4">
      <div v-for="g in groupedByClass" :key="g.classId" class="border rounded p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium">
            <span>Class:</span>
            <RouterLink
              v-if="g.rootName"
              :to="{ name: 'NameNftClassDetail', params: { name: g.rootName, classid: g.classId } }"
              class="link link-primary font-mono"
            >
              {{ g.classId }}
            </RouterLink>
            <span v-else class="font-mono">{{ g.classId }}</span>
          </div>
          <div class="text-xs opacity-70">
            count: <code>{{ g.items.length }}</code>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table table-xs">
            <thead>
              <tr>
                <th>ID</th>
                <th>URI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in g.items" :key="n.id">
                <td class="font-mono">
                  <RouterLink
                    v-if="g.rootName"
                    :to="{
                      name: 'NameNftDetail',
                      params: { name: g.rootName, classid: g.classId, id: n.id },
                    }"
                    class="link link-primary"
                  >
                    {{ n.id }}
                  </RouterLink>
                  <span v-else>{{ n.id }}</span>
                </td>
                <td class="font-mono break-all">{{ n.uri || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NftItem from '@/orm/models/nft/NftItem'

const props = defineProps<{ address: string }>()

const repo = useRepo(NftItem)
const items = computed<any[]>(() => (repo.all() as any[]).filter((n) => n.owner === props.address))

function rootNameFromClassId(classId: string): string {
  const s = String(classId || '')
  const i = s.indexOf('/')
  return i === -1 ? s : s.slice(0, i)
}

const groupedByClass = computed(() => {
  const byClass: Record<string, Array<{ id: string; uri: string }>> = {}
  for (const n of items.value) {
    const cid = String(n.class_id || '')
    if (!byClass[cid]) byClass[cid] = []
    byClass[cid].push({ id: String(n.id || ''), uri: String(n.uri || '') })
  }
  return Object.keys(byClass)
    .sort()
    .map((classId) => ({
      classId,
      rootName: rootNameFromClassId(classId),
      items: byClass[classId].sort((a, b) => a.id.localeCompare(b.id)),
    }))
})

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NftItem).api().fetchNfts({ owner: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
