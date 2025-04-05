import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {execSync} from 'child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {
    clearPreparedMainProjectBase,
    clearTestsEnvironment,
    copyPreparedMainProjectBase,
    prepareMainProjectBase,
    TESTS_TEST_DIR as _TESTS_TEST_DIR
} from "./utils.ts";
import {CONFIG_FILE_NAME, EXPORTS_FILE_NAME} from '@/cli/constants.ts';

const SUFFIX = 'collect';
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

    const translations1 = lang({"hello": "Hello World"}, {"namespace": "common"});

    const translations2 = lang({"bye": "Goodbye"}, {"namespace": "common"});

    const translations3 = lang({"error": "Error occurred"}, {"namespace": "errors"});
`;

// language=typescript jsx
const FILE_WITH_LANG_TAGS_TRANSLATIONS_POSITIONS_SWAPPED = `
    // @ts-ignore
    import {lang} from "./lang-tag";

    const translations1 = lang({"namespace": "common"}, {"hello": "Hello World"});

    const translations2 = lang({"namespace": "common"}, {"bye": "Goodbye"});

    const translations3 = lang({"namespace": "errors"}, {"error": "Error occurred"});
`;

describe('collect command e2e tests', () => {

    // Functions cannot be stringified
    const testConfigImportFunction = `({packageName, originalExportName}) => {
        return {
            fileName: packageName + '.ts',
            exportName: originalExportName,
        };
    }`;

    const testConfig = {
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
        }
    };

    function writeConfig(config: any) {
        const configString = JSON.stringify(config, null, 2)
            .replace('"$onImport$"', testConfigImportFunction);

        writeFileSync(
            join(TESTS_TEST_DIR, CONFIG_FILE_NAME),
            `const config = ${configString};\nmodule.exports = config;`
        );
    }

    beforeAll(() => {
        prepareMainProjectBase(SUFFIX);
    });

    beforeEach(() => {
        clearTestsEnvironment(SUFFIX);

        mkdirSync(TESTS_TEST_DIR, {recursive: true});

        copyPreparedMainProjectBase(SUFFIX);

        writeConfig(testConfig);

        const srcDir = join(TESTS_TEST_DIR, 'src');

        mkdirSync(srcDir, {recursive: true});

        // Create the lang tag implementation
        writeFileSync(join(srcDir, 'lang-tag.ts'), LANG_TAG_DEFINITION);

        // Create a test file with translations
        writeFileSync(join(srcDir, 'test.ts'), FILE_WITH_LANG_TAGS);
    });

    afterEach(() => {
        clearTestsEnvironment(SUFFIX);
    });

    afterAll(() => {
        clearPreparedMainProjectBase(SUFFIX);
    });

    it('should collect translations and create output files', () => {
        // Run the collect command with output
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify output files were created
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        expect(existsSync(join(outputDir, 'common.json'))).toBe(true);
        expect(existsSync(join(outputDir, 'errors.json'))).toBe(true);

        // Verify content of output files
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // test.ts
            hello: 'Hello World',
            bye: 'Goodbye'
        });

        const errorTranslations = JSON.parse(
            readFileSync(join(outputDir, 'errors.json'), 'utf-8')
        );
        expect(errorTranslations).toEqual({
            // test.ts
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
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify merged content
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // test.ts
            hello: 'Hello World',
            bye: 'Goodbye',

            // already at common.json
            existing: 'Existing translation'
        });
    });

    it('should handle library mode correctly', () => {
        // Modify config for library mode
        const libraryConfig = {...testConfig, isLibrary: true};
        writeConfig(libraryConfig);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

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
        writeConfig(configPos2);

        // Create a test file with swapped arguments
        const testFile = join(TESTS_TEST_DIR, 'src/test.ts');
        writeFileSync(testFile, FILE_WITH_LANG_TAGS_TRANSLATIONS_POSITIONS_SWAPPED);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify output files were created with correct content
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // test.ts
            hello: 'Hello World',
            bye: 'Goodbye'
        });

        const errorTranslations = JSON.parse(
            readFileSync(join(outputDir, 'errors.json'), 'utf-8')
        );
        expect(errorTranslations).toEqual({
            // test.ts
            error: 'Error occurred'
        });
    });

    it('should handle nested translation paths correctly', () => {
        // Create a test file with nested translations
        const nestedTranslationsFile = `
            import {lang} from "./lang-tag";

            const translations = lang({
                "user": {
                    "profile": {
                        "title": "User Profile",
                        "settings": {
                            "notifications": "Notification Settings"
                        }
                    }
                }
            }, {"namespace": "common", "path": "components.user_page"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/nested.ts'), nestedTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify nested structure in output file
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // nested.ts
            components: {
                user_page: {
                    user: {
                        profile: {
                            title: "User Profile",
                            settings: {
                                notifications: "Notification Settings"
                            }
                        }
                    }
                }
            },
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye'
        });
    });

    it('should handle library imports with --libraries flag', async () => {
        // Create a library project structure
        const libraryDir = join(TESTS_TEST_DIR, 'node_modules/test-lib');
        mkdirSync(libraryDir, {recursive: true});

        // Create library exports file
        const libraryExports = {
            language: "en",
            packageName: "test-lib",
            files: {
                "src/components.ts": {
                    matches: [{
                        translations: '{"button": {"label": "Click me"}}',
                        config: '{"namespace": "common"}',
                        variableName: "buttonTranslations"
                    }]
                }
            }
        };

        writeFileSync(join(libraryDir, EXPORTS_FILE_NAME), JSON.stringify(libraryExports, null, 2));

        // Run collect with --libraries flag
        execSync('npm run c -- --libraries', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify imported translations were created
        const importedDir = join(TESTS_TEST_DIR, 'src/lang-libraries');
        const importedTagFile = join(importedDir, 'test-lib.ts');
        expect(existsSync(importedTagFile)).toBe(true);

        const importedContent = readFileSync(importedTagFile, 'utf-8');
        expect(importedContent.endsWith('export const buttonTranslations = lang({"button": {"label": "Click me"}}, {"namespace": "common"});')).toBeTruthy();
    });

    it('should handle multiple files with translations', () => {
        // Create multiple test files
        const file1 = `
            import {lang} from "./lang-tag";
            const translations = lang({"greeting": "Hello"}, {"namespace": "common"});
        `;
        const file2 = `
            import {lang} from "./lang-tag";
            const translations = lang({"farewell": "Goodbye"}, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/file1.ts'), file1);
        writeFileSync(join(TESTS_TEST_DIR, 'src/file2.ts'), file2);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify all translations were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            greeting: "Hello",
            farewell: "Goodbye",
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye'
        });
    });

    it('should handle empty translation objects', () => {
        // Create a test file with empty translations
        const emptyTranslationsFile = `
            import {lang} from "./lang-tag";
            const translations = lang({}, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/empty.ts'), emptyTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify empty object was handled correctly
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye'
        });
    });

    it('should handle invalid translation configurations gracefully', () => {
        // Create a test file with invalid config
        const invalidConfigFile = `
            import {lang} from "./lang-tag";
            const translations = lang({"key": "value"}, {"invalid": "config"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/invalid.ts'), invalidConfigFile);

        // Run the collect command and expect it to complete without error
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify the file was still processed
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        expect(existsSync(join(outputDir, 'common.json'))).toBe(true);
    });

    it('should handle translations with variables', () => {
        // Create a test file with translations containing variables
        const variableTranslationsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "welcome": "Welcome {{name}}!",
                "items": "You have {{count}} items in your cart",
                "price": "Total price: {{currency}}{{amount}}"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/variables.ts'), variableTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify translations with variables were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye',
            // variables.ts
            welcome: "Welcome {{name}}!",
            items: "You have {{count}} items in your cart",
            price: "Total price: {{currency}}{{amount}}"
        });
    });

    it('should handle translations with HTML tags', () => {
        // Create a test file with translations containing HTML
        const htmlTranslationsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "title": "<h1>Welcome</h1>",
                "description": "<p>This is a <strong>test</strong> description</p>",
                "button": "<button>Click <span>here</span></button>"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/html.ts'), htmlTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify HTML translations were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye',
            // html.ts
            title: "<h1>Welcome</h1>",
            description: "<p>This is a <strong>test</strong> description</p>",
            button: "<button>Click <span>here</span></button>"
        });
    });

    it('should handle multiple namespaces in the same file', () => {
        // Create a test file with multiple namespaces
        const multiNamespaceFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const commonTranslations = lang({
                "common": "Common text"
            }, {"namespace": "common"});

            const errorsTranslations = lang({
                "error": "Error message 2"
            }, {"namespace": "errors"});

            const settingsTranslations = lang({
                "setting": "Setting value"
            }, {"namespace": "settings"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/multi-namespace.ts'), multiNamespaceFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify translations in different namespaces
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye',
            // multi-namespace.ts
            common: "Common text"
        });

        const errorsTranslations = JSON.parse(
            readFileSync(join(outputDir, 'errors.json'), 'utf-8')
        );
        expect(errorsTranslations).toEqual({
            // multi-namespace.ts
            // was overridden by:
            // error translations from "test.ts"
            // cause 'test.ts' was indexed later than 'multi-namespace.ts'
            error: "Error occurred"
        });

        const settingsTranslations = JSON.parse(
            readFileSync(join(outputDir, 'settings.json'), 'utf-8')
        );
        expect(settingsTranslations).toEqual({
            // multi-namespace.ts
            setting: "Setting value"
        });
    });

    it('should handle translations with special characters', () => {
        // Create a test file with special characters
        const specialCharsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "special": "Special chars: !@#$%^&*()_+",
                "unicode": "Unicode: 你好, こんにちは, 안녕하세요",
                "emoji": "Emoji: 😀 🌟 🎉",
                "quotes": "Quotes: 'single' and \\"double\\"",
                "newlines": "Line 1\\nLine 2\\nLine 3"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/special-chars.ts'), specialCharsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify special characters were handled correctly
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations).toEqual({
            // Base common translations from "test.ts"
            hello: 'Hello World',
            bye: 'Goodbye',
            // special-chars.ts
            special: "Special chars: !@#$%^&*()_+",
            unicode: "Unicode: 你好, こんにちは, 안녕하세요",
            emoji: "Emoji: 😀 🌟 🎉",
            quotes: "Quotes: 'single' and \"double\"",
            newlines: "Line 1\nLine 2\nLine 3"
        });
    });

    it('should throw an error for translations containing arrays', () => {
        // Create a test file with nested arrays
        const nestedArraysFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                menu: {
                    items: [
                        {label: "Home", url: "/"},
                        {label: "About", url: "/about"},
                    ]
                }
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/nested-arrays.ts'), nestedArraysFile);

        try {
            // Run the collect command
            execSync('npm run c', {
                cwd: TESTS_TEST_DIR,
                encoding: 'utf8',
                stdio: ['pipe', 'ignore', 'pipe']
            });
        } catch (error: any) {
            expect(error.message).toContain("Trying to write array into target key")
        }
    });

    it('should handle duplicate translation keys by keeping the last occurrence', () => {
        // Create a test file with duplicate keys
        const duplicateKeysFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations1 = lang({
                "greeting": "Hello first"
            }, {"namespace": "common"});

            const translations2 = lang({
                "greeting": "Hello second"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/duplicates.ts'), duplicateKeysFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify only the last occurrence was kept
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations.greeting).toBe("Hello second");
    });

    it('should handle different file extensions correctly', () => {
        // Create test files with different extensions
        const tsxFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "tsx": "TSX translation"
            }, {"namespace": "common"});
        `;

        const jsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "js": "JS translation"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/test.tsx'), tsxFile);
        writeFileSync(join(TESTS_TEST_DIR, 'src/test.js'), jsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify translations from both file types were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations.tsx).toBe("TSX translation");
        expect(commonTranslations.js).toBe("JS translation");
    });

    it('should skip tags containing malformed JSON', () => {
        // Create a test file with malformed JSON
        const malformedJsonFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "valid": "Valid translation",
                "malformed": "Missing closing quote,
                "object": {unclosed: "object"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/malformed.ts'), malformedJsonFile);

        // Run the collect command and expect it to complete without error
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify the file was still processed and valid translations were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        expect(commonTranslations.valid).toBeUndefined();
    });

    it('should handle very large translation objects', () => {
        // Create a test file with a large number of translations
        const largeTranslationsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                ${Array.from({length: 1000}, (_, i) => `"key${i}": "Translation ${i}"`).join(',\n')}
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/large.ts'), largeTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify all translations were collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        
        // Check a few random keys to verify they were collected
        expect(commonTranslations.key0).toBe("Translation 0");
        expect(commonTranslations.key499).toBe("Translation 499");
        expect(commonTranslations.key999).toBe("Translation 999");
        
        // Verify the total number of keys
        expect(Object.keys(commonTranslations).length).toBeGreaterThan(1000);
    });

    it('should ignore files with extensions not included in the configuration', () => {
        // Create test files with unsupported extensions
        const cssFile = `
            /* CSS file with lang tag */
            .selector {
                content: lang({"css": "CSS translation"}, {"namespace": "common"});
            }
        `;

        const htmlFile = `
            <!-- HTML file with lang tag -->
            <div>
                <script>
                    const translations = lang({"html": "HTML translation"}, {"namespace": "common"});
                </script>
            </div>
        `;

        const jsonFile = `
            {
                "translations": lang({"json": "JSON translation"}, {"namespace": "common"})
            }
        `;

        const mdFile = `
            # Markdown file with lang tag
            
            \`\`\`js
            const translations = lang({"markdown": "Markdown translation"}, {"namespace": "common"});
            \`\`\`
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/styles.css'), cssFile);
        writeFileSync(join(TESTS_TEST_DIR, 'src/index.html'), htmlFile);
        writeFileSync(join(TESTS_TEST_DIR, 'src/data.json'), jsonFile);
        writeFileSync(join(TESTS_TEST_DIR, 'src/README.md'), mdFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify translations from unsupported file types were not collected
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        
        // Check that the translations from unsupported files are not present
        expect(commonTranslations.css).toBeUndefined();
        expect(commonTranslations.html).toBeUndefined();
        expect(commonTranslations.json).toBeUndefined();
        expect(commonTranslations.markdown).toBeUndefined();
        
        // Verify that the base translations from test.ts are still present
        expect(commonTranslations.hello).toBe("Hello World");
        expect(commonTranslations.bye).toBe("Goodbye");
    });

    it('should handle deeply nested translation objects', () => {
        // Create a test file with deeply nested translations
        const deeplyNestedFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                "level1": {
                    "level2": {
                        "level3": {
                            "level4": {
                                "level5": {
                                    "level6": {
                                        "level7": {
                                            "level8": {
                                                "level9": {
                                                    "level10": "Deeply nested translation"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/deeply-nested.ts'), deeplyNestedFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify deeply nested translations were collected correctly
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        
        // Check that the deeply nested structure was preserved
        expect(commonTranslations.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10)
            .toBe("Deeply nested translation");
    });

    // it('should handle translations with complex regex patterns', () => {
    //     // Create a test file with translations containing regex patterns
    //     const regexTranslationsFile = `
    //         // @ts-ignore
    //         import {lang} from "./lang-tag";
    //
    //         const translations = lang({
    //             "regex1": "Pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/",
    //             "regex2": "Pattern: /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$/",
    //             "regex3": "Pattern: /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/",
    //             "regex4": "Pattern: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/"
    //         }, {"namespace": "common"});
    //     `;
    //
    //     writeFileSync(join(TESTS_TEST_DIR, 'src/regex.ts'), regexTranslationsFile);
    //
    //     // Run the collect command
    //     execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});
    //
    //     // Verify regex patterns were collected correctly
    //     const outputDir = join(TESTS_TEST_DIR, 'locales/en');
    //     const commonTranslations = JSON.parse(
    //         readFileSync(join(outputDir, 'common.json'), 'utf-8')
    //     );
    //
    //     // Check that the regex patterns were preserved
    //     expect(commonTranslations.regex1).toContain("/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/");
    //     expect(commonTranslations.regex2).toContain("/^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$/");
    //     expect(commonTranslations.regex3).toContain("/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/");
    //     expect(commonTranslations.regex4).toContain("/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/");
    // });

    it('should handle translations with comments', () => {
        // Create a test file with translations containing comments
        const commentsTranslationsFile = `
            // @ts-ignore
            import {lang} from "./lang-tag";

            const translations = lang({
                // This is a comment inside the translations object
                "key1": "Value 1",
                
                // Another comment
                "key2": "Value 2",
                
                /* 
                 * Multi-line comment
                 * inside the translations object
                 */
                "key3": "Value 3",
                
                // Comment with special characters: /* */ // 
                "key4": "Value 4"
            }, {"namespace": "common"});
        `;

        writeFileSync(join(TESTS_TEST_DIR, 'src/comments.ts'), commentsTranslationsFile);

        // Run the collect command
        execSync('npm run c', {cwd: TESTS_TEST_DIR, stdio: 'ignore'});

        // Verify translations with comments were collected correctly
        const outputDir = join(TESTS_TEST_DIR, 'locales/en');
        const commonTranslations = JSON.parse(
            readFileSync(join(outputDir, 'common.json'), 'utf-8')
        );
        
        // Check that the translations were collected correctly despite the comments
        expect(commonTranslations.key1).toBe("Value 1");
        expect(commonTranslations.key2).toBe("Value 2");
        expect(commonTranslations.key3).toBe("Value 3");
        expect(commonTranslations.key4).toBe("Value 4");
    });
}); 