<script setup lang="ts">
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { getProtobufRegistry } from '@/utils/protobufRegistry'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const loading = ref(true)
const error = ref<string>('')
const jsonInput = useStorage<string>('demo.protobuf.jsonInput', '{}')
const binaryHex = ref<string>('')
const binaryBase64 = ref<string>('')
const packedTypeUrl = ref<string>('')

const jsonError = ref<string>('')

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

async function encodeRight() {
  jsonError.value = ''
  binaryHex.value = ''
  binaryBase64.value = ''
  packedTypeUrl.value = ''
  try {
    const reg = await getProtobufRegistry()
    const parsed = JSON.parse(jsonInput.value || '{}')
    const decoded = reg.fromJsonAny(parsed)
    if (!decoded) {
      jsonError.value = 'Unknown Any typeUrl or message not found in registry'
      return
    }
    const { schema, message } = decoded
    const bin = reg.toBinary(schema, message)
    binaryHex.value = Array.from(bin)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    binaryBase64.value = bytesToBase64(bin)
    const any = reg.pack(schema, message)
    packedTypeUrl.value = any.typeUrl
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  }
}

async function decodeLeft() {
  jsonError.value = ''
  try {
    const reg = await getProtobufRegistry()
    let typeUrl = packedTypeUrl.value
    try {
      const maybeAny = JSON.parse(jsonInput.value || '{}') as { typeUrl?: unknown }
      if (maybeAny && typeof maybeAny.typeUrl === 'string' && maybeAny.typeUrl.length > 0)
        typeUrl = maybeAny.typeUrl
    } catch (e) {
      console.warn('Left JSON is not parseable; falling back to existing typeUrl if any', e)
    }
    if (!typeUrl) {
      jsonError.value =
        'Missing typeUrl. Provide Any JSON with typeUrl on the left or run Encode first.'
      return
    }

    const bytes = hexToBytes(binaryHex.value)
    const unpacked = reg.unpack({ typeUrl, value: bytes })
    if (!unpacked) {
      jsonError.value = 'Unknown Any typeUrl or message not found in registry'
      return
    }
    const asAnyJson = reg.toJsonAny(unpacked.schema, unpacked.message)
    jsonInput.value = JSON.stringify(asAnyJson, null, 2)
    packedTypeUrl.value = typeUrl
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  }
}

function onHexBlur() {
  jsonError.value = ''
  try {
    const bytes = hexToBytes(binaryHex.value)
    binaryBase64.value = bytesToBase64(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  }
}

function onBase64Blur() {
  jsonError.value = ''
  try {
    const bytes = base64ToBytes(binaryBase64.value)
    binaryHex.value = bytesToHex(bytes)
  } catch (e) {
    console.error(e)
    jsonError.value = e instanceof Error ? e.message : String(e)
  }
}
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
          <Button @click="encodeRight">Encode →</Button>
          <Button variant="secondary" @click="decodeLeft">Decode ←</Button>
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
              <Label>Hex input/output</Label>
              <Textarea v-model="binaryHex" class="font-mono min-h-48" @blur="onHexBlur" />
            </div>
            <div class="space-y-2">
              <Label>Base64 input/output</Label>
              <Textarea v-model="binaryBase64" class="font-mono min-h-48" @blur="onBase64Blur" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
