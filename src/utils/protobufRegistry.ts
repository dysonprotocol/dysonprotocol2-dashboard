import type { GenFile, GenMessage } from '@bufbuild/protobuf/codegenv2'
import { messageDesc } from '@bufbuild/protobuf/codegenv2'
import type { Message, JsonValue } from '@bufbuild/protobuf'
import {
  create,
  toBinary,
  fromBinary,
  toJson as bufToJson,
  fromJson as bufFromJson,
  createRegistry,
} from '@bufbuild/protobuf'

export function getProtobufRegistry(): Promise<ProtobufRegistry> {
  if (!registryPromise) registryPromise = buildRegistry()
  return registryPromise
}

let registryPromise: Promise<ProtobufRegistry> | undefined

async function buildRegistry(): Promise<ProtobufRegistry> {
  // Eagerly import all generated protobuf files. We target only *_pb.ts files.
  // Use a relative glob from this file to project root /ts-client
  const moduleMap = import.meta.glob('../../ts-client/**/*_pb.ts', { eager: true }) as Record<
    string,
    unknown
  >

  type AnyModule = Record<string, unknown>
  const genFiles: GenFile[] = []
  const schemas: GenMessage<Message<string>>[] = []

  for (const mod of Object.values(moduleMap) as AnyModule[]) {
    for (const [exportName, exported] of Object.entries(mod)) {
      // Collect file descriptors (export names starting with "file_")
      if (exportName.startsWith('file_')) genFiles.push(exported as GenFile)

      // Collect message schemas: exported consts ending with Schema that represent messages
      if (exportName.endsWith('Schema') && isMessageSchema(exported)) {
        schemas.push(exported as GenMessage<Message<string>>)
      }
    }
  }

  // Deduplicate genFiles by object identity
  const uniqueFiles = Array.from(new Set(genFiles))

  // Build a type registry from all files so Any fields decode/encode properly
  const typeRegistry = createRegistry(...uniqueFiles)

  // Prepare entries for UI
  const byFullName = new Map<string, GenMessage<Message<string>>>()
  for (const s of schemas) byFullName.set(s.typeName, s)
  const entries = Array.from(byFullName.values())
    .map((schema) => ({ fullName: schema.typeName, typeUrl: '/' + schema.typeName, schema }))
    .sort((a, b) => (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0))

  // Build Any schema from WKT to parse root Any JSON without manual type lookup
  const { file_google_protobuf_any } = await import('@bufbuild/protobuf/wkt')
  type AnyMsg = import('@bufbuild/protobuf/wkt').Any
  const AnySchema: GenMessage<AnyMsg> = messageDesc(file_google_protobuf_any, 0)

  function fromJson<T extends Message<string>>(schema: GenMessage<T>, json: unknown): T {
    return bufFromJson(schema, json as JsonValue, { registry: typeRegistry })
  }

  function toJson<T extends Message<string>>(schema: GenMessage<T>, message: T): unknown {
    return bufToJson(schema, message, { registry: typeRegistry })
  }

  function pack<T extends Message<string>>(
    schema: GenMessage<T>,
    message: T
  ): { typeUrl: string; value: Uint8Array } {
    const value = toBinary(schema, message)
    const typeUrl = '/' + schema.typeName
    return { typeUrl, value }
  }

  function unpack(anyMsg: {
    typeUrl: string
    value: Uint8Array
  }): { schema: GenMessage<Message<string>>; message: Message<string> } | undefined {
    if (!anyMsg || typeof anyMsg.typeUrl !== 'string') return undefined
    const typeName = anyMsg.typeUrl.substring(anyMsg.typeUrl.lastIndexOf('/') + 1)
    const schema = byFullName.get(typeName)
    if (!schema) return undefined
    const message = fromBinary(schema as unknown as GenMessage<Message<string>>, anyMsg.value)
    return { schema, message }
  }

  function fromJsonAny(
    json: unknown
  ): { schema: GenMessage<Message<string>>; message: Message<string> } | undefined {
    const anyMsg = bufFromJson(AnySchema, json as JsonValue, { registry: typeRegistry })
    return unpack({ typeUrl: anyMsg.typeUrl, value: anyMsg.value })
  }

  function toJsonAny<T extends Message<string>>(schema: GenMessage<T>, message: T): unknown {
    const anyMsg = pack(schema, message)
    // Build a proper Any message from packed fields before serializing
    const asAny: AnyMsg = { typeUrl: anyMsg.typeUrl, value: anyMsg.value } as unknown as AnyMsg
    return bufToJson(AnySchema, asAny, { registry: typeRegistry })
  }

  return {
    entries,
    create,
    toBinary,
    fromBinary,
    fromJson,
    toJson,
    pack,
    unpack,
    fromJsonAny,
    toJsonAny,
  }
}

function isMessageSchema(value: unknown): value is GenMessage<Message<string>> {
  if (!value || typeof value !== 'object') return false
  // messageDesc returns an object with a stable "typeName" string and a "fields" array
  const v = value as { typeName?: unknown; fields?: unknown; values?: unknown }
  if (typeof v.typeName !== 'string') return false
  // Exclude enums, which expose "values" instead of "fields"
  if (Array.isArray((v as { values?: unknown[] }).values)) return false
  return Array.isArray(v.fields)
}

export interface ProtobufRegistry {
  entries: { fullName: string; typeUrl: string; schema: GenMessage<Message<string>> }[]
  create: typeof create
  toBinary: typeof toBinary
  fromBinary: typeof fromBinary
  fromJson<T extends Message<string>>(schema: GenMessage<T>, json: unknown): T
  toJson<T extends Message<string>>(schema: GenMessage<T>, message: T): unknown
  pack<T extends Message<string>>(
    schema: GenMessage<T>,
    message: T
  ): { typeUrl: string; value: Uint8Array }
  unpack(anyMsg: {
    typeUrl: string
    value: Uint8Array
  }): { schema: GenMessage<Message<string>>; message: Message<string> } | undefined
  fromJsonAny(
    json: unknown
  ): { schema: GenMessage<Message<string>>; message: Message<string> } | undefined
  toJsonAny<T extends Message<string>>(schema: GenMessage<T>, message: T): unknown
}
