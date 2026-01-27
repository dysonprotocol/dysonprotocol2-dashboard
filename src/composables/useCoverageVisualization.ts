import { ref, computed } from 'vue'

export interface CoverageEntry {
  start: [line: number, col: number]
  end: [line: number, col: number]
  calls: number
  gas: number
  nodeType: string
}

export interface CoverageStats {
  totalNodes: number
  coveredNodes: number
  coveragePercent: number
  maxCalls: number
  maxGas: number
}

export type VisualizationMode = 'coverage' | 'performance' | 'off'

// Raw format from dyslang: [[lineno, col_offset, end_lineno, end_col_offset, node_type, snippet], [call_count, gas]]
type RawCoverageEntry = [[number, number, number, number, string, string], [number, number]]

export function useCoverageVisualization() {
  const coverageData = ref<CoverageEntry[]>([])
  const visualizationMode = ref<VisualizationMode>('coverage')
  const coverageSource = ref<string>('')

  const coverageStats = computed<CoverageStats | null>(() => {
    if (!coverageData.value.length) return null
    const total = coverageData.value.length
    const covered = coverageData.value.filter((e) => e.calls > 0).length
    const maxCalls = Math.max(...coverageData.value.map((e) => e.calls), 1)
    const maxGas = Math.max(...coverageData.value.map((e) => e.gas), 1)
    return {
      totalNodes: total,
      coveredNodes: covered,
      coveragePercent: Math.round((covered / total) * 100),
      maxCalls,
      maxGas,
    }
  })

  function convertCoverage(raw: RawCoverageEntry[]): CoverageEntry[] {
    if (!Array.isArray(raw)) return []
    return raw
      .filter((entry) => Array.isArray(entry) && entry.length === 2)
      .map((entry) => {
        const [[lineno, colOffset, endLineno, endColOffset, nodeType], [calls, gas]] = entry
        return {
          start: [lineno, colOffset] as [number, number],
          end: [endLineno, endColOffset] as [number, number],
          calls: calls ?? 0,
          gas: gas ?? 0,
          nodeType: nodeType ?? '',
        }
      })
  }

  function getCoverageClass(calls: number, maxCalls: number): string {
    // Use falsy check - uncovered nodes may have 0, null, or undefined
    if (!calls) return 'coverage-uncovered'
    const ratio = calls / maxCalls
    if (ratio < 0.33) return 'coverage-low'
    if (ratio < 0.66) return 'coverage-med'
    return 'coverage-high'
  }

  function getPerformanceClass(gas: number, maxGas: number): string {
    if (!gas) return ''
    const ratio = gas / maxGas
    if (ratio < 0.5) return 'perf-low'
    return 'perf-high'
  }

  function createDecorations(
    entries: CoverageEntry[],
    mode: VisualizationMode,
    monaco: any,
    isDark: boolean
  ): any[] {
    if (!entries.length || mode === 'off' || !monaco) return []

    const stats = coverageStats.value
    if (!stats) return []

    const decorations: any[] = []

    for (const entry of entries) {
      const [startLine, startCol] = entry.start
      const [endLine, endCol] = entry.end

      // Monaco uses 1-based line numbers, columns are already 0-based from Python but Monaco is 1-based
      const range = new monaco.Range(startLine, startCol + 1, endLine, endCol + 1)

      let inlineClassName: string
      let shouldDecorate = false

      if (mode === 'coverage') {
        // Only highlight uncovered nodes - covered nodes blend into the background
        // This avoids overlap issues where covered parent nodes hide uncovered children
        if (!entry.calls) {
          inlineClassName = 'coverage-uncovered'
          shouldDecorate = true
        }
      } else {
        // Performance mode: highlight high gas usage
        if (entry.gas) {
          inlineClassName = getPerformanceClass(entry.gas, stats.maxGas)
          shouldDecorate = true
        }
      }

      if (shouldDecorate && inlineClassName) {
        decorations.push({
          range,
          options: {
            inlineClassName,
            hoverMessage: {
              value:
                mode === 'coverage'
                  ? `**${entry.nodeType}**\nCalls: ${entry.calls}`
                  : `**${entry.nodeType}**\nGas: ${entry.gas}`,
            },
          },
        })
      }
    }

    return decorations
  }

  function setCoverage(rawData: RawCoverageEntry[], source: string, functionName: string) {
    const converted = convertCoverage(rawData)
    coverageData.value = converted
    coverageSource.value = functionName
    if (visualizationMode.value === 'off') {
      visualizationMode.value = 'coverage'
    }
  }

  function clearCoverage() {
    coverageData.value = []
    coverageSource.value = ''
  }

  function setVisualizationMode(mode: VisualizationMode) {
    visualizationMode.value = mode
  }

  return {
    coverageData,
    visualizationMode,
    coverageSource,
    coverageStats,
    setCoverage,
    clearCoverage,
    setVisualizationMode,
    createDecorations,
  }
}
