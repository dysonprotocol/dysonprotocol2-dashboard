import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'monaco-editor': path.resolve(__dirname, 'tests/mocks/monaco.ts'),
      '/workspaces/dysonprotocol2-dashboard/src/utils/monacoSetup.js': path.resolve(
        __dirname,
        'tests/mocks/empty.ts'
      ),
    },
  },
})
