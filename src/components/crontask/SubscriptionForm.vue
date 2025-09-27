<template>
  <div class="">
    <h3 class="font-semibold mb-3">Create subscription</h3>
    <form class="grid gap-3" @submit.prevent="onCreate">
      <div class="flex flex-col-2 gap-4">
        <fieldset class="fieldset border-base-300 rounded-box max-w-md border p-4">
          <legend class="fieldset-legend">Subscription parameters</legend>

          <label class="label">filter (GJSON)</label>
          <Input
            v-model.trim="form.filter"
            type="text"
            class="w-full"
            placeholder='e.g. #(attributes.value.foo=="bar")'
          />

          <label class="label">script_address</label>
          <Input
            v-model.trim="form.script_address"
            type="text"
            class="w-full"
            placeholder="dyson1..."
          />

          <label class="label">function</label>
          <Input v-model.trim="form.fn" type="text" class="w-full" placeholder="handle_event" />

          <label class="label">args (JSON array string)</label>
          <Textarea
            ref="argsTextarea"
            v-model="form.args"
            class="w-full font-mono"
            rows="4"
            placeholder="[]"
          />

          <label class="label">kwargs (JSON object string)</label>
          <Textarea
            ref="kwargsTextarea"
            v-model="form.kwargs"
            class="w-full font-mono"
            rows="4"
            placeholder="{}"
          />

          <label class="label">task_gas_limit</label>
          <Input
            v-model.trim="form.gasLimit"
            type="text"
            class="w-full"
            placeholder="e.g. 500000"
          />

          <label class="label">task_gas_fee</label>
          <div class="grid gap-2">
            <AmountDenomSelector
              v-model:base="form.feeBase"
              :base-denoms="['udys']"
              default-base-denom="udys"
            />
          </div>

          <div class="flex items-center gap-2 pt-2">
            <Button size="sm" type="submit" :disabled="isCreating">{{
              isCreating ? 'Creating…' : 'Create Subscription'
            }}</Button>
            <span v-if="createError" class="text-error text-sm">{{ createError }}</span>
            <span v-if="createOk" class="text-success text-sm">Created</span>
          </div>
        </fieldset>

        <fieldset class="fieldset border-base-300 rounded-box border p-4">
          <legend class="fieldset-legend">Filter demo</legend>

          <label class="label">Block height</label>
          <form class="flex items-center gap-2" @submit.prevent="onLoadBlock">
            <Input v-model.trim="demoHeight" type="text" class="w-40" placeholder="e.g. 2208" />
            <Button size="sm" type="submit" :disabled="demoLoading || !demoHeight">
              {{ demoLoading ? 'Loading…' : 'Load block' }}
            </Button>
            <span v-if="demoError" class="text-error text-xs">{{ demoError }}</span>
          </form>

          <div v-if="demoNormalizedJson" class="mt-3">
            <div class="label flex items-center gap-2">
              <span>Normalized events</span>
              <Button type="button" :disabled="!demoNormalizedJson" @click="onCopyNormalized">
                <Clipboard />
                Copy
              </Button>
            </div>
            <pre
              ref="normPre"
              @click="selectNormalized"
              class="w-full whitespace-pre-wrap break-words text-xs max-h-72 overflow-auto border rounded p-2 cursor-text"
              >{{ demoNormalizedJson }}</pre
            >
          </div>
          <div class="text-xs opacity-70">
            <div class="mb-2">Notes:</div>
            <ul class="list-disc pl-5 space-y-1">
              <li>filter uses GJSON against normalized block events</li>
              <li>args must be a JSON array string, kwargs a JSON object string</li>
              <li>task_gas_price is derived from fee/limit</li>
            </ul>
          </div>
        </fieldset>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useAxiosRepo } from '@pinia-orm/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import CrontaskSubscription from '@/orm/models/crontask/Subscription'
import { useWallet } from '@/composables/useWallet'
import { Clipboard } from 'lucide-vue-next'

const props = defineProps<{ creator: string }>()

const { sendMsg } = useWallet()
const api = useAxiosRepo(CrontaskSubscription).api()

const form = ref({
  filter: '',
  script_address: '',
  fn: '',
  args: '[]',
  kwargs: '{}',
  gasLimit: '1500000',
  feeBase: { amount: '1', denom: 'udys' },
  memo: '',
})

const isCreating = ref(false)
const createError = ref('')
const createOk = ref(false)

async function onCreate() {
  if (!props.creator) return
  isCreating.value = true
  createError.value = ''
  createOk.value = false
  try {
    const filter = String(form.value.filter || '').trim()
    if (!filter) throw new Error('filter is required')
    const script_address = String(form.value.script_address || '').trim()
    if (!script_address) throw new Error('script_address is required')
    const fn = String(form.value.fn || '').trim()
    if (!fn) throw new Error('function is required')

    const argsRaw = String(form.value.args || '').trim() || '[]'
    const kwargsRaw = String(form.value.kwargs || '').trim() || '{}'
    // Validate JSON shapes (send as strings)
    try {
      const parsedArgs = JSON.parse(argsRaw)
      if (!Array.isArray(parsedArgs)) throw new Error('args must be a JSON array')
    } catch {
      throw new Error('Invalid JSON for args: must be an array')
    }
    try {
      const parsedKw = JSON.parse(kwargsRaw)
      if (parsedKw == null || typeof parsedKw !== 'object' || Array.isArray(parsedKw))
        throw new Error('kwargs must be a JSON object')
    } catch {
      throw new Error('Invalid JSON for kwargs: must be an object')
    }

    const res = await api.createSubscription({
      creator: props.creator,
      filter,
      script_address,
      function: fn,
      args: argsRaw,
      kwargs: kwargsRaw,
      task_gas_limit: String(form.value.gasLimit || '500000'),
      task_gas_fee: {
        amount: String(form.value.feeBase?.amount || '0'),
        denom: String(form.value.feeBase?.denom || 'udys'),
      },
      wallet: { sendMsg },
      gasLimit: 'auto',
      memo: form.value.memo,
    })
    if (!res?.success) throw new Error('Broadcast failed')
    createOk.value = true
    emit('created')
  } catch (err: any) {
    console.error(err)
    createError.value = err?.message || String(err)
  } finally {
    isCreating.value = false
  }
}

const rawArgs = computed({
  get: () => form.value.args,
  set: (v: string) => (form.value.args = v),
})
const rawKwargs = computed({
  get: () => form.value.kwargs,
  set: (v: string) => (form.value.kwargs = v),
})
const { textarea: argsTextarea } = useTextareaAutosize({ input: rawArgs })
const { textarea: kwargsTextarea } = useTextareaAutosize({ input: rawKwargs })

const emit = defineEmits(['created'])

// --- Filter demo state ---
const demoHeight = ref('')
const demoLoading = ref(false)
const demoError = ref('')
const demoNormalizedJson = ref('')
const normPre = ref(null)

async function onLoadBlock() {
  demoError.value = ''
  demoNormalizedJson.value = ''
  const h = String(demoHeight.value || '').trim()
  if (!/^\d+$/.test(h)) {
    demoError.value = 'Enter a valid height'
    return
  }
  demoLoading.value = true
  try {
    const res = await fetch(`/rpc/block_results?height=${encodeURIComponent(h)}`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    const result = data?.result || {}
    const finalize = Array.isArray(result?.finalize_block_events)
      ? result.finalize_block_events
      : []
    const txs = Array.isArray(result?.txs_results) ? result.txs_results : []
    const txEvents = txs.flatMap((t: any) => (Array.isArray(t?.events) ? t.events : []))
    const events = [...finalize, ...txEvents]

    const normalized = events.map((e: any) => normalizeEvent(e))
    demoNormalizedJson.value = JSON.stringify(normalized, null, 2)
  } catch (err: any) {
    console.error(err)
    demoError.value = err?.message || String(err)
  } finally {
    demoLoading.value = false
  }
}

function normalizeEvent(event: RpcEvent): NormalizedEvent {
  const attrs: Record<string, any> = {}
  const list = Array.isArray(event?.attributes) ? event.attributes : []
  for (const a of list) attrs[a?.key ?? ''] = parseValue(String(a?.value ?? ''))
  delete attrs['']
  return { type: String(event?.type || ''), attributes: attrs }
}

function parseValue(raw: string): any {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const p = tryJsonParse(raw)
    if (p.ok) return deepParse(p.value)
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const p = tryJsonParse(raw)
    if (p.ok) return deepParse(p.value as string)
  }
  const p2 = tryJsonParse(raw)
  if (p2.ok) return deepParse(p2.value)
  return raw
}

function deepParse(v: any): any {
  if (typeof v === 'string') {
    const t = v.trim()
    if (t.startsWith('{') || t.startsWith('[')) {
      const p = tryJsonParse(v)
      return p.ok ? deepParse(p.value) : v
    }
    return v
  }
  if (Array.isArray(v)) return v.map((x) => deepParse(x))
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {}
    for (const k in v) out[k] = deepParse(v[k])
    return out
  }
  return v
}

function tryJsonParse(input: string): { ok: boolean; value?: any } {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch {
    return { ok: false }
  }
}

async function onCopyNormalized() {
  const text = demoNormalizedJson.value
  if (!text) return
  const nav: any = (globalThis as any).navigator
  if (nav?.clipboard?.writeText) await nav.clipboard.writeText(text)
}

function selectNormalized() {
  const el = normPre.value
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
}

interface RpcAttribute {
  key: string
  value: string
  index?: boolean
}
interface RpcEvent {
  type: string
  attributes: RpcAttribute[]
}
interface NormalizedEvent {
  type: string
  attributes: Record<string, any>
}
</script>
