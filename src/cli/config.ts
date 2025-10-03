import {LangTagTranslationsConfig} from "@/index.ts";

export interface LangTagConfig {
    /**
     * Tag name used to mark translations in code.
     * @default 'lang'
     */
    tagName: string;

    /**
     * Glob patterns specifying directories/files to include when searching for translations.
     * @default ['src/** /*.{js,ts,jsx,tsx}']
     */
    includes: string[];

    /**
     * Glob patterns specifying directories/files to exclude when searching for translations.
     * @default ['node_modules', 'dist', 'build', '** /*.test.ts']
     */
    excludes: string[];

    /**
     * Output directory for generated translation namespace files (e.g., common.json, errors.json).
     * @default 'locales/en'
     */
    outputDir: string;

    collect?: {
        /**
         * @default 'common'
         */
        defaultNamespace?: string;

        /**
         * A function called when the collected translation configuration needs to be fixed or validated.
         * Allows modification of the configuration before it's saved to the output files.
         */
        onCollectConfigFix?: (config: LangTagTranslationsConfig, langTagConfig: LangTagConfig) => LangTagTranslationsConfig;

        /**
         * A function called when there are conflicts between translation tags (e.g., same key in different namespaces).
         * Allows custom resolution logic for handling duplicate or conflicting translations.
         */
        onConflictResolution?: (tag: any, tagB: any) => LangTagTranslationsConfig;
    }

    import: {
        /**
         * Output directory for generated files containing imported library tags.
         * @default 'src/lang-libraries'
         */
        dir: string;

        /**
         * The import statement used in generated library files to import the project's `lang` tag function.
         * @default 'import { lang } from "@/my-lang-tag-path"'
         */
        tagImportPath: string;

        /**
         * A function to customize the generated file name and export name for imported library tags.
         * Allows controlling how imported tags are organized and named within the generated files.
         */
        onImport: (params: LangTagOnImportParams, actions: LangTagOnImportActions) => void;

        /**
         * A function called after all lang-tags were imported
         */
        onImportFinish?: () => void;
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
     * If true, generates an exports file (`.lang-tag.exports.json`) instead of locale files.
     * @default false
     */
    isLibrary: boolean;

    /**
     * Whether to flatten the translation keys. (Currently unused)
     * @default false
     */
    // flattenKeys: boolean;

    /**
     * A function called for each found lang tag before processing.
     * Allows dynamic modification of the tag's configuration (namespace, path, etc.)
     * based on the file path or other context.
     * If it returns `undefined`, the tag's configuration is not automatically generated or updated.
     */
    onConfigGeneration: (params: LangTagOnConfigGenerationParams) => LangTagTranslationsConfig | undefined;

    debug?: boolean;
}

/**
 * Parameters passed to the `onImport` configuration function.
 */
export interface LangTagOnImportParams {
    /** The name of the package from which the tag is being imported. */
    packageName: string;
    /** The relative path to the source file within the imported package. */
    importedRelativePath: string;
    /** The original variable name assigned to the lang tag in the source library file, if any. */
    originalExportName: string | undefined;
    /** Parsed JSON translation object from the imported tag. */
    translations: Record<string, any>;
    /** Configuration object associated with the imported tag. */
    config: LangTagTranslationsConfig;
    /** A mutable object that can be used to pass data between multiple `onImport` calls for the same generated file. */
    fileGenerationData: any;
}

/**
 * Actions that can be performed within the onImport callback.
 */
export interface LangTagOnImportActions {
    /** Sets the desired file for the generated import. */
    setFile: (file: string) => void;
    /** Sets the desired export name for the imported tag. */
    setExportName: (name: string) => void;
    /** Sets the configuration for the currently imported tag. */
    setConfig: (config: LangTagTranslationsConfig) => void;
}

/**
 * Parameters passed to the `onConfigGeneration` configuration function.
 */
export interface LangTagOnConfigGenerationParams {
    /** The absolute path to the source file being processed. */
    fullPath: string;

    /** The path of the source file relative to the project root (where the command was invoked). */
    path: string;

    /** True if the file being processed is located within the configured library import directory (`config.import.dir`). */
    isImportedLibrary: boolean;

    /** The configuration object extracted from the lang tag's options argument (e.g., `{ namespace: 'common', path: 'my.path' }`). */
    config: LangTagTranslationsConfig;
}