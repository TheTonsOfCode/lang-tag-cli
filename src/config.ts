import {LangTagTranslationsConfig} from "lang-tag";
import path from "pathe";
import {LangTagCLILogger} from "./logger.ts";
import {TranslationsCollector} from "@/algorithms/collector/type.ts";
import {NamespaceCollector} from "@/algorithms/collector/namespace-collector.ts";

export interface LangTagCLIConfig {
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
     * Root directory for translation files. 
     * The actual file structure depends on the collector implementation used.
     * @default 'locales'
     * @example With baseLanguageCode='en' and localesDirectory='locales':
     *   - NamespaceCollector (default): locales/en/common.json, locales/en/errors.json
     *   - DictionaryCollector: locales/en.json (all translations in one file)
     */
    localesDirectory: string;

    /**
     * The language in which translation values/messages are written in the codebase.
     * This determines the source language for your translations.
     * @default 'en'
     * @example 'en' - Translation values are in English: lang({ helloWorld: 'Hello World' })
     * @example 'pl' - Translation values are in Polish: lang({ helloWorld: 'Witaj Świecie' })
     */
    baseLanguageCode: string;

    /**
     * Indicates whether this configuration is for a translation library.
     * If true, generates an exports file (`.lang-tag.exports.json`) instead of locale files.
     * @default false
     */
    isLibrary: boolean;

    collect?: {
        /**
         * Translation collector that defines how translation tags are organized into output files.
         * If not specified, NamespaceCollector is used by default.
         * @default NamespaceCollector
         * @example DictionaryCollector - All translations in single file per language
         * @example NamespaceCollector - Separate files per namespace within language directory
         */
        collector?: TranslationsCollector;

        /**
         * @default 'common'
         */
        defaultNamespace?: string;

        /**
         * When true, conflicts are not reported when two translation tags have the same path but identical values.
         * This is useful for shared translations that appear in multiple files with the same content.
         * @default true
         */
        ignoreConflictsWithMatchingValues?: boolean;

        /**
         * A function called when the collected translation configuration needs to be fixed or validated.
         * Allows modification of the configuration before it's saved to the output files.
         */
        onCollectConfigFix?: (event: LangTagCLICollectConfigFixEvent) => LangTagTranslationsConfig;

        /**
         * A function called when a single conflict is detected between translation tags.
         * Allows custom resolution logic for handling individual conflicts.
         * Return true to continue processing, false to stop execution.
         */
        onConflictResolution?: (event: LangTagCLIConflictResolutionEvent) => Promise<void>;

        /**
         * A function called after all conflicts have been collected and processed.
         * Allows custom logic to decide whether to continue or stop based on all conflicts.
         * Return true to continue processing, false to stop execution.
         */
        onCollectFinish?: (event: LangTagCLICollectFinishEvent) => void;
    }

    /**
     * A function called for each found lang tag before processing.
     * Allows dynamic modification of the tag's configuration (namespace, path, etc.)
     * based on the file path or other context.
     *
     * **IMPORTANT:** The `event.config` object is deeply frozen and immutable. Any attempt
     * to directly modify it will throw an error. To update the configuration, you must
     * use `event.save(newConfig)` with a new configuration object.
     *
     * Changes made inside this function are **applied only if you explicitly call**
     * `event.save(configuration)`. Returning a value or modifying the event object
     * without calling `save()` will **not** update the configuration.
     *
     * @example
     * ```ts
     * onConfigGeneration: async (event) => {
     *   // ❌ This will throw an error:
     *   // event.config.namespace = "new-namespace";
     *
     *   // ✅ Correct way to update:
     *   event.save({
     *     ...event.config,
     *     namespace: "new-namespace",
     *     path: "new.path"
     *   });
     * }
     * ```
     */
    onConfigGeneration: (event: LangTagCLIConfigGenerationEvent) => Promise<void>;

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
        onImport: (event: LangTagCLIImportEvent) => void;

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

    // /**
    //  * Whether to flatten the translation keys. (Currently unused)
    //  * @default false
    //  */
    // flattenKeys: boolean;

    debug?: boolean;
}

type Validity = 'ok' | 'invalid-param-1' | 'invalid-param-2' | 'translations-not-found';

export interface LangTagCLIProcessedTag {
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

export interface LangTagCLITagConflictInfo {
    tag: LangTagCLIProcessedTag;
    relativeFilePath: string;
    value: any;
}

export interface LangTagCLIConflict {
    path: string;
    tagA: LangTagCLITagConflictInfo;
    tagB: LangTagCLITagConflictInfo;
    conflictType: 'path_overwrite' | 'type_mismatch';
}

/*
 * Import & Export
 */

export interface LangTagCLIImportedTag {
    variableName: string;

    translations: any;

    config: any;
}

export interface LangTagCLIImportedTagsFile {
    pathRelativeToImportDir: string;

    tags: LangTagCLIImportedTag[]
}

export interface LangTagCLIExportData {

    baseLanguageCode: string;

    files: LangTagCLIExportDataFile[];
}

export interface LangTagCLIExportDataFile {
    relativeFilePath: string;

    tags: LangTagCLIExportDataTag[]
}

export interface LangTagCLIExportDataTag {
    variableName: string | undefined,
    translations: object,
    config: object | undefined,
}

/*
 * Events
 */

export interface LangTagCLIImportEvent {
    exports: {
        packageJSON: any;
        exportData: LangTagCLIExportData;
    }[];

    importTag(pathRelativeToImportDir: string, tag: LangTagCLIImportedTag): void;
}

export interface LangTagCLIConfigGenerationEvent {
    /** The absolute path to the source file being processed. */
    readonly absolutePath: string;

    /** The path of the source file relative to the project root (where the command was invoked). */
    readonly relativePath: string;

    /** True if the file being processed is located within the configured library import directory (`config.import.dir`). */
    readonly isImportedLibrary: boolean;

    /** 
     * The configuration object extracted from the lang tag's options argument (e.g., `{ namespace: 'common', path: 'my.path' }`).
     * 
     * **This object is deeply frozen and immutable.** Any attempt to modify it will throw an error in strict mode.
     * To update the configuration, use the `save()` method with a new configuration object.
     */
    readonly config: Readonly<LangTagTranslationsConfig> | undefined;

    readonly langTagConfig: LangTagCLIConfig

    /**
     * Indicates whether the `save()` method has been called during this event.
     */
    readonly isSaved: boolean;

    /**
     * The updated configuration that was passed to the `save()` method.
     * - `undefined` if `save()` has not been called yet
     * - `null` if `save(null)` was called to remove the configuration
     * - `LangTagTranslationsConfig` object if a new configuration was saved
     */
    readonly savedConfig: LangTagTranslationsConfig | null | undefined;

    /**
     * Tells CLI to replace tag configuration
     * null = means configuration will be removed
     **/
    save(config: LangTagTranslationsConfig | null, triggerName?: string): void;
}

export interface LangTagCLICollectConfigFixEvent {
    config: LangTagTranslationsConfig,
    langTagConfig: LangTagCLIConfig
}

export interface LangTagCLIConflictResolutionEvent {
    conflict: LangTagCLIConflict,
    logger: LangTagCLILogger
    /** Breaks translation collection process */
    exit(): void;
}

export interface LangTagCLICollectFinishEvent {
    totalTags: number;
    namespaces: Record<string, Record<string, any>>
    conflicts: LangTagCLIConflict[]
    logger: LangTagCLILogger
    /** Breaks translation collection process */
    exit(): void;
}

export const LANG_TAG_DEFAULT_CONFIG: LangTagCLIConfig = {
    tagName: 'lang',
    isLibrary: false,
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build'],
    localesDirectory: 'locales',
    baseLanguageCode: 'en',
    collect: {
        collector: new NamespaceCollector(),
        defaultNamespace: 'common',
        ignoreConflictsWithMatchingValues: true,
        onCollectConfigFix: ({config, langTagConfig}) => {
            if (langTagConfig.isLibrary) return config;

            if (!config) return { path: '', namespace: langTagConfig.collect!.defaultNamespace!};
            if (!config.path) config.path = '';
            if (!config.namespace) config.namespace = langTagConfig.collect!.defaultNamespace!;
            return config;
        },
        onConflictResolution: async event => {
            await event.logger.conflict(event.conflict, true);
            // By default, continue processing even if conflicts occur
            // Call event.exit(); to terminate the process upon the first conflict
        },
        onCollectFinish: event => {
            if (event.conflicts.length) event.exit(); // Stop the process to avoid merging on conflict
        }
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        // onImport: ({importedRelativePath, fileGenerationData}: LangTagCLIOnImportParams, actions)=> {
        //     const exportIndex = (fileGenerationData.index || 0) + 1;
        //     fileGenerationData.index = exportIndex;
        //
        //     actions.setFile(path.basename(importedRelativePath));
        //     actions.setExportName(`translations${exportIndex}`);
        // }
    },
    translationArgPosition: 1,
    onConfigGeneration: async event => {},
};