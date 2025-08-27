<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold">Vue Query Demo</h1>
    <form class="grid gap-3 max-w-2xl" @submit.prevent>
      <label class="grid gap-1">
        <span class="text-sm opacity-70">Endpoint path template</span>
        <input
          v-model.trim="pathTemplate"
          type="text"
          class="input input-bordered"
          placeholder="/cosmos/bank/v1beta1/balances/{address}/by_denom"
        />
      </label>

      <div class="grid gap-2">
        <label class="grid gap-1">
          <span class="text-sm opacity-70">Advanced params (JSON object)</span>
          <textarea
            v-model="rawParams"
            class="textarea textarea-bordered w-full h-40"
            placeholder='{"owner":"dys2...","limit":50}'
          ></textarea>
        </label>
      </div>
    </form>

    <div class="text-sm opacity-70">REST Base: {{ apiBase }}</div>

    <div class="flex items-center gap-2">
      <button class="btn btn-primary" @click="refetch" :disabled="isLoading">Query</button>
      <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
      <span v-if="isError" class="text-error">Error: {{ errorMessage }}</span>
    </div>

    <pre
      v-if="isError"
      class="p-3 rounded border border-error text-error overflow-auto max-h-[60vh]"
    ><code>{{ errorOut }}</code></pre>
    <pre
      v-else
      class="p-3 rounded border overflow-auto max-h-[60vh]"
    ><code>{{ yamlOut }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { stringify as toYAML } from 'yaml'
import { useRestResource } from '@/composables/useRestResource'

const apiBase = computed(() =>
  typeof window !== 'undefined' && typeof window.resolveRestUrl === 'function'
    ? window.resolveRestUrl()
    : ''
)

const pathTemplate = useStorage(
  'demoVueQuery.pathTemplate',
  '/cosmos/bank/v1beta1/balances/{address}/by_denom'
)
const rawParams = useStorage('demoVueQuery.paramsJson', '')

const parsedParams = computed(() => {
  const map = {}
  const raw = String(rawParams.value || '').trim()
  if (raw) {
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) Object.assign(map, obj)
    } catch {}
  }
  return map
})

const enabled = computed(() => Boolean(apiBase.value && pathTemplate.value))
const { data, isError, failureReason, isLoading, url, refetch } = useRestResource(
  pathTemplate,
  parsedParams,
  {
    enabled,
    apiBase,
  }
)

const errorMessage = computed(() => {
  const e = failureReason.value as any
  if (!e) return ''
  if (e.isAxiosError) {
    const msg = e.response?.data?.message ?? e.response?.statusText ?? e.message
    return typeof msg === 'string' ? msg : JSON.stringify(msg)
  }
  const msg = e?.message ?? e?.error
  if (typeof msg === 'string') return msg
  if (typeof e === 'object') return JSON.stringify(e)
  return String(e)
})

const errorDetails = computed(() => {
  const e = failureReason.value
  if (!e) return null
  const isAxios = e && e.isAxiosError
  if (isAxios) {
    return {
      message: e.message,
      status: e.response?.status,
      statusText: e.response?.statusText,
      url: e.config?.url,
      data: e.response?.data,
    }
  }
  return { message: e?.message || String(e) }
})

const yamlOut = computed(() => {
  try {
    return data.value ? toYAML(data.value) : '# No data'
  } catch (e) {
    return `# YAML error: ${e?.message || e}`
  }
})

const errorOut = computed(() => {
  try {
    return errorDetails.value ? toYAML(errorDetails.value) : '# No error'
  } catch (e) {
    return `# YAML error: ${e?.message || e}`
  }
})
// removed example helper
</script>

<style scoped></style>
