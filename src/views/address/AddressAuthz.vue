<template>
  <div class="">
    <h2 class="text-xl font-semibold">
      Authz — <code>{{ address }}</code>
    </h2>
    <div class="flex gap-2">
      <button
        class="btn btn-primary"
        @click="refreshAsGranter"
      >
        As Granter
      </button>
      <button
        class="btn btn-primary"
        @click="refreshAsGrantee"
      >
        As Grantee
      </button>
    </div>
    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h3 class="font-semibold">
          Grants given
        </h3>
        <ul class="list-disc pl-6 text-sm">
          <li
            v-for="g in asGranter"
            :key="g.grantee + ':' + g.type_url + ':' + g.msg_type_url"
          >
            → <span class="font-mono">{{ g.grantee }}</span>
            <div class="opacity-70">
              auth=<code>{{ g.type_url }}</code> msg=<code>{{ g.msg_type_url }}</code>
            </div>
          </li>
          <li
            v-if="asGranter.length === 0"
            class="opacity-70"
          >
            None
          </li>
        </ul>
      </div>
      <div>
        <h3 class="font-semibold">
          Grants received
        </h3>
        <ul class="list-disc pl-6 text-sm">
          <li
            v-for="g in asGrantee"
            :key="g.granter + ':' + g.type_url + ':' + g.msg_type_url"
          >
            ← <span class="font-mono">{{ g.granter }}</span>
            <div class="opacity-70">
              auth=<code>{{ g.type_url }}</code> msg=<code>{{ g.msg_type_url }}</code>
            </div>
          </li>
          <li
            v-if="asGrantee.length === 0"
            class="opacity-70"
          >
            None
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Grant from '@/orm/models/authz/Grant'

const props = defineProps<{ address: string }>()

const repo = useRepo(Grant)
const asGranter = computed(() =>
  (repo.all() as Array<{ granter: string }>).filter((g) => g.granter === props.address)
)
const asGrantee = computed(() =>
  (repo.all() as Array<{ grantee: string }>).filter((g) => g.grantee === props.address)
)

async function refreshAsGranter() {
  if (!props.address) return
  await useAxiosRepo(Grant).api().fetchByGranter(props.address)
}
async function refreshAsGrantee() {
  if (!props.address) return
  await useAxiosRepo(Grant).api().fetchByGrantee(props.address)
}
</script>
