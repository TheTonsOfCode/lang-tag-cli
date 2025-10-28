import {LangTagCLIConfig} from "@/config.ts";
import {NamespaceCollector} from "@/algorithms";

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

            if (!config) return {path: '', namespace: langTagConfig.collect!.defaultNamespace!};
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
        onImport: (event) => {
            for (let e of event.exports) {
                event.logger.info('Detected lang tag exports at package {packageName}', {packageName: e.packageJSON.name})
            }
            event.logger.warn(`
Import Algorithm Not Configured

To import external language tags, you need to configure an import algorithm.

Setup Instructions:
1. Add this import at the top of your configuration file:
   {importStr}

2. Replace import.onImport function with:
   {onImport}

This will enable import of language tags from external packages.
            `.trim(), {
                importStr: "const { flexibleImportAlgorithm } = require('@lang-tag/cli/algorithms');",
                onImport: "onImport: flexibleImportAlgorithm({ filePath: { includePackageInPath: true } })"
            })
        }
    },
    translationArgPosition: 1,
    onConfigGeneration: async event => {
        event.logger.info('Config generation event is not configured. Add onConfigGeneration handler to customize config generation.');
    },
};