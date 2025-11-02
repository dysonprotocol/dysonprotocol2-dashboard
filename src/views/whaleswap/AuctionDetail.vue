<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Card, CardContent } from '@/components/ui/card'

const route = useRoute()
const auctionId = computed(() => String(route.params.auctionId || ''))
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-2xl font-semibold">Auction #{{ auctionId }}</h2>
    <Card>
      <CardContent class="p-8">
        <div class="text-center text-muted-foreground">
          <p>Auction detail view coming soon.</p>
          <p class="text-sm mt-2">Migration to Connect-ES in progress.</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
