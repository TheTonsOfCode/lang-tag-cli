import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            globals: {
                process: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin,
        },
        rules: {
            // Enforce no .ts extensions in imports
            'import/extensions': [
                'error',
                'never',
                {
                    js: 'never',
                    ts: 'never',
                },
            ],
        },
    },
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'examples/**',
            'vite.config.ts',
            'vitest.config.ts',
        ],
    },
];
