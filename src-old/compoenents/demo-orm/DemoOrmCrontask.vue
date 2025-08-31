<template>
  <h2
    id="crontask"
    class="text-xl font-semibold"
  >
    Crontask
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">
        Queries
      </h3>
      <div class="space-y-2">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Fetch Params
          </h4>
          <button
            class="btn btn-primary"
            @click="fetchParams"
          >
            Fetch
          </button>
          <div class="text-sm">
            block_gas_limit=<code>{{ params?.block_gas_limit }}</code>
          </div>
          <div
            v-if="paramsError"
            class="text-sm text-red-600"
          >
            {{ paramsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Tasks by Creator
          </h4>
          <input
            v-model="creator"
            class="input w-full"
            placeholder="creator address"
          >
          <button
            class="btn btn-primary"
            @click="fetchByCreator"
          >
            Fetch
          </button>
          <div
            v-if="byCreatorError"
            class="text-sm text-red-600"
          >
            {{ byCreatorError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Tasks by Status
          </h4>
          <input
            v-model="statusTs"
            class="input w-full"
            placeholder="status (Scheduled|Pending|Done|Failed|Expired)"
          >
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              @click="fetchByStatusTs"
            >
              By Timestamp
            </button>
            <button
              class="btn btn-primary"
              @click="fetchByStatusGas"
            >
              By Gas Price
            </button>
          </div>
          <div class="text-sm opacity-70">
            matches=<code>{{ countStatusTs || countStatusGas }}</code>
          </div>
          <div
            v-if="statusTsError"
            class="text-sm text-red-600"
          >
            {{ statusTsError }}
          </div>
          <div
            v-if="statusGasError"
            class="text-sm text-red-600"
          >
            {{ statusGasError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Task by ID
          </h4>
          <div class="flex gap-2">
            <input
              v-model="taskIdById"
              class="input w-full"
              placeholder="task id"
            >
            <button
              class="btn btn-primary"
              @click="fetchById"
            >
              Fetch
            </button>
          </div>
          <div class="text-sm">
            status=<code>{{ taskById?.status }}</code>
          </div>
          <div
            v-if="byIdError"
            class="text-sm text-red-600"
          >
            {{ byIdError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">
            Tasks All
          </h4>
          <button
            class="btn btn-primary"
            @click="fetchAll"
          >
            Init
          </button>
          <div class="text-sm">
            count=<code>{{ allCount }}</code>
          </div>
          <div
            v-if="allError"
            class="text-sm text-red-600"
          >
            {{ allError }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Create / Delete Tasks
      </h3>
      <input
        v-model="creator"
        class="input w-full"
        placeholder="creator address"
      >
      <input
        v-model="scheduled"
        class="input w-full"
        placeholder="scheduled (+1h30m or ts)"
      >
      <input
        v-model="expiry"
        class="input w-full"
        placeholder="expiry (+2h or ts)"
      >
      <input
        v-model="gasLimit"
        class="input w-full"
        placeholder="task gas limit (number)"
      >
      <input
        v-model="feeDenom"
        class="input w-full"
        placeholder="fee denom (e.g., udys)"
      >
      <input
        v-model="feeAmount"
        class="input w-full"
        placeholder="fee amount (string)"
      >
      <textarea
        v-model="msgsJson"
        class="textarea w-full"
        rows="3"
        placeholder="msgs JSON array (e.g., [{&quot;@type&quot;:&quot;/cosmos.bank.v1beta1.MsgSend&quot;,...}])"
      />
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="createTask"
        >
          Create
        </button>
        <input
          v-model="taskId"
          class="input"
          placeholder="task id"
        >
        <button
          class="btn btn-danger"
          @click="deleteTask"
        >
          Delete
        </button>
      </div>
      <div
        v-if="taskError"
        class="text-sm text-red-600"
      >
        {{ taskError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        All Tasks (in memory)
      </h3>
      <div class="text-sm opacity-70">
        count=<code>{{ allCount }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-80 overflow-auto">
        <li
          v-for="r in tasksList"
          :key="r.id"
          class="space-x-2"
        >
          <span class="font-mono">#{{ r.id }}</span>
          <span>status=<code>{{ r.status }}</code></span>
          <span>creator=<code>{{ r.creator }}</code></span>
          <span>[{{ r.msgTypes.join(', ') }}]</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import CrontaskParams from '../../orm/models/crontask/Params'
import CrontaskTask from '../../orm/models/crontask/Task'
import { useWallet } from '@/composables/useWallet'

const paramsRepo = useRepo(CrontaskParams)
const taskRepo = useRepo(CrontaskTask)
const wallet = useWallet()

const params = computed(() => {
  const list = paramsRepo.all() as Array<{
    block_gas_limit: string
  }>
  return list[0]
})

const tasks = computed(
  () =>
    taskRepo.all() as Array<{
      task_id: string
      status: string
    }>
)

const allCount = computed(() => taskRepo.all().length)
const taskIdById = ref('')
const byIdError = ref('')
const taskById = computed(() =>
  taskIdById.value ? (taskRepo.find(taskIdById.value) as { status: string } | undefined) : undefined
)
async function fetchById() {
  byIdError.value = ''
  try {
    if (!taskIdById.value) throw new Error('task id required')
    await useAxiosRepo(CrontaskTask).api().fetchByID(taskIdById.value)
  } catch (e: any) {
    console.error(e)
    byIdError.value = serializeErr(e)
  }
}

const allError = ref('')
async function fetchAll() {
  allError.value = ''
  try {
    await useAxiosRepo(CrontaskTask).api().fetchAllInit({})
  } catch (e: any) {
    console.error(e)
    allError.value = serializeErr(e)
  }
}

const statusTs = ref('')
const statusTsError = ref('')
const countStatusTs = computed(() =>
  statusTs.value ? taskRepo.where('status', statusTs.value).get().length : 0
)
async function fetchByStatusTs() {
  statusTsError.value = ''
  try {
    if (!statusTs.value) throw new Error('status required')
    await useAxiosRepo(CrontaskTask).api().fetchByStatusTimestampInit({ status: statusTs.value })
  } catch (e: any) {
    console.error(e)
    statusTsError.value = serializeErr(e)
  }
}

const statusGas = ref('')
const statusGasError = ref('')
const countStatusGas = computed(() =>
  statusGas.value ? taskRepo.where('status', statusGas.value).get().length : 0
)
async function fetchByStatusGas() {
  statusGasError.value = ''
  try {
    if (!statusGas.value) throw new Error('status required')
    await useAxiosRepo(CrontaskTask).api().fetchByStatusGasPriceInit({ status: statusGas.value })
  } catch (e: any) {
    console.error(e)
    statusGasError.value = serializeErr(e)
  }
}

const creator = ref('')
const scheduled = ref('+5s')
const expiry = ref('+10s')
const gasLimit = ref('100000')
const feeDenom = ref('udys')
const feeAmount = ref('1')
const msgsJson = ref(
  JSON.stringify(
    [
      {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: '...',
        to_address: '...',
        amount: [{ denom: 'udys', amount: '1' }],
      },
    ],
    null,
    2
  )
)
const taskId = ref('')

const paramsError = ref('')
const byCreatorError = ref('')
const taskError = ref('')

const tasksList = computed(() =>
  taskRepo.all().map((t: any) => ({
    id: t.task_id,
    status: t.status,
    creator: t.creator,
    msgTypes: Array.isArray(t.msgs)
      ? t.msgs
          .map((m: any) => (m && typeof m === 'object' ? m['@type'] : undefined))
          .filter((x: any) => typeof x === 'string' && x.length > 0)
      : [],
  }))
)

async function fetchParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(CrontaskParams).api().fetch()
  } catch (e: any) {
    console.error(e)
    paramsError.value = serializeErr(e)
  }
}

async function fetchByCreator() {
  byCreatorError.value = ''
  try {
    if (!creator.value) throw new Error('creator required')
    await useAxiosRepo(CrontaskTask).api().fetchByCreatorInit({ creator: creator.value })
  } catch (e: any) {
    console.error(e)
    byCreatorError.value = serializeErr(e)
  }
}

async function createTask() {
  taskError.value = ''
  try {
    const msgs = JSON.parse(msgsJson.value || '[]')

    await useAxiosRepo(CrontaskTask)
      .api()
      .createTask({
        creator: creator.value,
        scheduled_timestamp: scheduled.value,
        expiry_timestamp: expiry.value,
        task_gas_limit: gasLimit.value,
        task_gas_fee: { denom: feeDenom.value, amount: feeAmount.value },
        msgs,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    console.error(e)
    taskError.value = serializeErr(e)
  }
}

async function deleteTask() {
  taskError.value = ''
  try {
    await useAxiosRepo(CrontaskTask)
      .api()
      .deleteTask({
        creator: creator.value,
        task_id: taskId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    console.error(e)
    taskError.value = serializeErr(e)
  }
}

function serializeErr(e: any) {
  return JSON.stringify(
    {
      message: e?.message || String(e),
      data: e?.response?.data,
      code: e?.code,
      status: e?.response?.status,
      method: e?.config?.method,
      url: e?.config?.url,
    },
    null,
    2
  )
}
</script>
