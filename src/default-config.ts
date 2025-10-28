import {LangTagCLIConfig} from "@/config.ts";
import {flexibleImportAlgorithm, NamespaceCollector} from "@/algorithms";

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
        onImport: flexibleImportAlgorithm({
            filePath: {
                includePackageInPath: true,
            }
        })
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