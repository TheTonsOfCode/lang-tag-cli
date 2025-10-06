import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'pathe';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'cli/index': resolve(__dirname, 'src/cli/index.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (format === 'es') {
          return `${entryName}.js`;
        }
        return `${entryName}.cjs`;
      }
    },
    rollupOptions: {
      external: [
        'commander',
        'pathe',
        'json5',
        'acorn',
        'mustache',
        'fs',
        'path',
        'url',
        'fs/promises',
        'node:fs',
        'node:path',
        'node:process',
        'node:events',
        'node:stream',
        'node:stream/promises',
        'node:fs/promises',
        'globby',
        'micromatch',
        'events',
        'util',
        'os',
        'chokidar'
      ]
    },
    target: 'node18',
    minify: false
  },
  plugins: [
    dts({
      include: ['src/index.ts', "src/cli/config.ts", "src/cli/logger.ts"],
      // include: ['src/**/*.ts'],
      // exclude: ['src/cli/**/*.ts']
    })
  ]
});