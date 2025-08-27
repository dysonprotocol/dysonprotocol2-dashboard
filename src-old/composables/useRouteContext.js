import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useRouteContext() {
  const route = useRoute()

  // Determine if we're in an address-specific context
  const isAddressContext = computed(() => {
    return route.path.startsWith('/address/')
  })

  // Extract current address from route if in address context
  const currentAddress = computed(() => {
    if (isAddressContext.value) {
      const pathParts = route.path.split('/')
      return pathParts[2] // /address/<address>/...
    }
    return null
  })

  // Determine current section within address context
  const currentSection = computed(() => {
    if (isAddressContext.value) {
      const pathParts = route.path.split('/')
      return pathParts[3] || 'summary' // /address/<address>/<section>
    }
    return null
  })

  // Check if we're on the main address summary page
  const isAddressSummary = computed(() => {
    return isAddressContext.value && (!currentSection.value || currentSection.value === 'summary')
  })

  return {
    isAddressContext,
    currentAddress,
    currentSection,
    isAddressSummary,
    route
  }
}
