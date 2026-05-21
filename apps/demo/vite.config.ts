import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@berget/co2-emissions-calculator': resolve(__dirname, '../../src'),
      '@berget/ui': resolve(__dirname, '../../../berget-design-system/dist'),
    },
  },
})
