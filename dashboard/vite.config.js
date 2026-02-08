/**
 * Vite Configuration
 *
 * Build configuration for the Payzee dashboard application.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3001,
    cors: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
