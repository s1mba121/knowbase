import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(rootDir, 'widget/main.ts'),
      name: 'KnowbaseWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    outDir: resolve(rootDir, '../backend/public'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'widget.[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
