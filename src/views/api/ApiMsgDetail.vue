<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Redirect to main API page - detail views are now inline
onMounted(() => {
  const operationId = route.params.msgType as string
  // Redirect to main page with hash to scroll to endpoint
  router.replace({ path: '/docs/api', hash: `#${operationId}` })
})
</script>

<template>
  <div class="w-full px-4 py-8 text-center text-muted-foreground">
    Redirecting to API Explorer...
  </div>
</template>
