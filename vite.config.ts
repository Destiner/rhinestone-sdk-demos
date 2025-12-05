import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@rhinestone/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@rhinestone/sdk'],
  },
})
