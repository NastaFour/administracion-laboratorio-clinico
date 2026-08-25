import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const alias = {
  '@': path.resolve(__dirname, './src'),
}

/**
 * Static assets copied next to the electron bundles (dist-electron/): the WU10
 * PDF report template + locally bundled IBM Plex Sans fonts. At runtime the
 * offscreen window loads `report.html` via loadFile relative to __dirname.
 */
const reportPublicDir = path.resolve(__dirname, 'src/main/services/pdf/template')

export default defineConfig({
  // The packaged renderer loads via loadFile (file:// protocol): absolute
  // asset URLs would resolve to the drive root, so use relative paths.
  base: './',
  plugins: [
    tailwindcss(),
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          publicDir: reportPublicDir,
          resolve: { alias },
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'fs-extra'],
              output: {
                format: 'cjs',
                entryFileNames: 'main.js',
              },
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          publicDir: reportPublicDir,
          resolve: { alias },
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'preload.js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias,
  },
})
