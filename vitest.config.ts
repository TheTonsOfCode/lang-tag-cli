import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        include: ['tests/**/*.test.ts'],
        testTimeout: 20000
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
});
