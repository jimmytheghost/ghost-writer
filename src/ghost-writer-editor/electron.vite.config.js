import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      sourcemap: false,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.js'),
        output: {
          entryFileNames: 'main.js',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      sourcemap: false,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload.js'),
        output: {
          entryFileNames: 'preload.js',
        },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
            if (id.includes('marked')) return 'markdown-vendor'
            return 'vendor'
          },
        },
      },
    },
    server: {
      port: 5174,
      strictPort: true,
    },
  },
})
