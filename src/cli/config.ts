import {LangTagTranslationsConfig} from "@/index.ts";
import path, {resolve} from 'pathe';
import {existsSync} from 'fs';
import {pathToFileURL} from 'url';
import {CONFIG_FILE_NAME} from './constants';
import {messageErrorReadingConfig} from "@/cli/message";

export interface LangTagConfig {
    /**
     * Tag name used to mark translations in code
     * @default 'lang'
     */
    tagName: string;

    /**
     * Directories to include when searching for translations
     * @default ['src']
     */
    includes: string[];

    /**
     * Directories or files to exclude when searching for translations
     * @default ['node_modules', 'dist', 'build']
     */
    excludes: string[];

    /**
     * Output directory for translation files
     * @default 'locales/en'
     */
    outputDir: string;


    import: {
        /**
         * Imported libraries definitions
         * @default 'src/lang-libraries'
         */
        dir: string;

        /**
         * Import path of lang tag used inside project
         * @default 'import { lang } from "@/my-lang-tag-path"'
         */
        tagImportPath: string;

        /**
         * You can decide there how imported file gonna be named, as well as name of exported langTag
         */
        onImport: (relativePath: string, fileGenerationData: any) => {
            fileName: string;
            exportName: string;
        };
    }

    /**
     * Determines the position of the translation argument in the `lang()` function.
     * If `1`, translations are in the first argument (`lang(translations, options)`).
     * If `2`, translations are in the second argument (`lang(options, translations)`).
     * @default 1
     */
    translationArgPosition: 1 | 2;

    /**
     * Primary language used for the library's translations.
     * Affects default language settings when used in library mode.
     * @default 'en'
     */
    language: string;

    /**
     * Indicates whether this configuration is for a translation library.
     * If true, collects to lang-tag.exports.json
     * @default false
     */
    isLibrary: boolean;

    /**
     * Whether to flatten the translation keys
     * @default false
     */
    // flattenKeys: boolean;

    onConfigGeneration: (params: LangTagOnConfigGenerationParams) => LangTagTranslationsConfig;
}

export interface LangTagOnConfigGenerationParams {
    fullPath: string;

    // path relative to command invocation
    path: string;

    isImportedLibrary: boolean;

    config: LangTagTranslationsConfig;
}