import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('dictionary-en-us') || id.includes('/nspell/')) return 'spellcheck-vendor'
          if (id.includes('@tauri-apps')) return 'tauri-vendor'
          if (id.includes('markdown-it')) return 'markdown-vendor'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
  plugins: [react()],
})
