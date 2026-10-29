import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React and related libraries — used by every chunk, stable across
          // deploys, so worth its own long-cache entry.
          'react-vendor': ['react', 'react-dom'],
          // NOTE: no manual chunk for react-globe.gl/three. GlobeSelector is
          // loaded via React.lazy, so rollup naturally splits the globe stack
          // into the lazy chunk. Forcing it via manualChunks pulled shared
          // deps (react internals) into that chunk, made the entry import it,
          // and defeated the laziness (vite then modulepreloaded 1.8 MB of
          // globe code on initial page load).
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
