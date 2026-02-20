import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so Electron can load built files via file://
  // instead of looking for /assets at filesystem root.
  base: './',
  plugins: [react()],
})
