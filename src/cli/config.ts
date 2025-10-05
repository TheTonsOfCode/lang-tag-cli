import {LangTagTranslationsConfig} from "@/index.ts";
import path from "pathe";

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
         * A function called when a single conflict is detected between translation tags.
         * Allows custom resolution logic for handling individual conflicts.
         * Return true to continue processing, false to stop execution.
         */
        onConflictResolution?: (conflict: $LT_Conflict) => boolean;

        /**
         * A function called after all conflicts have been collected and processed.
         * Allows custom logic to decide whether to continue or stop based on all conflicts.
         * Return true to continue processing, false to stop execution.
         */
        onCollectFinish?: (conflicts: $LT_Conflict[]) => boolean;
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

type Validity = 'ok' | 'invalid-param-1' | 'invalid-param-2' | 'translations-not-found';

export interface ProcessedTag {
    fullMatch: string;

    parameter1Text: string;
    parameter2Text?: string;
    parameterTranslations: any;
    parameterConfig?: any;

    variableName?: string;

    /** Character index in the whole text where the match starts */
    index: number;
    /** Line number (1-based) where the match was found */
    line: number;
    /** Column number (1-based) where the match starts in the line */
    column: number;

    validity: Validity;
}

export interface $LT_TagConflictInfo {
    tag: ProcessedTag;
    relativeFilePath: string;
    value: any;
}

export interface $LT_Conflict {
    path: string;
    tagA: $LT_TagConflictInfo;
    tagB: $LT_TagConflictInfo;
    conflictType: 'path_overwrite' | 'type_mismatch';
}

export const LANG_TAG_DEFAULT_CONFIG: LangTagConfig = {
    tagName: 'lang',
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build'],
    outputDir: 'locales/en',
    collect: {
        defaultNamespace: 'common',
        onCollectConfigFix: (config, langTagConfig) => {
            if (langTagConfig.isLibrary) return config;

            if (!config) return { path: '', namespace: langTagConfig.collect!.defaultNamespace!};
            if (!config.path) config.path = '';
            if (!config.namespace) config.namespace = langTagConfig.collect!.defaultNamespace!;
            return config;
        }
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: ({importedRelativePath, fileGenerationData}: LangTagOnImportParams, actions)=> {
            const exportIndex = (fileGenerationData.index || 0) + 1;
            fileGenerationData.index = exportIndex;

            actions.setFile(path.basename(importedRelativePath));
            actions.setExportName(`translations${exportIndex}`);
        }
    },
    isLibrary: false,
    language: 'en',
    translationArgPosition: 1,
    onConfigGeneration: (params: LangTagOnConfigGenerationParams) => undefined,
};