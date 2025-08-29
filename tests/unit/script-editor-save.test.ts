import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

// Shared reactive state for mocks
const unlockedWallets = ref([{ address: 'addr1' }])
const themeRef = ref('light')
const mockScriptStore = ref<Record<string, any>>({
  addr1: { address: 'addr1', version: '1', code: 'print(1)' },
})

vi.mock('monaco-editor', () => {
  const editor = {
    getValue: () => mockScriptStore.value.addr1?.code ?? '',
    setValue: vi.fn(),
    onDidChangeModelContent: vi.fn(),
    hasTextFocus: () => false,
    getModel: () => ({ getLineCount: () => 1 }),
    dispose: vi.fn(),
    revealRangeInCenter: vi.fn(),
    setPosition: vi.fn(),
    createDecorationsCollection: () => ({ set: vi.fn() }),
    updateOptions: vi.fn(),
  }
  return {
    editor: { create: () => editor, setTheme: vi.fn() },
    Range: class Range {},
  }
})

// Stub monaco worker setup file by absolute path so Vite doesn't resolve workers
vi.mock('/workspaces/dysonprotocol2-dashboard/src/utils/monacoSetup.js', () => ({}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} as any }),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({
    unlockedWallets,
    sendMsg: vi.fn(async (p?: any) => ({ ok: true, p })),
  }),
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ theme: themeRef }),
}))

vi.mock('pinia-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRepo: (_model: any) => ({
      find: (id: string) => mockScriptStore.value[id] || null,
    }),
  }
})

const updateScriptSpy = vi.fn(async (_payload: any) => {
  // no-op: simulate successful update
})
const fetchInfoSpy = vi.fn(async (addr: string) => {
  // simulate backend refresh setting new version
  const current = mockScriptStore.value[addr] || { address: addr }
  mockScriptStore.value[addr] = { ...current, version: '2' }
})

vi.mock('@pinia-orm/axios', () => ({
  useAxiosRepo: (_model: any) => ({
    api: () => ({
      updateScript: updateScriptSpy,
      fetchInfo: fetchInfoSpy,
    }),
  }),
}))

vi.mock('@/components/shared/WalletSelector.vue', () => ({
  default: {
    name: 'WalletSelector',
    template: '<div />',
  },
}))

describe('ScriptEditor.vue save and refresh', () => {
  it('saves script and refresh updates version', async () => {
    const ScriptEditor = (await import('@/components/scripts/ScriptEditor.vue')).default
    const wrapper = mount(ScriptEditor, {
      props: { address: 'addr1', script: mockScriptStore.value.addr1 },
      attachTo: document.body,
    })

    // Make content differ to enable Save button
    ;(wrapper.vm as any).currentContent = 'print(2)'
    await nextTick()

    const saveBtn = wrapper.find('button.btn-primary')
    expect(saveBtn.exists()).toBe(true)
    expect(saveBtn.attributes('disabled')).toBeUndefined()

    await saveBtn.trigger('click')
    await nextTick()
    await nextTick()

    expect(updateScriptSpy).toHaveBeenCalledTimes(1)
    expect(fetchInfoSpy).toHaveBeenCalledWith('addr1')

    // Version should reflect refreshed repo state
    expect(wrapper.text()).toContain('Version: 2')

    wrapper.unmount()
  })
})
