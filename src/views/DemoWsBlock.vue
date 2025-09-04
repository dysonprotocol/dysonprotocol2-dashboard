<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">WebSocket Block Events Demo</h2>
    <form class="flex flex-col gap-2" @submit.prevent="onSubscribe">
      <div class="flex gap-2 items-center">
        <label class="w-36">Event type</label>
        <input
          v-model.trim="eventType"
          class="flex-1 border px-2 py-1 rounded"
          placeholder="coin_received"
        />
      </div>
      <div class="flex gap-2 items-start">
        <label class="w-36 mt-1">Map function</label>
        <textarea
          v-model="functionCode"
          class="flex-1 border px-2 py-1 rounded font-mono text-xs h-40"
          placeholder="// e is the CustomEvent\n// return undefined to skip\nreturn e.detail"
        />
      </div>
      <div class="flex gap-2">
        <button
          type="submit"
          class="px-3 py-1 rounded bg-blue-600 text-white"
          :disabled="!eventType"
        >
          {{ isSubscribed ? 'Resubscribe' : 'Subscribe' }}
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded bg-gray-600 text-white disabled:opacity-50"
          :disabled="!isSubscribed"
          @click="onUnsubscribe"
        >
          Unsubscribe
        </button>
        <button
          type="button"
          class="ml-auto px-3 py-1 rounded bg-amber-600 text-white"
          @click="items = []"
        >
          Clear
        </button>
      </div>
    </form>

    <div class="text-sm text-gray-600">
      Listening to: <strong>{{ currentEventType || '—' }}</strong>
    </div>

    <ul class="space-y-2">
      <li
        v-for="(it, idx) in items"
        :key="idx"
        class="border rounded p-2 font-mono text-xs whitespace-pre-wrap break-all"
      >
        {{ toJson(it) }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const eventType = ref('dysonprotocol.script.v1.EventScriptEvent')
const functionCode = ref<string>(
  `// call a function that uses dys.emit_event("my_key", my_value)
a = JSON.parse(e.detail.address)
k = JSON.parse(e.detail.key)
v = JSON.parse(e.detail.value)
return \`\${a}.\${k}=\${v}\`
`
)
const isSubscribed = ref(false)
const currentEventType = ref('')
const compiled = ref<unknown>(null)
const items = ref<unknown[]>([])

let listener: any = null

const toJson = (v: unknown) => {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function compileMapper(code: string): unknown {
  const src = String(code || '').trim()
  if (!src) return null
  try {
    return new Function('e', src) as unknown
  } catch (err) {
    console.error('[demo-ws] compile error', err)
    return null
  }
}

const onSubscribe = () => {
  if (!eventType.value) return
  // Unsubscribe old
  if (listener && currentEventType.value)
    (globalThis as any).removeEventListener(currentEventType.value, listener as any)

  currentEventType.value = eventType.value
  compiled.value = compileMapper(functionCode.value)
  if (!compiled.value) return
  listener = (e: unknown) => {
    try {
      const value = (compiled.value as any)(e)
      if (typeof value === 'undefined') return
      items.value.unshift(value)
    } catch (err) {
      console.error('[demo-ws] handler error', err)
      return
    }
    if (items.value.length > 200) items.value.pop()
  }
  ;(globalThis as any).addEventListener(currentEventType.value, listener as any)
  isSubscribed.value = true
}

const onUnsubscribe = () => {
  if (listener && currentEventType.value)
    (globalThis as any).removeEventListener(currentEventType.value, listener as any)
  listener = null
  isSubscribed.value = false
}

onBeforeUnmount(onUnsubscribe)
</script>

<style scoped></style>
