import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {execSync} from 'child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'fs';
import {join} from 'path';
import {
    clearPreparedMainProjectBase,
    clearTestsEnvironment, copyPreparedMainProjectBase, prepareMainProjectBase,
    TESTS_TEST_DIR,
    writeTestsConfig
} from "./utils.ts";
import {CONFIG_FILE_NAME, EXPORTS_FILE_NAME} from '@/cli/constants.ts';

// language=typescript jsx
const LANG_TAG_DEFINITION = `
    export function lang(translations: any, options: any) {
        return translations;
    }
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS = `
    import {lang} from "./lang-tag";

    const translations1 = lang({"hello": "Hello World"}, {"namespace": "common"});

    const translations2 = lang({"bye": "Goodbye"}, {"namespace": "common"});

    const translations3 = lang({"error": "Error occurred"}, {"namespace": "errors"});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_TRANSLATIONS_POSITIONS_SWAPPED = `
    import {lang} from "./lang-tag";

    const translations1 = lang({"namespace": "common"}, {"hello": "Hello World"});

    const translations2 = lang({"namespace": "common"}, {"bye": "Goodbye"});

    const translations3 = lang({"namespace": "errors"}, {"error": "Error occurred"});
`;

describe('collect command e2e tests', () => {
    const testConfig = {
        tagName: 'lang',
        includes: ['src/**/*.ts'],
        excludes: ['node_modules'],
        outputDir: 'locales/en',
        language: 'en',
        isLibrary: false,
        translationArgPosition: 1,
        import: {
            dir: 'src/lang-libraries',
            tagImportPath: 'import { lang } from "@/lang-tag"',
            onImport: (relativePath: string, fileGenerationData: any) => {
                const exportIndex = (fileGenerationData.index || 0) + 1;
                fileGenerationData.index = exportIndex;
                return {
                    fileName: fileGenerationData.fileName,
                    exportName: `translations${exportIndex}`,
                };
            }
        }
    };

    beforeAll(() => {
        prepareMainProjectBase();
    });

    beforeEach(() => {
        clearTestsEnvironment();

        mkdirSync(TESTS_TEST_DIR, {recursive: true});

        copyPreparedMainProjectBase();

        writeTestsConfig(TESTS_TEST_DIR, testConfig);

        const srcDir = join(TESTS_TEST_DIR, 'src');

        mkdirSync(srcDir, {recursive: true});

        // Create the lang tag implementation
        writeFileSync(join(srcDir, 'lang-tag.ts'), LANG_TAG_DEFINITION);

        // Create a test file with translations
        writeFileSync(join(srcDir, 'test.ts'), FILE_WITH_LANG_TAGS);
    });

    afterEach(() => {
        clearTestsEnvironment();
    });

    afterAll(() => {
        clearPreparedMainProjectBase();
    });

    it('should collect translations and create output files', () => {
        // Run the collect command with output
        execSync('npm run collect', {cwd: TESTS_TEST_DIR, stdio: 'inherit'});

        // Verify output files were created
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        expect(existsSync(join(outputDir, 'common.json'))).toBe(true);
        expect(existsSync(join(outputDir, 'errors.json'))).toBe(true);

        // Verify content of output files
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            hello: 'Hello World',
            bye: 'Goodbye'
        });

        const errorTranslations = JSON.parse(
            readFileSync(join(outputDir, 'errors.json'), 'utf-8')
        );
        expect(errorTranslations).toEqual({
            error: 'Error occurred'
        });
    });

    it('should merge with existing translations', () => {
        // Create existing translations
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');

        mkdirSync(outputDir, {recursive: true});

        writeFileSync(
            join(outputDir, 'common.json'),
            JSON.stringify({
                existing: 'Existing translation'
            }, null, 2)
        );

        // Run the collect command
        execSync('npm run collect', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify merged content
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            hello: 'Hello World',
            bye: 'Goodbye',
            existing: 'Existing translation'
        });
    });

    it('should handle library mode correctly', () => {
        // Modify config for library mode
        const libraryConfig = {...testConfig, isLibrary: true};
        writeFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            `export default ${JSON.stringify(libraryConfig, null, 2)}`
        );

        // Run the collect command
        execSync('npm run collect', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify exports file was created
        const exportsFile = join(TESTS_TEST_DIR, EXPORTS_FILE_NAME);
        expect(existsSync(exportsFile)).toBe(true);

        // Verify content of exports file
        const exports = JSON.parse(readFileSync(exportsFile, 'utf-8'));

        expect(exports.language).toBe("en");
        expect(exports.packageName).toBe("test-main-project");

        expect(exports.files).toBeDefined();

        expect(exports.files["src/test.ts"]).toBeDefined();

        const matches = exports.files["src/test.ts"].matches;
        expect(Array.isArray(matches)).toBeTruthy();
        expect(matches.length).toBe(3);

        expect(matches[0].translations).toBe("{\"hello\": \"Hello World\"}");
        expect(matches[0].config).toBe("{\n    namespace: 'common',\n}");
        expect(matches[0].variableName).toBe("translations1");

        expect(matches[1].translations).toBe("{\"bye\": \"Goodbye\"}");
        expect(matches[1].config).toBe("{\n    namespace: 'common',\n}");
        expect(matches[1].variableName).toBe("translations2");

        expect(matches[2].translations).toBe("{\"error\": \"Error occurred\"}");
        expect(matches[2].config).toBe("{\n    namespace: 'errors',\n}");
        expect(matches[2].variableName).toBe("translations3");
    });

    it('should handle translation argument position correctly', () => {
        // Modify config for different translation position
        const configPos2 = {...testConfig, translationArgPosition: 2};
        writeFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            `export default ${JSON.stringify(configPos2, null, 2)}`
        );

        // Create a test file with swapped arguments
        const testFile = join(TESTS_TEST_DIR, 'src/test.ts');
        writeFileSync(testFile, FILE_WITH_LANG_TAGS_TRANSLATIONS_POSITIONS_SWAPPED);

        // Run the collect command
        execSync('npm run collect', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify output files were created with correct content
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            hello: 'Hello World',
            bye: 'Goodbye'
        });

        const errorTranslations = JSON.parse(
            readFileSync(join(outputDir, 'errors.json'), 'utf-8')
        );
        expect(errorTranslations).toEqual({
            error: 'Error occurred'
        });
    });
}); 