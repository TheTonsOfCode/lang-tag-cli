import { resolve } from 'pathe';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'algorithms/index': resolve(
                    __dirname,
                    'src/algorithms/index.ts'
                ),
            },
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
                if (format === 'es') {
                    return `${entryName}.js`;
                }
                return `${entryName}.cjs`;
            },
        },
        rollupOptions: {
            external: [
                'commander',
                'pathe',
                'case',
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
                'node:async_hooks',
                'node:readline',
                'node:tty',
                'node:util',
                'globby',
                'micromatch',
                'events',
                'util',
                'os',
                'chokidar',
                '@inquirer/prompts',
                '@inquirer/select',
                '@inquirer/confirm',
                '@inquirer/checkbox',
                '@inquirer/input',
                /^@inquirer\//,
            ],
            output: [
                { format: 'es', chunkFileNames: 'chunks/[name].js' },
                { format: 'cjs', chunkFileNames: 'chunks/[name].cjs' },
            ],
        },
        target: 'node18',
        minify: false,
    },
    plugins: [
        dts({
            include: ['src/type.ts', 'src/logger.ts', 'src/algorithms/**/*.ts'],
            // include: ['src/**/*.ts'],
        }),
    ],
});
