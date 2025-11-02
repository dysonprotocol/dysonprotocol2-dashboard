// Static registry for generated protobuf message types.

import { Any, Message, createRegistry } from '@bufbuild/protobuf'
import type { JsonValue } from '@bufbuild/protobuf'

type MessageCtor<T extends Message = Message> = {
  new (data?: Record<string, unknown>): T
  readonly typeName: string
  readonly prototype: T
  readonly fields?: { list(): Iterable<unknown> }
  readonly runtime?: unknown
  fromBinary(bytes: Uint8Array, options?: unknown): T
  fromJson(json: unknown, options?: unknown): T
}

type MessageInstance = Message

type MessageEntry = { fullName: string; typeUrl: string; schema: MessageCtor }

const moduleMap = import.meta.glob('../../ts-client/**/*_pb.ts', { eager: true }) as Record<
  string,
  Record<string, unknown>
>

const messageTypes = collectMessageTypes(Object.values(moduleMap))
const typeRegistry = createRegistry(
  ...(messageTypes as Parameters<typeof createRegistry>[number][])
)
const entryList: MessageEntry[] = messageTypes
  .map((schema) => ({ fullName: schema.typeName, typeUrl: '/' + schema.typeName, schema }))
  .sort((a, b) => (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0))

const protobufRegistry: ProtobufRegistry = {
  entries: entryList,
  create<T extends MessageInstance>(schema: MessageCtor<T>, value?: unknown): T {
    return ensureInstance(schema, value) as T
  },
  toBinary<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown): Uint8Array {
    return ensureInstance(schema, message).toBinary()
  },
  fromBinary<T extends MessageInstance>(schema: MessageCtor<T>, bytes: Uint8Array): T {
    return schema.fromBinary(bytes)
  },
  fromJson<T extends MessageInstance>(schema: MessageCtor<T>, json: unknown): T {
    return schema.fromJson(json as JsonValue, { typeRegistry })
  },
  toJson<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown): unknown {
    return ensureInstance(schema, message).toJson({ typeRegistry })
  },
  pack<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown) {
    const instance = ensureInstance(schema, message)
    return { typeUrl: '/' + schema.typeName, value: instance.toBinary() }
  },
  unpack(anyMsg) {
    if (!anyMsg || typeof anyMsg.typeUrl !== 'string') return undefined
    const typeName = anyMsg.typeUrl.substring(anyMsg.typeUrl.lastIndexOf('/') + 1)
    const schema = byFullName.get(typeName)
    if (!schema) return undefined
    if (!(anyMsg.value instanceof Uint8Array)) return undefined
    return { schema, message: schema.fromBinary(anyMsg.value) }
  },
  fromJsonAny(json) {
    const anyMsg = Any.fromJson(json as JsonValue, { typeRegistry })
    if (!anyMsg.typeUrl || !(anyMsg.value instanceof Uint8Array)) return undefined
    return this.unpack({ typeUrl: anyMsg.typeUrl, value: anyMsg.value })
  },
  toJsonAny<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown) {
    const { typeUrl, value } = this.pack(schema, message)
    return new Any({ typeUrl, value }).toJson({ typeRegistry })
  },
}

const byFullName = new Map<string, MessageCtor>(
  messageTypes.map((schema) => [schema.typeName, schema])
)

export function getProtobufRegistry(): Promise<ProtobufRegistry> {
  return Promise.resolve(protobufRegistry)
}

function collectMessageTypes(modules: Record<string, unknown>[]): MessageCtor[] {
  const seen = new Set<MessageCtor>()
  for (const mod of modules) {
    for (const exported of Object.values(mod)) {
      if (isMessageCtor(exported) && !seen.has(exported)) seen.add(exported)
    }
  }
  return Array.from(seen)
}

function isMessageCtor(value: unknown): value is MessageCtor {
  if (typeof value !== 'function') return false
  const candidate = value as MessageCtor & { prototype?: unknown }
  return (
    typeof candidate.typeName === 'string' &&
    typeof candidate.fromJson === 'function' &&
    typeof candidate.fromBinary === 'function' &&
    candidate.prototype instanceof Message
  )
}

function ensureInstance<T extends MessageInstance>(schema: MessageCtor<T>, value: unknown): T {
  if (value instanceof schema) return value
  return new schema((value ?? {}) as Record<string, unknown>)
}

export interface ProtobufRegistry {
  entries: MessageEntry[]
  create<T extends MessageInstance>(schema: MessageCtor<T>, value?: unknown): T
  toBinary<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown): Uint8Array
  fromBinary<T extends MessageInstance>(schema: MessageCtor<T>, bytes: Uint8Array): T
  fromJson<T extends MessageInstance>(schema: MessageCtor<T>, json: unknown): T
  toJson<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown): unknown
  pack<T extends MessageInstance>(
    schema: MessageCtor<T>,
    message: unknown
  ): { typeUrl: string; value: Uint8Array }
  unpack(anyMsg: { typeUrl: string; value: Uint8Array }):
    | {
        schema: MessageCtor
        message: MessageInstance
      }
    | undefined
  fromJsonAny(json: unknown): { schema: MessageCtor; message: MessageInstance } | undefined
  toJsonAny<T extends MessageInstance>(schema: MessageCtor<T>, message: unknown): unknown
}
