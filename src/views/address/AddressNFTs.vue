<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="text-sm opacity-70">
        total: <code>{{ items.length }}</code>
      </div>
      <Button size="sm" @click="refresh">Refresh</Button>
    </div>

    <div v-if="items.length === 0" class="opacity-70">No NFTs</div>

    <div v-else class="space-y-4">
      <Card v-for="g in groupedByClass" :key="g.classId">
        <CardHeader class="mb-2">
          <div class="flex items-center justify-between">
            <CardTitle class="font-medium">
              <span>Class:</span>
              <Button v-if="g.rootName" as-child variant="link" class="px-1 font-mono">
                <RouterLink
                  :to="{
                    name: 'NameNftClassDetail',
                    params: { name: g.rootName, classid: g.classId },
                  }"
                >
                  {{ g.classId }}
                </RouterLink>
              </Button>
              <span v-else class="font-mono">{{ g.classId }}</span>
            </CardTitle>
            <div class="text-xs opacity-70">
              count: <code>{{ g.items.length }}</code>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>URI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="n in g.items" :key="n.id">
                  <TableCell class="font-mono">
                    <Button v-if="g.rootName" as-child variant="link" class="px-0">
                      <RouterLink
                        :to="{
                          name: 'NameNftDetail',
                          params: { name: g.rootName, classid: g.classId, id: n.id },
                        }"
                      >
                        {{ n.id }}
                      </RouterLink>
                    </Button>
                    <span v-else>{{ n.id }}</span>
                  </TableCell>
                  <TableCell class="font-mono break-all">{{ n.uri || '—' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NftItem from '@/orm/models/nft/NftItem'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

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
