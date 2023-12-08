import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' assert { type: 'json' }
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'

// Function to copy sandbox.html
function copySandbox() {
  const sandboxPath = resolve(__dirname, 'sandbox.html')
  const distPath = resolve(__dirname, 'dist', 'sandbox.html')
  const sandboxContent = readFileSync(sandboxPath, 'utf-8')
  writeFileSync(distPath, sandboxContent)
}

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest }),
    {
      name: 'copy-sandbox',
      apply: 'build',
      configureServer() {
      copySandbox()
      },
      writeBundle() {
        copySandbox()
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      },
    },
  },
})