import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {execSync} from 'child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {
    copyPreparedMainProjectBase,
    prepareMainProjectBase,
    removeTestDirectory,
    TESTS_TEST_DIR as _TESTS_TEST_DIR,
    clearPreparedMainProjectBase,
} from "./utils.ts";
import {CONFIG_FILE_NAME} from "@/cli/constants.ts";
import JSON5 from 'json5';
import {findLangTags} from "@/cli/processor.ts";
import {LangTagTranslationsConfig} from "@/index.ts";

const SUFFIX = 'libraries';
const MAIN_PROJECT_DIR = _TESTS_TEST_DIR + "-" + SUFFIX;
const LIBRARY_PROJECT_DIR = _TESTS_TEST_DIR + "-" + SUFFIX + '-lib';

const CONFIG_LIBRARY = {
    tagName: 'libTag',
    includes: ['src/**/*.{js,jsx,ts,tsx}'],
    // Library doesn't generate combined files, just uses tags for collection
    // outputDir: 'dist/locales/en', // Not needed for collection, only for generation
    isLibrary: true,
    translationArgPosition: 1,
};

// language=javascript
const CONFIG_MAIN_PROJECT_ON_IMPORT_FUNCTION = `(params) => {
    const {originalExportName, packageName} = params;
    return {
        exportName: originalExportName,
        fileName: packageName + '.ts'
    }
}`;

const CONFIG_MAIN_PROJECT = {
    tagName: 'lang',
    includes: ['src/**/*.{js,jsx,ts,tsx}'],
    outputDir: 'locales/en',
    isLibrary: false,
    translationArgPosition: 1,
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "../lang-tag";',
        onImport: '$onImport$'
    },
};

// language=typescript
const MAIN_PROJECT_LANG_TAG_DEFINITION = `
    // @ts-ignore
    import {
        LangTagTranslationsConfig,
        LangTagTranslations,
        createCallableTranslations
    } from "lang-tag";

    export function lang<T extends LangTagTranslations>(
        translations: T,
        config?: LangTagTranslationsConfig
    ) {
        return createCallableTranslations(translations, config, {
            transform: ({ path }) => path
        });
    }
`;

const TEST_LIBRARY_PACKAGE_NAME = 'test-library';

describe('libraries import e2e tests', () => {

    function writeConfig(dir: string, config: any, onImportFunc?: string) {
        let configString = JSON.stringify(config, null, 2);
        if (onImportFunc) {
            // Replace the placeholder string with the actual function code
            configString = configString.replace('"$onImport$"', onImportFunc);
        }

        writeFileSync(join(dir, CONFIG_FILE_NAME), `const config = ${configString};\nmodule.exports = config;`);
    }

    type LocalConfig = LangTagTranslationsConfig & {
        manual?: boolean;
    };

    interface ContentMatch {
        translations: any;
        config: LocalConfig;
    }

    function parseContent(content: string, config: any): ContentMatch[] {
        return findLangTags(config, content).map(m => {
            const argT = config.translationArgPosition === 1 ? m.content1 : (m.content2 || '{}');
            const argC = config.translationArgPosition === 1 ? (m.content2 || '{}') : m.content1;
            return ({
                translations: JSON5.parse(argT),
                config: JSON5.parse(argC),
            });
        });
    }

    beforeAll(() => {
        prepareMainProjectBase(SUFFIX);
    });

    beforeEach(() => {
        removeTestDirectory(MAIN_PROJECT_DIR);
        removeTestDirectory(LIBRARY_PROJECT_DIR);
    });

    afterEach(() => {
        removeTestDirectory(MAIN_PROJECT_DIR);
        removeTestDirectory(LIBRARY_PROJECT_DIR);
    });

    afterAll(() => {
        clearPreparedMainProjectBase(SUFFIX);
    });

    it('should import library tags using onImport configuration', () => {
        // --- Setup Main Project ---
        mkdirSync(MAIN_PROJECT_DIR, {recursive: true});
        copyPreparedMainProjectBase(SUFFIX); // Copy the template to the actual test dir
        writeConfig(MAIN_PROJECT_DIR, CONFIG_MAIN_PROJECT, CONFIG_MAIN_PROJECT_ON_IMPORT_FUNCTION); // Write main config with onImport
        const mainSrcDir = join(MAIN_PROJECT_DIR, 'src');
        mkdirSync(mainSrcDir, {recursive: true});
        // Main project needs its own lang tag def if it uses tags directly or for generated library files
        writeFileSync(join(mainSrcDir, 'lang-tag.ts'), MAIN_PROJECT_LANG_TAG_DEFINITION.replace(/@ts-ignore/g, ""));

        // --- Setup Library Project ---

        // language=typescript
        const LIBRARY_LANG_TAG_DEFINITION = `
            // @ts-ignore
            import {
                LangTagTranslationsConfig,
                LangTagTranslations,
                createCallableTranslations
            } from "lang-tag";

            export function libTag<T extends LangTagTranslations>(
                translations: T,
                config?: LangTagTranslationsConfig
            ) {
                return createCallableTranslations(translations, config, {
                    transform: ({ path }) => path
                });
            }
        `;

        // language=typescript
        const LIBRARY_SOURCE_FILE = `
            // @ts-ignore
            import {libTag} from "./lang-tag"; // Relative import within the library

            const libTranslations1 = libTag({"libraryHello": "Hello from Library"}, {
                "namespace": "conversational",
                "path": "greetings"
            });
            const libTranslations2 = libTag({"libraryBye": "Bye from Library"}, {
                "namespace": "conversational",
                "path": "farewells"
            });
        `;
        mkdirSync(LIBRARY_PROJECT_DIR, {recursive: true});
        copyPreparedMainProjectBase(SUFFIX, LIBRARY_PROJECT_DIR);
        // Change package.json
        const libraryPackageJSONPath = join(LIBRARY_PROJECT_DIR, 'package.json');
        const libraryPackageJSON = JSON.parse(readFileSync(libraryPackageJSONPath, 'utf-8'));
        libraryPackageJSON.name = TEST_LIBRARY_PACKAGE_NAME;
        writeFileSync(libraryPackageJSONPath, JSON.stringify(libraryPackageJSON, null, 2));
        // Library config
        writeConfig(LIBRARY_PROJECT_DIR, CONFIG_LIBRARY);
        // Library source code
        const librarySrcDir = join(LIBRARY_PROJECT_DIR, 'src');
        mkdirSync(librarySrcDir, {recursive: true});
        writeFileSync(join(librarySrcDir, 'lang-tag.ts'), LIBRARY_LANG_TAG_DEFINITION.replace(/@ts-ignore/g, ""));
        writeFileSync(join(librarySrcDir, 'translations.ts'), LIBRARY_SOURCE_FILE.replace(/@ts-ignore/g, ""));

        // --- Build & Pack Library ---
        // 1. Collect tags in the library
        try {
            execSync('npm run c', {cwd: LIBRARY_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error running 'npm run c' in library:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        // 2. Pack the library
        execSync('npm pack', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'}); // Creates $`libraryPackageJSON.name`-1.0.0.tgz

        // Test library compilation
        execSync('npm run compile', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'});

        // --- Install Library in Main Project ---
        const libraryPackagePath = join(LIBRARY_PROJECT_DIR, libraryPackageJSON.name + '-1.0.0.tgz').replace(/\\/g, '/');

        try {
            // Install the packed library as a dependency
            execSync(`npm install ${libraryPackagePath}`, {cwd: MAIN_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error installing library package:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        try {
            execSync('npm run c -- -l', {cwd: MAIN_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error running 'npm run c' in main project:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        // Test main project compilation
        execSync('npm run compile', {cwd: MAIN_PROJECT_DIR, stdio: 'ignore'});

        // Check if the import directory exists
        const importDir = join(MAIN_PROJECT_DIR, CONFIG_MAIN_PROJECT.import.dir);
        expect(existsSync(importDir), `Import directory '${importDir}' should exist`).toBe(true);

        // Check if the generated library config file exists (name modified by onImport)
        const expectedLibConfigFileName = TEST_LIBRARY_PACKAGE_NAME + '.ts'; // Based on onImport function
        const importedConfigPath = join(importDir, expectedLibConfigFileName);
        expect(existsSync(importedConfigPath), `Generated library config '${importedConfigPath}' should exist`).toBe(true);

        // Check the content of the generated library config file
        const importedConfigContent = readFileSync(importedConfigPath, 'utf-8');

        const matches = parseContent(importedConfigContent, CONFIG_MAIN_PROJECT);

        expect(matches.length).toBe(2);
        expect(matches[0].config.namespace).toEqual('conversational');
        expect(matches[0].config.path).toEqual('greetings');
        expect(matches[0].translations.libraryHello).toBeDefined();
        expect(matches[0].translations.libraryHello).toEqual('Hello from Library');
        expect(matches[1].config.namespace).toEqual('conversational');
        expect(matches[1].config.path).toEqual('farewells');
        expect(matches[1].translations.libraryBye).toBeDefined();
        expect(matches[1].translations.libraryBye).toEqual('Bye from Library');

        // Check the main project's final output directory
        const mainOutputDir = join(MAIN_PROJECT_DIR, CONFIG_MAIN_PROJECT.outputDir);
        const mainOutputFile = join(mainOutputDir, 'conversational.json'); // Default naming based on namespace 'lib'
        expect(existsSync(mainOutputFile), `Main output file '${mainOutputFile}' should exist`).toBe(true);

        const mainOutputContent = JSON5.parse(readFileSync(mainOutputFile, 'utf-8'));
        expect(mainOutputContent).toEqual({
            greetings: {libraryHello: "Hello from Library"},
            farewells: {libraryBye: "Bye from Library"}
        });
    }, 8000);

    it('should compile library and main project with flexible translations', () => {
        // --- Setup Main Project ---

        mkdirSync(MAIN_PROJECT_DIR, {recursive: true});
        copyPreparedMainProjectBase(SUFFIX); // Copy the template to the actual test dir
        writeConfig(MAIN_PROJECT_DIR, CONFIG_MAIN_PROJECT, CONFIG_MAIN_PROJECT_ON_IMPORT_FUNCTION); // Write main config with onImport
        const mainSrcDir = join(MAIN_PROJECT_DIR, 'src');
        mkdirSync(mainSrcDir, {recursive: true});
        // Main project needs its own lang tag def if it uses tags directly or for generated library files
        writeFileSync(join(mainSrcDir, 'lang-tag.ts'), MAIN_PROJECT_LANG_TAG_DEFINITION.replace(/@ts-ignore/g, ""));

        // --- Setup Library Project ---

        // language=typescript
        const LIBRARY_LANG_TAG_DEFINITION = `
            // @ts-ignore
            import {
                LangTagTranslationsConfig,
                LangTagTranslations,
                createCallableTranslations
            } from "lang-tag";

            export function libTag<T extends LangTagTranslations>(
                translations: T,
                config?: LangTagTranslationsConfig
            ) {
                return createCallableTranslations(translations, config, {
                    transform: ({ path }) => path
                });
            }
        `;

        // language=typescript
        const LIBRARY_SOURCE_FILE = `
            // @ts-ignore
            import {libTag} from "./lang-tag"; // Relative import within the library
            // @ts-ignore
            import {FlexibleTranslations, normalizeTranslations} from "lang-tag";

            const profileTranslations = libTag({
                title: "Member profile",
                welcomeMessage: "Hello, {{name}}!",
            }, {namespace: "profile"});

            interface ProfileComponentProps {
                t: FlexibleTranslations<typeof profileTranslations>;
            }

            export function ProfileComponent({t}: ProfileComponentProps) {
                const nt = normalizeTranslations(t);

                return 'Title: ' + nt.title() + 'Description: ' + nt.welcomeMessage({name: 'Paul'});
            }
        `;
            
        mkdirSync(LIBRARY_PROJECT_DIR, {recursive: true});
        copyPreparedMainProjectBase(SUFFIX, LIBRARY_PROJECT_DIR);
        // Change package.json
        const libraryPackageJSONPath = join(LIBRARY_PROJECT_DIR, 'package.json');
        const libraryPackageJSON = JSON.parse(readFileSync(libraryPackageJSONPath, 'utf-8'));
        libraryPackageJSON.name = TEST_LIBRARY_PACKAGE_NAME;
        writeFileSync(libraryPackageJSONPath, JSON.stringify(libraryPackageJSON, null, 2));
        // Library config
        writeConfig(LIBRARY_PROJECT_DIR, CONFIG_LIBRARY);
        // Library source code
        const librarySrcDir = join(LIBRARY_PROJECT_DIR, 'src');
        mkdirSync(librarySrcDir, {recursive: true});
        writeFileSync(join(librarySrcDir, 'lang-tag.ts'), LIBRARY_LANG_TAG_DEFINITION.replace(/@ts-ignore/g, ""));
        writeFileSync(join(librarySrcDir, 'some-component.ts'), LIBRARY_SOURCE_FILE.replace(/@ts-ignore/g, ""));

        // --- Build & Pack Library ---
        // execSync('npm install react', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'})
        // execSync('npm install --save-dev @types/react', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'})

        // 1. Collect tags in the library
        try {
            execSync('npm run c', {cwd: LIBRARY_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error running 'npm run c' in library:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        // 2. Pack the library
        execSync('npm pack', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'}); // Creates $`libraryPackageJSON.name`-1.0.0.tgz

        // Test library compilation
        execSync('npm run compile', {cwd: LIBRARY_PROJECT_DIR, stdio: 'ignore'});

        // --- Install Library in Main Project ---
        const libraryPackagePath = join(LIBRARY_PROJECT_DIR, libraryPackageJSON.name + '-1.0.0.tgz').replace(/\\/g, '/');

        try {
            // Install the packed library as a dependency
            execSync(`npm install ${libraryPackagePath}`, {cwd: MAIN_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error installing library package:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        try {
            execSync('npm run c -- -l', {cwd: MAIN_PROJECT_DIR, stdio: 'pipe'});
        } catch (e: any) {
            console.error("Error running 'npm run c' in main project:", e.stdout?.toString(), e.stderr?.toString());
            throw e;
        }

        // language=typescript
        const WRONG_MAIN_PROJECT_FILE = `
            // @ts-ignore
            import {ProfileComponent} from "test-library/src/some-component";
            // @ts-ignore
            import {profileTranslations} from "./lang-libraries/test-library";
            
            export function Page2() {
                return ProfileComponent({
                    t: {
                        notExistingKey: 'Should fail',
                        welcomeMessage: (props: any) => 'Hello ' + props.name,
                    }
                });
            }
        `;
        writeFileSync(join(mainSrcDir, 'page.ts'), WRONG_MAIN_PROJECT_FILE.replace(/@ts-ignore/g, ""));

        // Main project should fail compilation
        try {
            execSync('npm run compile', {
                cwd: MAIN_PROJECT_DIR,
                encoding: 'utf8',
                stdio: ['pipe', 'ignore', 'pipe']
            });
        } catch (error: any) {
            expect(error.message).toContain("Command failed: npm run compile")
        }

        // language=typescript
        const PROPER_MAIN_PROJECT_FILE = `
            // @ts-ignore
            import {ProfileComponent} from "test-library/src/some-component";
            // @ts-ignore
            import {profileTranslations} from "./lang-libraries/test-library";

            export function Page1() {
                return ProfileComponent({ t: profileTranslations });
            }

            export function Page2() {
                return ProfileComponent({
                    t: {
                        title: 'Custom title',
                        welcomeMessage: (props: any) => 'Hello ' + props.name,
                    }
                });
            }
        `;
        writeFileSync(join(mainSrcDir, 'page.ts'), PROPER_MAIN_PROJECT_FILE.replace(/@ts-ignore/g, ""));

        // Test main project compilation
        execSync('npm run compile', {cwd: MAIN_PROJECT_DIR, stdio: 'ignore'});
    }, 8000);

});