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
import {CONFIG_FILE_NAME} from '@/core/constants.ts';
import process from "node:process";

const SUFFIX = 'watch-collect';
const TESTS_TEST_DIR = _TESTS_TEST_DIR + "-" + SUFFIX;

// Once at 30 runs it happened that delay was too slow to file system catch up,
// if it will happen again, raise up the delay
const DELAY = 500;

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
    onConfigGeneration: async (event) => {
        if (event.config) {
            event.save(event.config);
        }
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

    it('should watch for file changes and update translations', async () => {
        // Create initial test file
        const testFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({"hello": "Hello World"}, {"namespace": "test"});
`;
        writeFileSync(join(TESTS_TEST_DIR, 'src/foo.ts'), testFile);

        // Run collect command to create initial translations
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Modify the test file
        const updatedTestFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({
        "hello": "Hello World",
        "goodbye": "Goodbye World"
    }, {"namespace": "test"});
`;
        writeFileSync(join(TESTS_TEST_DIR, 'src/foo.ts'), updatedTestFile);

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Check if translations were updated
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        const translationsFile = join(outputDir, 'test.json');
        expect(existsSync(translationsFile)).toBe(true);

        const translations = JSON.parse(readFileSync(translationsFile, 'utf-8'));
        expect(translations).toHaveProperty('hello', 'Hello World');
        expect(translations).toHaveProperty('goodbye', 'Goodbye World');

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });

    it('should handle file additions and deletions', async () => {
        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Create a new file with translations
        const newFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({"welcome": "Welcome"}, {"namespace": "new"});
`;
        writeFileSync(join(TESTS_TEST_DIR, 'src/new.ts'), newFile);

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Check if translations were created
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        const translationsFile = join(outputDir, 'new.json');
        expect(existsSync(translationsFile)).toBe(true);

        const translations = JSON.parse(readFileSync(translationsFile, 'utf-8'));
        expect(translations).toHaveProperty('welcome', 'Welcome');

        // Delete the file
        writeFileSync(join(TESTS_TEST_DIR, 'src/new.ts'), '');

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });

    it('should handle errors gracefully', async () => {
        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Create a file with invalid translations
        const invalidFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang("invalid", {"namespace": "test"});
`;
        writeFileSync(join(TESTS_TEST_DIR, 'src/invalid.ts'), invalidFile);

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // The watcher should continue running despite the error
        expect(process.kill(-watchProcess.pid, 0)).toBe(true);

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });

    it('should ignore changes in non-included directories', async () => {
        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Create a file in a non-included directory
        const nonIncludedDir = join(TESTS_TEST_DIR, 'other');
        mkdirSync(nonIncludedDir, {recursive: true});
        
        const nonIncludedFile = `
    // @ts-ignore
    import {lang} from "../src/lang-tag";

    const translations = lang({"ignored": "This should be ignored"}, {"namespace": "ignored"});
`;
        writeFileSync(join(nonIncludedDir, 'ignored.ts'), nonIncludedFile);

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Check that no translations were created for the ignored file
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        const translationsFile = join(outputDir, 'ignored.json');
        expect(existsSync(translationsFile)).toBe(false);

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });

    it('should watch for changes in app/components directory', async () => {
        // Create app/components directory
        const componentsDir = join(TESTS_TEST_DIR, 'app/components');
        mkdirSync(componentsDir, {recursive: true});

        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Create a component file with translations
        const componentFile = `
    // @ts-ignore
    import {lang} from "../../src/lang-tag";

    const translations = lang({"component": "Component Text"}, {"namespace": "components"});
`;
        writeFileSync(join(componentsDir, 'Button.ts'), componentFile);

        // Wait for the watcher to process the change
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Check if translations were created
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        const translationsFile = join(outputDir, 'components.json');
        expect(existsSync(translationsFile)).toBe(true);

        const translations = JSON.parse(readFileSync(translationsFile, 'utf-8'));
        expect(translations).toHaveProperty('component', 'Component Text');

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });

    it('should handle simultaneous changes in src and app/components directories', async () => {
        // Create app/components directory
        const componentsDir = join(TESTS_TEST_DIR, 'app/components');
        mkdirSync(componentsDir, {recursive: true});

        // Start watch command in background
        const watchProcess = spawn('npm', ['run', 'watch'], {
            cwd: TESTS_TEST_DIR,
            stdio: 'ignore',
            detached: true
        });

        if (!watchProcess.pid) {
            throw new Error('Failed to start watch process');
        }

        // Wait a bit for the watcher to initialize
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Create files in both directories simultaneously
        const srcFile = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({"src": "Source Text"}, {"namespace": "source"});
`;
        writeFileSync(join(TESTS_TEST_DIR, 'src/source.ts'), srcFile);

        const componentFile = `
    // @ts-ignore
    import {lang} from "../../src/lang-tag";

    const translations = lang({"component": "Component Text"}, {"namespace": "components"});
`;
        writeFileSync(join(componentsDir, 'Button.ts'), componentFile);

        // Wait for the watcher to process the changes
        await new Promise(resolve => setTimeout(resolve, DELAY));

        // Check if translations were created for both files
        const outputDir = join(TESTS_TEST_DIR, 'public/locales/en');
        const sourceTranslationsFile = join(outputDir, 'source.json');
        const componentTranslationsFile = join(outputDir, 'components.json');

        expect(existsSync(sourceTranslationsFile)).toBe(true);
        expect(existsSync(componentTranslationsFile)).toBe(true);

        const sourceTranslations = JSON.parse(readFileSync(sourceTranslationsFile, 'utf-8'));
        const componentTranslations = JSON.parse(readFileSync(componentTranslationsFile, 'utf-8'));

        expect(sourceTranslations).toHaveProperty('src', 'Source Text');
        expect(componentTranslations).toHaveProperty('component', 'Component Text');

        // Kill the watch process
        process.kill(-watchProcess.pid);
    });
});
