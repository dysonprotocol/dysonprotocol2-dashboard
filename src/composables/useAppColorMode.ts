import { computed } from 'vue'
import { useColorMode, usePreferredDark } from '@vueuse/core'

export function useAppColorMode() {
  const mode = useColorMode({
    attribute: 'class',
    selector: 'html',
    storageKey: 'vueuse-color-scheme',
    initialValue: 'auto',
    emitAuto: true,
  })
  const prefersDark = usePreferredDark()

  const isDark = computed(
    () => mode.value === 'dark' || (mode.value === 'auto' && prefersDark.value)
  )

  return { mode, prefersDark, isDark }
}

export type AppColorMode = ReturnType<typeof useAppColorMode>
