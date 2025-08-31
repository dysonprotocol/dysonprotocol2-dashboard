<template>
  <h2
    id="base"
    class="text-xl font-semibold"
  >
    Base
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Base: Node Service
      </h3>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="loadNodeConfig"
        >
          Load Config
        </button>
      </div>
      <div class="text-sm">
        <div>
          minimum_gas_price: <code>{{ nodeConfig?.minimum_gas_price }}</code>
        </div>
        <div>
          pruning_keep_recent: <code>{{ nodeConfig?.pruning_keep_recent }}</code>
        </div>
        <div>
          pruning_interval: <code>{{ nodeConfig?.pruning_interval }}</code>
        </div>
        <div>
          halt_height: <code>{{ nodeConfig?.halt_height }}</code>
        </div>
      </div>
      <button
        class="btn btn-primary"
        @click="loadNodeStatus"
      >
        Load Status
      </button>

      <div class="text-sm">
        <div>
          height: <code>{{ nodeStatus?.height }}</code>
        </div>
        <div>
          timestamp: <code>{{ nodeStatus?.timestamp }}</code>
        </div>
        <div>
          app_hash: <code>{{ nodeStatus?.app_hash }}</code>
        </div>
        <div>
          validator_hash: <code>{{ nodeStatus?.validator_hash }}</code>
        </div>
      </div>
      <div
        v-if="nodeError"
        class="text-sm text-red-600"
      >
        {{ nodeError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Base: Tendermint Advanced
      </h3>
      <form
        class="space-y-2"
        @submit.prevent="loadBlockByHeight"
      >
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            blocks/{height}
          </legend>
          <div class="flex gap-2">
            <input
              v-model="tmHeight"
              class="input w-full"
              placeholder="height"
            >
            <button
              class="btn btn-primary"
              type="submit"
            >
              Load Block
            </button>
            <button
              class="btn btn-secondary"
              type="button"
              @click="loadLatestBlock"
            >
              Load Latest
            </button>
          </div>
          <div class="text-sm">
            h=<code>{{ latestBlock?.height }}</code> hash=<code>{{ latestBlock?.hash }}</code>
          </div>
          <div
            v-if="tmBlockError"
            class="text-sm text-red-600"
          >
            {{ tmBlockError }}
          </div>
        </fieldset>
      </form>
      <form
        class="space-y-2"
        @submit.prevent="loadValsetByHeight"
      >
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            validatorsets/{height}
          </legend>
          <div class="flex gap-2">
            <input
              v-model="tmValsetHeight"
              class="input w-full"
              placeholder="height"
            >
            <button
              class="btn btn-primary"
              type="submit"
            >
              Load Valset
            </button>
            <button
              class="btn btn-secondary"
              type="button"
              @click="loadLatestValset"
            >
              Load Latest
            </button>
          </div>
          <div class="text-sm">
            height=<code>{{ valsetHeight }}</code> count=<code>{{ valsetByHeight.length }}</code>
          </div>
          <div
            v-if="tmValsetError"
            class="text-sm text-red-600"
          >
            {{ tmValsetError }}
          </div>
        </fieldset>
      </form>
      <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto mt-2">
        <li
          v-for="v in valsetByHeight"
          :key="v.height + ':' + v.address"
        >
          <span class="font-mono">{{ v.address }}</span> — power:
          <code>{{ v.voting_power }}</code>
        </li>
      </ul>
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold opacity-70">
          syncing, node_info
        </legend>
        <div class="flex gap-2">
          <button
            class="btn btn-primary"
            @click="loadSyncing"
          >
            Syncing
          </button>
          <button
            class="btn btn-primary"
            @click="loadTmNodeInfo"
          >
            Node Info
          </button>
        </div>
        <div class="text-sm">
          syncing=<code>{{ syncing?.syncing }}</code>
        </div>
        <div class="text-sm">
          app=<code>{{ tmNodeInfo?.app_name }}</code> sdk=<code>{{
            tmNodeInfo?.cosmos_sdk_version
          }}</code>
        </div>
        <div
          v-if="tmMiscError"
          class="text-sm text-red-600"
        >
          {{ tmMiscError }}
        </div>
      </fieldset>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Base: Reflection
      </h3>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="loadInterfaces"
        >
          List Interfaces
        </button>
        <input
          v-model="ifaceName"
          class="input w-full"
          placeholder="interface fullname"
        >
        <button
          class="btn btn-primary"
          @click="loadImplementations"
        >
          List Implementations
        </button>
      </div>

      <div>
        <h4 class="font-semibold">
          Interfaces
        </h4>
        <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
          <li
            v-for="i in interfaces"
            :key="i.name"
          >
            <code>{{ i.name }}</code>
          </li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold">
          Implementations
        </h4>
        <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
          <li
            v-for="t in implementations"
            :key="t.type_url"
          >
            <code>{{ t.type_url }}</code>
          </li>
        </ul>
      </div>

      <div
        v-if="reflError"
        class="text-sm text-red-600"
      >
        {{ reflError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NodeStatus, { NodeConfig } from '@/orm/models/base/NodeService'
import LatestBlock, {
  LatestValidatorSet as LatestValset,
  ValidatorSetByHeight,
  Syncing,
  NodeInfo as TmNodeInfo,
} from '@/orm/models/base/TendermintService'
import ListAllInterfaces, {
  ListImplementations as ReflImpls,
} from '@/orm/models/base/ReflectionService'

const nodeConfigRepo = useRepo(NodeConfig)
const nodeStatusRepo = useRepo(NodeStatus)
const latestBlockRepo = useRepo(LatestBlock)
const valsetByHeightRepo = useRepo(ValidatorSetByHeight)
const reflInterfacesRepo = useRepo(ListAllInterfaces)
const reflImplsRepo = useRepo(ReflImpls)
const syncingRepo = useRepo(Syncing)
const tmNodeInfoRepo = useRepo(TmNodeInfo)

const nodeConfig = computed(() => nodeConfigRepo.first())
const nodeStatus = computed(() => nodeStatusRepo.first())
const latestBlock = computed(() => {
  const list = latestBlockRepo.all()
  return list.length ? list[list.length - 1] : undefined
})
const valsetByHeight = computed(() => {
  const list = valsetByHeightRepo.all()
  if (!list.length) return []
  const latestHeight = list
    .map((v) => Number(v.height))
    .filter((h) => !Number.isNaN(h))
    .reduce((a, b) => (a > b ? a : b), Number.NEGATIVE_INFINITY)
  if (!Number.isFinite(latestHeight)) return list
  return list.filter((v) => Number(v.height) === latestHeight)
})
const valsetHeight = computed(() =>
  valsetByHeight.value[0]?.height ? String(valsetByHeight.value[0].height) : ''
)
const interfaces = computed(() => reflInterfacesRepo.all())
const implementations = computed(() => reflImplsRepo.all())
const syncing = computed(() => syncingRepo.first())
const tmNodeInfo = computed(() => tmNodeInfoRepo.first())

const nodeError = ref('')
const tmHeight = ref('')
const tmValsetHeight = ref('')
const tmBlockError = ref('')
const tmValsetError = ref('')
const tmMiscError = ref('')
const ifaceName = ref('cosmos.base.v1beta1.Msg')
const reflError = ref('')

async function loadNodeConfig() {
  nodeError.value = ''
  try {
    await useAxiosRepo(NodeConfig).api().fetch()
  } catch (e: any) {
    console.error(e)
    nodeError.value = e?.message || String(e)
  }
}
async function loadNodeStatus() {
  nodeError.value = ''
  try {
    await useAxiosRepo(NodeStatus).api().fetch()
  } catch (e: any) {
    console.error(e)
    nodeError.value = e?.message || String(e)
  }
}
async function loadBlockByHeight() {
  tmBlockError.value = ''
  try {
    if (!tmHeight.value) return
    if (tmHeight.value === 'latest') {
      await useAxiosRepo(LatestBlock).api().fetch()
      return
    }
    await useAxiosRepo(LatestBlock).api().fetchByHeight(tmHeight.value)
  } catch (e: any) {
    console.error(e)
    tmBlockError.value = e?.message || String(e)
  }
}
async function loadLatestBlock() {
  tmBlockError.value = ''
  try {
    await useAxiosRepo(LatestBlock).api().fetch()
  } catch (e: any) {
    console.error(e)
    tmBlockError.value = e?.message || String(e)
  }
}
async function loadValsetByHeight() {
  tmValsetError.value = ''
  try {
    if (!tmValsetHeight.value) return
    if (tmValsetHeight.value === 'latest') {
      await useAxiosRepo(ValidatorSetByHeight).api().fetch('latest')
      return
    }
    await useAxiosRepo(ValidatorSetByHeight).api().fetch(tmValsetHeight.value)
  } catch (e: any) {
    console.error(e)
    tmValsetError.value = e?.message || String(e)
  }
}
async function loadLatestValset() {
  tmValsetError.value = ''
  try {
    await useAxiosRepo(ValidatorSetByHeight).api().fetch('latest')
  } catch (e: any) {
    console.error(e)
    tmValsetError.value = e?.message || String(e)
  }
}
async function loadSyncing() {
  tmMiscError.value = ''
  try {
    await useAxiosRepo(Syncing).api().fetch()
  } catch (e: any) {
    console.error(e)
    tmMiscError.value = e?.message || String(e)
  }
}
async function loadTmNodeInfo() {
  tmMiscError.value = ''
  try {
    await useAxiosRepo(TmNodeInfo).api().fetch()
  } catch (e: any) {
    console.error(e)
    tmMiscError.value = e?.message || String(e)
  }
}
async function loadInterfaces() {
  reflError.value = ''
  try {
    await useAxiosRepo(ListAllInterfaces).api().fetch()
  } catch (e: any) {
    console.error(e)
    reflError.value = e?.message || String(e)
  }
}
async function loadImplementations() {
  reflError.value = ''
  try {
    if (!ifaceName.value) return
    await useAxiosRepo(ReflImpls).api().fetch(ifaceName.value)
  } catch (e: any) {
    console.error(e)
    reflError.value = e?.message || String(e)
  }
}
</script>
