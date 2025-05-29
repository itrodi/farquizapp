import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill for apps that might expect process.env
    'process.env': {}
  },
  server: {
    port: 3000,
    host: true
  }
})