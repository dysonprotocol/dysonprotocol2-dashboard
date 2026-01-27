<template>
  <div v-if="coverageFunctions.length > 0" class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Coverage</span>
        <Badge variant="outline">{{ coverageFunctions.length }} functions</Badge>
      </div>
      <Button
        size="sm"
        :disabled="isRunning || hasUnsavedChanges"
        @click="runAllCoverage"
      >
        {{ isRunning ? 'Running...' : 'Run Coverage' }}
      </Button>
    </div>

    <!-- Progress -->
    <div v-if="isRunning" class="text-sm text-muted-foreground">
      Running {{ currentFunctionIndex + 1 }}/{{ coverageFunctions.length }}: {{ currentFunctionName }}
    </div>

    <!-- Results -->
    <div v-if="aggregatedStats && !isRunning" class="space-y-2">
      <div class="flex items-center gap-3 text-sm">
        <Badge :variant="aggregatedStats.coveragePercent >= 80 ? 'default' : 'destructive'">
          {{ aggregatedStats.coveragePercent }}% covered
        </Badge>
        <span class="text-muted-foreground tabular-nums">
          {{ aggregatedStats.coveredNodes }}/{{ aggregatedStats.totalNodes }} nodes
        </span>
      </div>
      <!-- Mode toggle buttons -->
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          :variant="visualizationMode === 'coverage' ? 'default' : 'ghost'"
          @click="setMode('coverage')"
        >
          Coverage
        </Button>
        <Button
          size="sm"
          :variant="visualizationMode === 'performance' ? 'default' : 'ghost'"
          @click="setMode('performance')"
        >
          Gas
        </Button>
        <Button size="sm" variant="ghost" @click="clearCoverage">
          Clear
        </Button>
      </div>
      <div v-if="errors.length > 0" class="text-sm text-destructive">
        {{ errors.length }} function(s) failed
      </div>
    </div>

    <!-- Error details -->
    <div v-if="errors.length > 0 && !isRunning" class="space-y-1">
      <div v-for="err in errors" :key="err.name" class="text-xs text-destructive">
        {{ err.name }}: {{ err.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import Script from '@/orm/models/script/Script'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  functions: any[]
  address: string
  hasUnsavedChanges?: boolean
}>()

const isRunning = ref(false)
const currentFunctionIndex = ref(0)
const currentFunctionName = ref('')
const errors = ref<{ name: string; message: string }[]>([])
const aggregatedStats = ref<{
  totalNodes: number
  coveredNodes: number
  coveragePercent: number
} | null>(null)
const visualizationMode = ref<'coverage' | 'performance'>('coverage')

function setMode(mode: 'coverage' | 'performance') {
  visualizationMode.value = mode
  window.dispatchEvent(
    new CustomEvent('dyson:coverage-mode', {
      detail: { mode },
    })
  )
}

function clearCoverage() {
  aggregatedStats.value = null
  window.dispatchEvent(
    new CustomEvent('dyson:coverage-clear', {
      detail: { address: props.address },
    })
  )
}

// Filter for coverage_* functions
const coverageFunctions = computed(() => {
  const arr = Array.isArray(props.functions) ? props.functions : []
  return arr.filter((f) => f?.function_name?.startsWith('coverage_'))
})

async function runAllCoverage() {
  if (coverageFunctions.value.length === 0) return

  isRunning.value = true
  errors.value = []
  currentFunctionIndex.value = 0

  // Map to aggregate coverage: key = "startLine:startCol:endLine:endCol" -> { calls, gas }
  const coverageMap = new Map<string, { calls: number; gas: number; meta: any }>()

  for (let i = 0; i < coverageFunctions.value.length; i++) {
    const func = coverageFunctions.value[i]
    currentFunctionIndex.value = i
    currentFunctionName.value = func.function_name

    try {
      const res = await useAxiosRepo(Script)
        .api()
        .runDysonScript({
          scriptAddress: props.address,
          functionName: func.function_name,
          kwargs: '{}',
          attachedMsg: [],
          simulate: true,
          executorAddress: props.address,
        })

      if (res.scriptResponse?.result) {
        let coverageData = res.scriptResponse.result
        // Handle nested result object
        if (coverageData && typeof coverageData === 'object' && !Array.isArray(coverageData) && Array.isArray(coverageData.result)) {
          coverageData = coverageData.result
        }
        if (typeof coverageData === 'string') {
          try {
            coverageData = JSON.parse(coverageData)
          } catch {
            coverageData = null
          }
        }

        // Validate and aggregate coverage data
        if (Array.isArray(coverageData) && coverageData.length > 0 && Array.isArray(coverageData[0]) && coverageData[0].length === 2) {
          for (const entry of coverageData) {
            const [[lineno, colOffset, endLineno, endColOffset, nodeType, snippet], [calls, gas]] = entry
            const key = `${lineno}:${colOffset}:${endLineno}:${endColOffset}`
            const existing = coverageMap.get(key)
            if (existing) {
              // Aggregate: take max calls and sum gas
              existing.calls = Math.max(existing.calls, calls || 0)
              existing.gas = existing.gas + (gas || 0)
            } else {
              coverageMap.set(key, {
                calls: calls || 0,
                gas: gas || 0,
                meta: [lineno, colOffset, endLineno, endColOffset, nodeType, snippet],
              })
            }
          }
        }
      }
    } catch (err: any) {
      errors.value.push({
        name: func.function_name,
        message: err?.message || String(err),
      })
    }
  }

  // Convert aggregated map back to coverage format
  const aggregatedCoverage: any[] = []
  for (const [, value] of coverageMap) {
    aggregatedCoverage.push([value.meta, [value.calls, value.gas]])
  }

  // Calculate stats
  const totalNodes = aggregatedCoverage.length
  const coveredNodes = aggregatedCoverage.filter(([, [calls]]) => calls > 0).length
  const coveragePercent = totalNodes > 0 ? Math.round((coveredNodes / totalNodes) * 100) : 0

  aggregatedStats.value = { totalNodes, coveredNodes, coveragePercent }

  // Dispatch coverage event
  if (aggregatedCoverage.length > 0) {
    window.dispatchEvent(
      new CustomEvent('dyson:script-coverage', {
        detail: {
          address: props.address,
          functionName: `${coverageFunctions.value.length} coverage functions`,
          coverageData: aggregatedCoverage,
        },
      })
    )
  }

  isRunning.value = false
  currentFunctionName.value = ''
}
</script>
