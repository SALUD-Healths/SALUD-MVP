import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Add Node.js polyfills for browser
      'process': 'process/browser',
      'buffer': 'buffer',
    },
  },
  define: {
    // Define global variables for browser compatibility
    'global': 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    exclude: ['@provablehq/sdk'], // Don't pre-bundle the SDK to avoid WASM issues
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      },
    },
  },
  build: {
    target: 'esnext', // Required for top-level await in WASM
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  worker: {
    format: 'es',
  },
})
