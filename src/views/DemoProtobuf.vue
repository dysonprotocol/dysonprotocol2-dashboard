<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { getProtobufRegistry } from '@/utils/protobufRegistry'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Any } from '@bufbuild/protobuf'

const loading = ref(true)
const error = ref<string>('')
const jsonInput = useStorage<string>('demo.protobuf.jsonInput', '{}')
const binaryHex = ref<string>('')
const binaryBase64 = ref<string>('')
const packedTypeUrl = ref<string>('')
const anyHex = ref<string>('')
const anyBase64 = ref<string>('')

const jsonError = ref<string>('')
const isSyncing = ref(false)

;(async () => {
  try {
    const reg = await getProtobufRegistry()
    // warm registry
    void reg
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})()

function hexToBytes(input: string): Uint8Array {
  const hex = (input || '').trim().replace(/[\s\r\n]+/g, '')
  if (hex.length === 0) return new Uint8Array(0)
  if (hex.length % 2 !== 0) throw new Error('Hex string must have even length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16)
    if (Number.isNaN(byte)) throw new Error('Invalid hex content')
    out[i / 2] = byte
  }
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return ''
  const g = globalThis as typeof globalThis & { Buffer?: any }
  if (g.btoa) {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return g.btoa(binary)
  }
  if (g.Buffer && typeof g.Buffer.from === 'function')
    return g.Buffer.from(bytes).toString('base64')
  throw new Error('No base64 encoder available in this environment')
}

function base64ToBytes(input: string): Uint8Array {
  const b64 = (input || '').trim().replace(/[\s\r\n]+/g, '')
  if (b64.length === 0) return new Uint8Array(0)
  const g = globalThis as typeof globalThis & { Buffer?: any }
  if (g.atob) {
    const binary = g.atob(b64)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xff
    return out
  }
  if (g.Buffer && typeof g.Buffer.from === 'function')
    return new Uint8Array(g.Buffer.from(b64, 'base64'))
  throw new Error('No base64 decoder available in this environment')
}

function bytesToHex(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return ''
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function onHexBlur() {
  if (isSyncing.value) return
  jsonError.value = ''
  try {
    const bytes = hexToBytes(binaryHex.value)
    isSyncing.value = true
    binaryBase64.value = bytesToBase64(bytes)
    await refreshAnyOutputsFromMessageBytes(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
}

async function onBase64Blur() {
  if (isSyncing.value) return
  jsonError.value = ''
  try {
    const bytes = base64ToBytes(binaryBase64.value)
    isSyncing.value = true
    binaryHex.value = bytesToHex(bytes)
    await refreshAnyOutputsFromMessageBytes(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
}

async function onAnyHexBlur() {
  if (isSyncing.value) return
  jsonError.value = ''
  try {
    const bytes = hexToBytes(anyHex.value)
    isSyncing.value = true
    anyBase64.value = bytesToBase64(bytes)
    await decodeAnyBytes(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
}

async function onAnyBase64Blur() {
  if (isSyncing.value) return
  jsonError.value = ''
  try {
    const bytes = base64ToBytes(anyBase64.value)
    isSyncing.value = true
    anyHex.value = bytesToHex(bytes)
    await decodeAnyBytes(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
}

function syncOutputs(
  reg: Awaited<ReturnType<typeof getProtobufRegistry>>,
  schema: Parameters<typeof reg.toBinary>[0],
  message: Parameters<typeof reg.toBinary>[1]
) {
  const messageBytes = reg.toBinary(schema, message)
  binaryHex.value = bytesToHex(messageBytes)
  binaryBase64.value = bytesToBase64(messageBytes)
  const packed = reg.pack(schema, message)
  packedTypeUrl.value = packed.typeUrl
  const anyBytes = new Any({ typeUrl: packed.typeUrl, value: packed.value }).toBinary()
  anyHex.value = bytesToHex(anyBytes)
  anyBase64.value = bytesToBase64(anyBytes)
}

async function refreshAnyOutputsFromMessageBytes(precomputed?: Uint8Array) {
  if (!packedTypeUrl.value) return
  try {
    const reg = await getProtobufRegistry()
    const bytes = precomputed ?? hexToBytes(binaryHex.value)
    if (!bytes || bytes.length === 0) {
      anyHex.value = ''
      anyBase64.value = ''
      return
    }
    const unpacked = reg.unpack({ typeUrl: packedTypeUrl.value, value: bytes })
    if (!unpacked) {
      jsonError.value = 'Unknown Any typeUrl or message not found in registry'
      return
    }
    syncOutputs(reg, unpacked.schema, unpacked.message)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  }
}

async function decodeAnyBytes(bytes: Uint8Array) {
  if (!bytes || bytes.length === 0) {
    jsonError.value = 'Any bytes empty'
    return
  }
  const decoded = Any.fromBinary(bytes)
  if (!decoded.typeUrl) {
    jsonError.value = 'Packed Any missing typeUrl'
    return
  }
  packedTypeUrl.value = decoded.typeUrl
  const reg = await getProtobufRegistry()
  const unpacked = reg.unpack({ typeUrl: decoded.typeUrl, value: decoded.value })
  if (!unpacked) {
    jsonError.value = 'Unknown Any typeUrl or message not found in registry'
    return
  }
  syncOutputs(reg, unpacked.schema, unpacked.message)
  const canonical = reg.toJsonAny(unpacked.schema, unpacked.message)
  jsonInput.value = JSON.stringify(canonical, null, 2)
}

watch(jsonInput, async () => {
  if (isSyncing.value) return
  jsonError.value = ''
  try {
    const reg = await getProtobufRegistry()
    const parsed = JSON.parse(jsonInput.value || '{}')
    const decoded = reg.fromJsonAny(parsed)
    if (!decoded) {
      jsonError.value = 'Unknown Any typeUrl or message not found in registry'
      return
    }
    isSyncing.value = true
    syncOutputs(reg, decoded.schema, decoded.message)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
})

watch(packedTypeUrl, async () => {
  if (isSyncing.value) return
  if (!packedTypeUrl.value) return
  try {
    const reg = await getProtobufRegistry()
    const bytes = hexToBytes(binaryHex.value)
    if (!bytes.length) return
    const unpacked = reg.unpack({ typeUrl: packedTypeUrl.value, value: bytes })
    if (!unpacked) {
      jsonError.value = 'Unknown Any typeUrl or message not found in registry'
      return
    }
    isSyncing.value = true
    syncOutputs(reg, unpacked.schema, unpacked.message)
    jsonInput.value = JSON.stringify(reg.toJsonAny(unpacked.schema, unpacked.message), null, 2)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isSyncing.value = false
  }
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Protobuf Demo</h2>
    <div v-if="loading" class="text-muted-foreground">Loading registry…</div>
    <div v-else>
      <div v-if="error" class="text-destructive">{{ error }}</div>
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_max-content_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>JSON (Any)</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="space-y-2">
              <Label>JSON input</Label>
              <Textarea v-model="jsonInput" class="font-mono min-h-48" />
            </div>
          </CardContent>
        </Card>

        <div class="flex flex-col items-center justify-center gap-2">
          <div v-if="jsonError" class="text-sm text-destructive text-center px-2">
            {{ jsonError }}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Binary (hex)</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="space-y-2">
              <Label>Type URL</Label>
              <Input v-model="packedTypeUrl" class="font-mono" placeholder="/package.Message" />
            </div>
            <div class="space-y-2">
              <Label>Hex input/output</Label>
              <Textarea v-model="binaryHex" class="font-mono min-h-48" @blur="onHexBlur" />
            </div>
            <div class="space-y-2">
              <Label>Base64 input/output</Label>
              <Textarea v-model="binaryBase64" class="font-mono min-h-48" @blur="onBase64Blur" />
            </div>
            <div class="space-y-2">
              <Label>Any bytes (hex)</Label>
              <Textarea
                v-model="anyHex"
                class="font-mono min-h-32"
                @blur="onAnyHexBlur"
              />
            </div>
            <div class="space-y-2">
              <Label>Any bytes (base64)</Label>
              <Textarea
                v-model="anyBase64"
                class="font-mono min-h-32"
                @blur="onAnyBase64Blur"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
