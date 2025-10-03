import path, {resolve} from "pathe";
import {CONFIG_FILE_NAME} from "@/cli/constants.ts";
import {existsSync} from "fs";
import {pathToFileURL} from "url";
import {LangTagConfig, LangTagOnConfigGenerationParams, LangTagOnImportParams} from "@/cli/config.ts";

export const defaultConfig: LangTagConfig = {
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

export async function $LT_ReadConfig(projectPath: string): Promise<LangTagConfig> {
    const configPath = resolve(projectPath, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
        throw new Error(`No "${CONFIG_FILE_NAME}" detected`)
    }

    try {
        const configModule = await import(pathToFileURL(configPath).href);

        if (!configModule.default || Object.keys(configModule.default).length === 0) {
            throw new Error(`Config found, but default export is undefined`)
        }

        const userConfig: Partial<LangTagConfig> = configModule.default || {};

        const tn = (userConfig.tagName || '')
            .toLowerCase()
            .replace(/[-_\s]/g, '');

        if (tn.includes('langtag')) {
            throw new Error('Custom tagName cannot include "langtag"! (It is not recommended for use with libraries)\n');
        }

        return {
            ...defaultConfig,
            ...userConfig,
            import: {
                ...defaultConfig.import,
                ...userConfig.import,
            },
            collect: {
                ...defaultConfig.collect,
                ...userConfig.collect,
            }
        };
    } catch (error) {
        throw error;
    }
}