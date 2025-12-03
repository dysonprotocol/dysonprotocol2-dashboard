<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-2xl">Connect Your Wallets</CardTitle>
      <CardDescription> Connect to both chains to transfer and swap tokens </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Keplr not installed warning -->
      <Alert v-if="!keplrAvailable" variant="destructive">
        <AlertTriangle class="size-4" />
        <AlertTitle>Keplr Required</AlertTitle>
        <AlertDescription>
          <div class="text-muted-foreground">
            Please install the
            <a href="https://www.keplr.app/" target="_blank" class="underline font-medium"
              >Keplr wallet extension</a
            >
            to continue.
          </div>
        </AlertDescription>
      </Alert>

      <!-- Chain connection cards -->
      <div class="grid gap-4 sm:grid-cols-2" :class="{ 'opacity-50': !keplrAvailable }">
        <!-- Old Chain -->
        <div
          class="rounded-lg border p-4 space-y-3"
          :class="{
            'border-green-500': oldChainConnected,
            'border-yellow-500': keplrAvailable && !oldChainConnected,
          }"
        >
          <div class="flex items-center gap-2">
            <span class="iconify lucide--link text-muted-foreground" />
            <span class="font-medium">Old Chain</span>
            <Badge v-if="oldChainConnected" variant="default" class="ml-auto">
              <span class="iconify lucide--check mr-1" />
              Connected
            </Badge>
            <Badge v-else variant="secondary" class="ml-auto"> Not Connected </Badge>
          </div>

          <div class="text-sm text-muted-foreground space-y-0.5">
            <div>Dyson Protocol</div>
            <div>Chain ID: dyson-mainnet-01</div>
          </div>

          <div v-if="oldChainConnected" class="bg-muted p-2 rounded">
            <AddressDisplay :address="oldAddress" :truncate="6" />
          </div>

          <Button
            v-if="!oldChainConnected"
            class="w-full"
            :disabled="!keplrAvailable"
            @click="$emit('connect-old')"
          >
            <span class="iconify lucide--wallet mr-2" />
            Connect Keplr
          </Button>
          <Button v-else variant="outline" class="w-full" @click="$emit('disconnect-old')">
            Disconnect
          </Button>
        </div>

        <!-- New Chain -->
        <div
          class="rounded-lg border p-4 space-y-3"
          :class="{
            'border-green-500': newChainConnected,
            'border-yellow-500': keplrAvailable && !newChainConnected,
          }"
        >
          <div class="flex items-center gap-2">
            <span class="iconify lucide--link text-muted-foreground" />
            <span class="font-medium">New Chain</span>
            <Badge v-if="newChainConnected" variant="default" class="ml-auto">
              <span class="iconify lucide--check mr-1" />
              Connected
            </Badge>
            <Badge v-else variant="secondary" class="ml-auto"> Not Connected </Badge>
          </div>

          <div class="text-sm text-muted-foreground space-y-0.5">
            <div>Dyson Protocol 2</div>
            <div>Chain ID: dysonprotocol-testnet-2</div>
          </div>

          <div v-if="newChainConnected" class="bg-muted p-2 rounded">
            <AddressDisplay :address="newAddress" :truncate="6" />
          </div>

          <Button
            v-if="!newChainConnected"
            class="w-full"
            :disabled="!keplrAvailable"
            @click="$emit('connect-new')"
          >
            <span class="iconify lucide--wallet mr-2" />
            Connect Keplr
          </Button>
          <Button v-else variant="outline" class="w-full" @click="$emit('disconnect-new')">
            Disconnect
          </Button>
        </div>
      </div>

      <!-- Ready to proceed -->
      <Button
        class="w-full"
        size="lg"
        :disabled="!oldChainConnected || !newChainConnected"
        @click="$emit('go-to-transfer')"
      >
        <span class="iconify lucide--send mr-2" />
        Go to Transfer Step
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-vue-next'
import AddressDisplay from '@/components/AddressDisplay.vue'

defineProps<{
  oldChainConnected: boolean
  newChainConnected: boolean
  oldAddress: string
  newAddress: string
}>()

defineEmits<{
  'connect-old': []
  'connect-new': []
  'disconnect-old': []
  'disconnect-new': []
  'go-to-transfer': []
}>()

const keplrAvailable = ref(false)

onMounted(() => {
  keplrAvailable.value = typeof window !== 'undefined' && !!window.keplr
})
</script>
