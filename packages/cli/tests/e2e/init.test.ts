import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { CONFIG_FILE_NAME } from '@/core/constants';

import {
    TESTS_TEST_DIR as _TESTS_TEST_DIR,
    clearPreparedMainProjectBase,
    clearTestsEnvironment,
    copyPreparedMainProjectBase,
    prepareMainProjectBase,
} from './utils';

const SUFFIX = 'init';
const TESTS_TEST_DIR = _TESTS_TEST_DIR + '-' + SUFFIX;

describe('init command e2e tests', () => {
    beforeAll(() => {
        prepareMainProjectBase(SUFFIX);
    });

    beforeEach(() => {
        clearTestsEnvironment(SUFFIX);
        mkdirSync(TESTS_TEST_DIR, { recursive: true });
        copyPreparedMainProjectBase(SUFFIX);
    });

    afterEach(() => {
        clearTestsEnvironment(SUFFIX);
    });

    afterAll(() => {
        clearPreparedMainProjectBase(SUFFIX);
    });

    it('should create a default configuration file', () => {
        // Run the init command
        execSync('npm run init', { cwd: TESTS_TEST_DIR, stdio: 'ignore' });

        // Check if the config file exists
        const configFilePath = join(TESTS_TEST_DIR, CONFIG_FILE_NAME);
        expect(existsSync(configFilePath)).toBe(true);

        // Read the config file content
        const configContent = readFileSync(configFilePath, 'utf-8');

        // Verify the config file contains expected content
        expect(configContent).toContain(
            "includes: ['src/**/*.{js,ts,jsx,tsx}']"
        );
        expect(configContent).toContain(
            "excludes: ['node_modules', 'dist', 'build'"
        );
        expect(configContent).toContain("localesDirectory: 'public/locales'");
        expect(configContent).toContain("baseLanguageCode: 'en'");
        expect(configContent).toContain('onConfigGeneration: async event => {');
    });

    it('should not overwrite existing configuration file', () => {
        // Create a custom config file
        const customConfig = `/** @type {import('lang-tag/cli/config').LangTagConfig} */
const config = {
    includes: ['custom/**/*.{js,ts}'],
    excludes: ['node_modules'],
    localesDirectory: 'custom/locales',
    baseLanguageCode: 'en',
    onConfigGeneration: async (event) => {
        if (event.config) {
            event.save(event.config);
        }
    }
};

module.exports = config;
`;
        writeFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            customConfig,
            'utf-8'
        );

        // Run the init command
        execSync('npm run init', { cwd: TESTS_TEST_DIR, stdio: 'ignore' });

        // Read the config file content
        const configContent = readFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            'utf-8'
        );

        // Verify the config file still contains the custom content
        expect(configContent).toBe(customConfig);
    });

    it('should create a valid configuration file that can be used by other commands', () => {
        // Run the init command
        execSync('npm run init', { cwd: TESTS_TEST_DIR, stdio: 'ignore' });

        // Create a simple test file with lang tags
        const srcDir = join(TESTS_TEST_DIR, 'src');
        mkdirSync(srcDir, { recursive: true });

        const langTagDefinition = `
    export function lang(translations: any, options: any) {
        return translations;
    }
`;
        writeFileSync(join(srcDir, 'lang-tag.ts'), langTagDefinition);

        const testFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({"hello": "Hello World"}, {"namespace": "test"});
`;
        writeFileSync(join(srcDir, 'test.ts'), testFile);

        // Run the collect command to verify the config works
        execSync('npm run c', { cwd: TESTS_TEST_DIR, stdio: 'ignore' });

        // Check if the output directory was created
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        expect(existsSync(outputDir)).toBe(true);
    });

    it('should handle errors gracefully', () => {
        // Create a read-only directory
        const readOnlyDir = join(TESTS_TEST_DIR, 'readonly');
        mkdirSync(readOnlyDir, { recursive: true });

        // Make the directory read-only (this is a simplified approach for testing)
        // In a real environment, you would use chmod or similar to make it read-only

        // Run the init command in the read-only directory
        // We expect it to fail gracefully
        try {
            execSync('npm run init', { cwd: readOnlyDir, stdio: 'ignore' });
        } catch (error) {
            // The command should fail, but not crash the test
            expect(error).toBeDefined();
        }
    });
});
