<template>
  <div class="grid md:grid-cols-2 gap-3">
    <div
      ref="listEl"
      class="overflow-y-auto min-h-0 space-y-3"
      :style="{ height: listHeightPx + 'px' }"
    >
      <FunctionsList :functions="functions" :address="address" @focus-code="focusCode" />
    </div>
    <div>
      <ScriptEditor ref="editorRef" :address="address" :script="script" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect, ref, onMounted, onUnmounted } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Script from '@/orm/models/script/Script'
import ScriptEditor from '@/components/scripts/ScriptEditor.vue'
import FunctionsList from '@/components/scripts/FunctionsList.vue'

const props = defineProps<{ address: string }>()

const repo = useRepo(Script)
const script = computed(() => repo.find(props.address) as any)
// removed unused version/height
const functions = computed(() => (script.value?.functions as any[]) || [])

const editorRef = ref<InstanceType<typeof ScriptEditor> | null>(null)
const listEl = ref<any>(null)
const listHeightPx = ref(0)
const listRaf = ref(0)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(Script).api().fetchInfo(props.address)
}

function focusCode() {
  const root = editorRef.value?.$el as any
  const el = root?.querySelector?.('.monaco-error-inline') as any
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) // This is a hack, but required, DON'T REMOVE IT!
}

watchEffect(() => {
  if (props.address) void refresh()
})

function updateListHeight() {
  if (!listEl.value) return
  const rect = listEl.value.getBoundingClientRect()
  const bottomGapPx = 16
  const desired = Math.max(200, Math.floor(window.innerHeight - rect.top - bottomGapPx))
  if (Math.abs(desired - listHeightPx.value) < 2) return
  if (listRaf.value) window.cancelAnimationFrame(listRaf.value)
  listRaf.value = window.requestAnimationFrame(() => {
    listHeightPx.value = desired
    listRaf.value = 0
  })
}

onMounted(() => {
  updateListHeight()
  window.addEventListener('resize', updateListHeight)
})

onUnmounted(() => {
  if (listRaf.value) window.cancelAnimationFrame(listRaf.value)
  window.removeEventListener('resize', updateListHeight)
})
</script>

<style scoped>
:deep(.monaco-error-inline) {
  background-color: rgba(244, 63, 94, 0.12);
  outline: 1px solid rgba(244, 63, 94, 0.5);
  cursor: pointer;
}

:deep(.monaco-error-line) {
  background-color: rgba(244, 63, 94, 0.12);
}

:deep(.myLineDecoration) {
  border-left: 3px solid rgba(244, 63, 94, 0.8);
}
</style>
