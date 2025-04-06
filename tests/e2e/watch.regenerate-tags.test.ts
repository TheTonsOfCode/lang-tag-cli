import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {execSync, spawn} from 'child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {
    clearPreparedMainProjectBase,
    clearTestsEnvironment,
    copyPreparedMainProjectBase,
    prepareMainProjectBase,
    TESTS_TEST_DIR as _TESTS_TEST_DIR
} from "./utils.ts";
import {CONFIG_FILE_NAME} from '@/cli/constants.ts';
import process from "node:process";

const SUFFIX = 'watch-regenerate-tags';
const TESTS_TEST_DIR = _TESTS_TEST_DIR + "-" + SUFFIX;

describe('watch command e2e tests', () => {
    beforeAll(() => {
        prepareMainProjectBase(SUFFIX);
    });

    beforeEach(() => {
        clearTestsEnvironment(SUFFIX);
        mkdirSync(TESTS_TEST_DIR, {recursive: true});
        copyPreparedMainProjectBase(SUFFIX);

        // Create basic configuration
        const configContent = `
const config = {
    includes: ['src/**/*.{js,ts,jsx,tsx}', 'app/components/**/*.{js,ts}'],
    excludes: ['node_modules', 'dist', 'build', '**/*.test.ts'],
    outputDir: 'public/locales/en',
    onConfigGeneration: (params) => {
        return params.config;
    }
};
module.exports = config;`;
        writeFileSync(join(TESTS_TEST_DIR, CONFIG_FILE_NAME), configContent);

        // Create source directory and lang tag definition
        const srcDir = join(TESTS_TEST_DIR, 'src');
        mkdirSync(srcDir, {recursive: true});

        const langTagDefinition = `
    export function lang(translations: any, options: any) {
        return translations;
    }
`;
        writeFileSync(join(srcDir, 'lang-tag.ts'), langTagDefinition);
    });

    afterEach(() => {
        clearTestsEnvironment(SUFFIX);
    });

    afterAll(() => {
        clearPreparedMainProjectBase(SUFFIX);
    });


    it('should', async () => {
    })
});
