<template>
  <div class="">
    <div class="grid gap-2 md:grid-cols-3">
      <input
        v-model="functionNameModel"
        class="input w-full"
        placeholder="function name"
      >
      <input
        v-model="argsModel"
        class="input w-full"
        placeholder="args JSON []"
      >
      <input
        v-model="kwargsModel"
        class="input w-full"
        placeholder="kwargs JSON {}"
      >
    </div>
    <div class="flex gap-2">
      <button
        class="btn btn-primary"
        @click="callFunction"
      >
        Call
      </button>
    </div>
    <div class="text-xs opacity-70">
      result=<code class="break-words">{{ result }}</code>
    </div>
    <div
      v-if="error"
      class="text-sm text-red-600"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import Script from '@/orm/models/script/Script'

const props = defineProps<{ address: string; functionName?: string }>()

const functionNameModel = ref(props.functionName || '')
const argsModel = ref('[]')
const kwargsModel = ref('{}')
const result = ref('')
const error = ref('')

async function callFunction() {
  error.value = ''
  result.value = ''
  if (!props.address || !functionNameModel.value.trim()) return
  try {
    const args = JSON.parse(argsModel.value || '[]')
    const kwargs = JSON.parse(kwargsModel.value || '{}')
    result.value = await useAxiosRepo(Script).api().run({
      executor_address: props.address,
      script_address: props.address,
      function_name: functionNameModel.value,
      args,
      kwargs,
    })
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  }
}

watchEffect(() => {
  functionNameModel.value = props.functionName || ''
})
</script>
