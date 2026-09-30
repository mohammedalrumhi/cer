import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

export default defineConfig({
  envDir: '..',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    fs: { allow: ['.', sharedDir] },
  },
  // harfbuzzjs locates its .wasm via `new URL(..., import.meta.url)`; pre-bundling would break that.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  test: {
    dir: '..',
    include: ['frontend/src/**/*.test.{js,jsx}', 'shared/**/*.test.js'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
  },
})
