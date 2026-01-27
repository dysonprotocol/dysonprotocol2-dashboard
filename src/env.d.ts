/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export const frontmatter: Record<string, unknown>
  export default component
}

interface KeplrKey {
  name: string
  bech32Address: string
  pubKey: Uint8Array
  isNanoLedger: boolean
}

interface Keplr {
  enable(chainId: string): Promise<void>
  getKey(chainId: string): Promise<KeplrKey>
  getOfflineSigner(chainId: string): any
  experimentalSuggestChain(chainInfo: unknown): Promise<void>
}

interface Window {
  keplr?: Keplr
}

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
