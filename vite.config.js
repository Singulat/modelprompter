import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pugPlugin from 'vite-plugin-pug'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' assert { type: 'json' }
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'

// Function to copy files
function copyFiles() {
  let path = resolve(__dirname, 'sandbox.html')
  let distPath = resolve(__dirname, 'dist', 'sandbox.html')
  let fileContent = readFileSync(path, 'utf-8')
  writeFileSync(distPath, fileContent)
  
  path = resolve(__dirname, 'src/contentscript.js')
  distPath = resolve(__dirname, 'dist', 'contentscript.js')
  fileContent = readFileSync(path, 'utf-8')
  writeFileSync(distPath, fileContent)
}

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest }),
    pugPlugin(),
    {
      name: 'copy-sandbox',
      apply: 'build',
      configureServer() {
      copyFiles()
      },
      writeBundle() {
        copyFiles()
      }
    }
  ],
  build: {
    sourcemap: true,
    minify: false,
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