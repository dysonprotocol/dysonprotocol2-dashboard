import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import nodePolyfills from "rollup-plugin-node-polyfills";

export default defineConfig({
  plugins: [vue(), tailwindcss(), nodePolyfills()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      buffer: resolve(__dirname, "node_modules/rollup-plugin-node-polyfills/polyfills/buffer-es6.js"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
      define: {
        global: "window",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
