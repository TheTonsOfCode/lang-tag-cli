import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {execSync} from 'child_process';
import {existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'fs';
import {join} from 'path';
import {
    clearPreparedMainProjectBase,
    clearTestsEnvironment,
    copyPreparedMainProjectBase,
    prepareMainProjectBase,
    TESTS_TEST_DIR as _TESTS_TEST_DIR,
} from "./utils.ts";
import {LangTagTranslationsConfig} from "lang-tag";
import {CONFIG_FILE_NAME} from "@/core/constants.ts";
import {$LT_TagProcessor} from "@/core/processor.ts";

const SUFFIX = 'regenerate';
const TESTS_TEST_DIR = _TESTS_TEST_DIR + "-" + SUFFIX;

// language=typescript jsx
const LANG_TAG_DEFINITION = `
    export function lang(translations: any, options: any) {
        return translations;
    }
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations1 = lang({"hello": "Hello World"}, {"namespace": "my-namespace", "path": "path_part_1.path_part_2"});

    const translations2 = lang({"bye": "Goodbye"}, {"namespace": "my-namespace", "path": "path_part_1.path_part_2"});

    const translations3 = lang({"error": "Error occurred"}, {"namespace": "my-namespace", "path": "path_part_1.path_part_2"});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_NO_NAMESPACE = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations1 = lang({"hello": "Hello World"}, {});

    const translations2 = lang({"bye": "Goodbye"}, {});

    const translations3 = lang({"error": "Error occurred"}, {});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_MANUAL_OVERRIDE = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations1 = lang({"hello": "Hello World"}, {"namespace": "common", "manual": true});

    const translations2 = lang({"bye": "Goodbye"}, {"namespace": "common", "manual": true});

    const translations3 = lang({"error": "Error occurred"}, {"namespace": "errors", "manual": true});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_EXCLAMATION_PREFIX = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations1 = lang({"hello": "Hello World"}, {"namespace": "common", "path": "!custom.path"});

    const translations2 = lang({"bye": "Goodbye"}, {"namespace": "common", "path": "!custom.path"});

    const translations3 = lang({"error": "Error occurred"}, {"namespace": "errors", "path": "!custom.path"});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_NESTED_OBJECTS = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({
        "greeting": {
            "hello": "Hello",
            "goodbye": "Goodbye"
        },
        "error": {
            "notFound": "Not found",
            "serverError": "Server error"
        }
    }, {});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_DIFFERENT_ORDER = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations = lang({"namespace": "common"}, {"hello": "Hello World"});
`;

describe('regenerate-tags command e2e tests', () => {

    // Functions cannot be stringified
    const testConfigImportFunction = `({packageName, originalExportName}) => {
        return {
            fileName: packageName + '.ts',
            exportName: originalExportName,
        };
    }`;

    const testConfigGenerationFunction = `async (event) => {
        const { relativePath, isImportedLibrary, config } = event;
        
        // Don't modify imported library configurations
        if (isImportedLibrary) return;
        
        // Skip auto-generation for paths starting with '!'
        if (config && config.path && config.path.startsWith('!')) {
            return;
        }
        
        // Skip auto-generation for configurations marked as manual
        if (config && config.manual) {
            return;
        }
        
        const withoutSrc = relativePath.replace(/^src\\//, '');
  
        const parts = withoutSrc.split('/');
        
        if (parts.length === 1) {
            event.save({
                ...config,
                namespace: 'too-short-path',
                path: ''
            });
            return;
        }
        
        const namespace = parts[0];
        
        const pathParts = parts.slice(1, -1);
        const newPath = pathParts.join('.');
        
        event.save({
            ...config,
            namespace,
            path: newPath
        });
    }`;

    const testConfig: any = {
        tagName: 'lang',
        includes: ['src/**/*.{js,jsx,ts,tsx}'],
        excludes: ['node_modules'],
        outputDir: 'locales/en',
        language: 'en',
        isLibrary: false,
        translationArgPosition: 1,
        import: {
            dir: 'src/lang-libraries',
            tagImportPath: 'import { lang } from "../lang-tag"',
            onImport: '$onImport$'
        },
        onConfigGeneration: '$onConfigGeneration$'
    };

    function writeConfig(config: any) {
        const configString = JSON.stringify(config, null, 2)
            .replace('"$onImport$"', testConfigImportFunction)
            .replace('"$onConfigGeneration$"', testConfigGenerationFunction);

        writeFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            `const config = ${configString};\nmodule.exports = config;`
        );
    }

    type LocalConfig = LangTagTranslationsConfig & {
        manual?: boolean;
    };
    interface ContentMatch {
        translations: any;
        config: LocalConfig;
    }

    function parseContent(content: string, config: any = testConfig): ContentMatch[] {

        const processor = new $LT_TagProcessor(config);
        const tags = processor.extractTags(content);

        return tags.map(t => ({
            translations: t.parameterTranslations,
            config: t.parameterConfig,
        }));
        //
        // return findLangTags(config, content).map(m => {
        //     const argT = config.translationArgPosition === 1 ? m.content1 : (m.content2 || '{}');
        //     const argC = config.translationArgPosition === 1 ? (m.content2 || '{}') : m.content1;
        //     return ({
        //         translations: JSON5.parse(argT),
        //         config: JSON5.parse(argC),
        //     });
        // });
    }

    const srcDir = join(TESTS_TEST_DIR, 'src');
    const testDir = join(srcDir, 'my-namespace/path_part_1/path_part_2');
    const testFile = join(testDir, '/test.ts');

    beforeAll(() => {
        prepareMainProjectBase(SUFFIX);
    });

    beforeEach(() => {
        clearTestsEnvironment(SUFFIX);

        mkdirSync(TESTS_TEST_DIR, {recursive: true});

        copyPreparedMainProjectBase(SUFFIX);

        writeConfig(testConfig);

        mkdirSync(srcDir, {recursive: true});

        // Create the lang tag implementation
        writeFileSync(join(srcDir, 'lang-tag.ts'), LANG_TAG_DEFINITION);

        mkdirSync(testDir, {recursive: true});
        // Create a test file with translations
        writeFileSync(testFile, FILE_WITH_LANG_TAGS);
    });

    afterEach(() => {
        clearTestsEnvironment(SUFFIX);
    });

    afterAll(() => {
        clearPreparedMainProjectBase(SUFFIX);
    });

    it('should not modify files when no changes are needed', () => {
        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(testFile, 'utf-8');

        // Verify the file content is unchanged
        expect(fileContent).toBe(FILE_WITH_LANG_TAGS);
    });

    it('should apply onConfigGeneration to tags without namespace/multiple lang tags', () => {
        // Create a test file with translations without namespace
        writeFileSync(join(TESTS_TEST_DIR, 'src/no-namespace.ts'), FILE_WITH_LANG_TAGS_NO_NAMESPACE);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/no-namespace.ts'), 'utf-8');

        // Verify the file content has been updated with the correct namespace

        const matches = parseContent(fileContent);
        expect(matches.length).toBe(3);
        for (let match of matches) {
            expect(match.config.namespace).toEqual('too-short-path');
            expect(match.config.path).toEqual('');
        }
    });

    it('should not modify tags with manual override', () => {
        // Create a test file with translations with manual override
        writeFileSync(join(TESTS_TEST_DIR, 'src/manual-override.ts'), FILE_WITH_LANG_TAGS_MANUAL_OVERRIDE);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/manual-override.ts'), 'utf-8');

        // Verify the file content is unchanged
        expect(fileContent).toBe(FILE_WITH_LANG_TAGS_MANUAL_OVERRIDE);
    });

    it('should not modify tags with exclamation prefix in path', () => {
        // Create a test file with translations with exclamation prefix in path
        writeFileSync(join(TESTS_TEST_DIR, 'src/exclamation-prefix.ts'), FILE_WITH_LANG_TAGS_EXCLAMATION_PREFIX);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/exclamation-prefix.ts'), 'utf-8');

        // Verify the file content is unchanged
        expect(fileContent).toBe(FILE_WITH_LANG_TAGS_EXCLAMATION_PREFIX);
    });

    it('should handle nested directory structure correctly', () => {
        // Create a nested directory structure
        const nestedDir = join(TESTS_TEST_DIR, 'src/components/user/profile');
        mkdirSync(nestedDir, {recursive: true});

        // Create a test file with translations in the nested directory
        const nestedFile = `
            // @ts-ignore
            import {lang} from "../../../lang-tag";

            const translations = lang({
                "title": "User Profile",
                "description": "This is a user profile page"
            }, {});
        `;

        writeFileSync(join(nestedDir, 'index.ts'), nestedFile);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(nestedDir, 'index.ts'), 'utf-8');

        // Verify the file content has been updated with the correct namespace and path
        const matches = parseContent(fileContent);
        expect(matches.length).toBe(1);
        expect(matches[0].config.namespace).toEqual('components');
        expect(matches[0].config.path).toEqual('user.profile');
    });

    it('should handle different file extensions correctly', () => {
        // Create test files with different extensions
        const jsxFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "jsx": "JSX translation"
            }, {});
        `;

        const tsxFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "tsx": "TSX translation"
            }, {});
        `;

        const jsxDir = join(TESTS_TEST_DIR, 'src/jsx');
        mkdirSync(jsxDir, {recursive: true});
        const tsxDir = join(TESTS_TEST_DIR, 'src/tsx');
        mkdirSync(tsxDir, {recursive: true});
        writeFileSync(join(jsxDir, 'test.jsx'), jsxFile);
        writeFileSync(join(tsxDir, 'test.tsx'), tsxFile);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const jsxContent = readFileSync(join(jsxDir, 'test.jsx'), 'utf-8');
        const tsxContent = readFileSync(join(tsxDir, 'test.tsx'), 'utf-8');

        const jsxMatches = parseContent(jsxContent);
        expect(jsxMatches.length).toBe(1);
        expect(jsxMatches[0].config.namespace).toEqual('jsx');
        const tsxMatches = parseContent(tsxContent);
        expect(tsxMatches.length).toBe(1);
        expect(tsxMatches[0].config.namespace).toEqual('tsx');
    });

    // TODO: reconsider it, for now we expect objects
    // it('should handle undefined config', () => {
    //     // Create a test file with invalid lang tag usage
    //     const invalidFile = `
    //         // @ts-ignore
    //         import {lang} from "./lang-tag";
    //
    //         const translations = lang({"hello": "Hello World"}, undefined);
    //     `;
    //
    //     writeFileSync(join(TESTS_TEST_DIR, 'src/invalid.ts'), invalidFile);
    //
    //     // Run the regenerate-tags command and expect it to complete without error
    //     execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});
    //
    //     // Verify the file was still processed
    //     const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/invalid.ts'), 'utf-8');
    //     const matches = parseContent(fileContent);
    //     expect(matches.length).toBe(1);
    //     expect(matches[0].config.namespace).toEqual('too-short-path');
    //     expect(matches[0].config.path).toEqual('');
    // });

    it('should handle multiple files with the same namespace', () => {
        // Create multiple test files with the same namespace
        const file1 = `
            // @ts-ignore
            import {lang} from "./lang-tag";
            const translations = lang({"greeting": "Hello"}, {"namespace": "common"});
        `;
        const file2 = `
            // @ts-ignore
            import {lang} from "./lang-tag";
            const translations = lang({"farewell": "Goodbye"}, {"namespace": "common"});
        `;

        mkdirSync(join(TESTS_TEST_DIR, 'src/namespace1/foo'), {recursive: true});
        mkdirSync(join(TESTS_TEST_DIR, 'src/namespace2/bar'), {recursive: true});
        writeFileSync(join(TESTS_TEST_DIR, 'src/namespace1/foo/file1.ts'), file1);
        writeFileSync(join(TESTS_TEST_DIR, 'src/namespace2/bar/file2.ts'), file2);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const file1Content = readFileSync(join(TESTS_TEST_DIR, 'src/namespace1/foo/file1.ts'), 'utf-8');
        const file2Content = readFileSync(join(TESTS_TEST_DIR, 'src/namespace2/bar/file2.ts'), 'utf-8');

        // Verify the file content has been updated with the correct namespace
        const matches1 = parseContent(file1Content);
        expect(matches1.length).toBe(1);
        expect(matches1[0].config.namespace).toEqual('namespace1');
        expect(matches1[0].config.path).toEqual('foo');
        const matches2 = parseContent(file2Content);
        expect(matches2.length).toBe(1);
        expect(matches2[0].config.namespace).toEqual('namespace2');
        expect(matches2[0].config.path).toEqual('bar');
    });

    it('should handle files with no lang tags', () => {
        // Create a test file with no lang tags
        const noTagsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const notATag = "This is not a lang tag";
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/no-tags.ts'), noTagsFile);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/no-tags.ts'), 'utf-8');

        // Verify the file content is unchanged
        expect(fileContent).toBe(noTagsFile);
    });

    it('should handle nested translation objects correctly', () => {
        // Create a test file with nested translation objects
        writeFileSync(join(TESTS_TEST_DIR, 'src/nested-objects.ts'), FILE_WITH_LANG_TAGS_NESTED_OBJECTS);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/nested-objects.ts'), 'utf-8');

        // Verify the file content has been updated with the correct namespace
        const matches = parseContent(fileContent);
        expect(matches.length).toBe(1);
        expect(matches[0].config.namespace).toEqual('too-short-path');
        expect(matches[0].config.path).toEqual('');
    });

    it('should handle different argument order correctly', () => {
        const configPos2 = {...testConfig, translationArgPosition: 2};
        writeConfig(configPos2);

        // Create a test file with different argument order
        writeFileSync(join(TESTS_TEST_DIR, 'src/config-at-1-arg-pos.ts'), FILE_WITH_LANG_TAGS_DIFFERENT_ORDER);

        // Run the regenerate-tags command
        execSync('npm run rt', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Read the file content after running the command
        const fileContent = readFileSync(join(TESTS_TEST_DIR, 'src/config-at-1-arg-pos.ts'), 'utf-8');


        const processor = new $LT_TagProcessor(testConfig);
        const rawMatches = processor.extractTags(fileContent);

        expect(rawMatches.length).toBe(1);
        expect(rawMatches[0].parameter1Text).toContain('namespace');
        expect(rawMatches[0].parameter2Text).toContain('hello');

        const matches = parseContent(fileContent, configPos2);
        expect(matches.length).toBe(1);
        expect(matches[0].config.namespace).toEqual('too-short-path');
        expect(matches[0].config.path).toEqual('');

        const matchesWithConfigTranslationArgPos1 = parseContent(fileContent);
        expect(matchesWithConfigTranslationArgPos1.length).toBe(1);
        expect(matchesWithConfigTranslationArgPos1[0].config.namespace).toBeUndefined();
        expect(matchesWithConfigTranslationArgPos1[0].config.path).toBeUndefined();
    });

    it('should handle errors gracefully when config file is missing', () => {
        // Remove the config file
        const configPath = join(TESTS_TEST_DIR, CONFIG_FILE_NAME);
        if (existsSync(configPath)) {
            unlinkSync(configPath);
        }

        // Run the regenerate-tags command and expect it to fail gracefully
        try {
            execSync('npm run rt', {
                cwd: TESTS_TEST_DIR,
                encoding: 'utf8',
                stdio: ['pipe', 'ignore', 'pipe']
            });

            // If we get here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            expect(error.message).toContain("No \"lang-tag.config.js\" detected")
        }
    });

    it('should handle errors gracefully when config file is empty', () => {
        // Remove the config file
        const configPath = join(TESTS_TEST_DIR, CONFIG_FILE_NAME);
        if (existsSync(configPath)) {
            writeFileSync(configPath, '');
        }

        // Run the regenerate-tags command and expect it to fail gracefully
        try {

            execSync('npm run rt', {
                cwd: TESTS_TEST_DIR,
                encoding: 'utf8',
                stdio: ['inherit']
            });

            // If we get here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            expect(error.message).toContain("Config found, but default export is undefined")
        }
    });
}); 