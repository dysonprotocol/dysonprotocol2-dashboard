import { describe, it, expect } from 'vitest'

describe('SFC import errors are surfaced by Vite plugin-vue', () => {
  it('imports NameList.vue without throwing', async () => {
    let thrown: any = null
    try {
      await import('@/views/chain/NameList.vue')
    } catch (e) {
      thrown = e
      // Log full error for debugging
      console.error('[vite:vue] import error:', e)
    }
    expect(thrown).toBeNull()
  })

  it('imports RegisterName.vue without throwing', async () => {
    let thrown: any = null
    try {
      await import('@/components/names/RegisterName.vue')
    } catch (e) {
      thrown = e
      console.error('[vite:vue] import error:', e)
    }
    expect(thrown).toBeNull()
  })
})
