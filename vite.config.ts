import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

function gitOrDefault(cmd: string, fallback = ''): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return fallback
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': {},
    global: 'window',
    __DEV__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_OPTIONS_API__: 'true',
    __GIT_COMMIT__: JSON.stringify(gitOrDefault('git rev-parse --short HEAD', '<none>')),
    __GIT_BRANCH__: JSON.stringify(
      gitOrDefault('git name-rev HEAD', 'HEAD <none>').split(/\s+/)[1] || '<none>'
    ),
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'window',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/cosmos': {
        target: 'http://localhost:1317',
        changeOrigin: true,
        secure: false,
      },
      '/dysonprotocol': {
        target: 'http://localhost:1317',
        changeOrigin: true,
        secure: false,
      },
      '/swagger': {
        target: 'http://localhost:1317',
        changeOrigin: true,
        secure: false,
      },
      '/ibc': {
        target: 'http://localhost:1317',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
