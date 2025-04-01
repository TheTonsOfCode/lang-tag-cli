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


    // importDir: string;

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

    onConfigGeneration: (params: ConfigGenerationParams) => LangTagTranslationsConfig;
}

interface ConfigGenerationParams {
    fullPath: string;

    // path relative to command invocation
    path: string;

    isImportedLibrary: boolean;

    config: LangTagTranslationsConfig;
}

export const defaultConfig: LangTagConfig = {
    tagName: 'lang',
    includes: ['src/**/*.{js,ts}'],
    excludes: ['node_modules', 'dist', 'build'],
    outputDir: 'locales/en',
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: (relativePath: string, fileGenerationData: any)=> {
            const exportIndex = (fileGenerationData.index || 0) + 1;
            fileGenerationData.index = exportIndex;
            return {
                fileName: path.basename(relativePath),
                exportName: `translations${exportIndex}`,
            };
        }
    },
    isLibrary: false,
    language: 'en',
    translationArgPosition: 1,
    onConfigGeneration: (params: ConfigGenerationParams) => params.config,
};

export async function readConfig(projectPath: string): Promise<LangTagConfig> {
    const configPath = resolve(projectPath, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
        throw new Error(`No "${CONFIG_FILE_NAME}" detected`)
        // return defaultConfig;
    }

    try {
        const configModule = await import(pathToFileURL(configPath).href);
        const userConfig: Partial<LangTagConfig> = configModule.default || {};

        return {
            ...defaultConfig,
            ...userConfig,
            import: {
                ...defaultConfig.import,
                ...userConfig.import,
            }
        };
    } catch (error) {
        messageErrorReadingConfig(error);
        return defaultConfig;
    }
}