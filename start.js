/**
 * When developing on Windows, Vite sometimes crashes with EBUSY
 * due to the way it livereloads the extension.
 * 
 * To fix this, we spin up the Vite server through this script instead.
 * Note: This is only needed for development, building works as normal.
 */
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

let vite
const isWindows = os.platform() === 'win32'
const viteExecutable = isWindows ? 'vite.cmd' : 'vite'
const vitePath = path.join(__dirname, 'node_modules', '.bin', viteExecutable)
const configPath = path.join(__dirname, 'vite.config.js')

function startVite() {
  vite = spawn(vitePath, ['-c', configPath])

  vite.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`)
  })

  vite.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`)
    if (data.toString().includes('EBUSY')) {
      console.error('💥 Vite crashed with EBUSY, restarting...')
      vite.kill()
      startVite()
    }
  })
}

startVite()