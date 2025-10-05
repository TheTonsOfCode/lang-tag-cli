import {writeFile} from 'fs/promises';
import {CONFIG_FILE_NAME} from "@/cli/core/constants.ts";
import {existsSync} from "fs";
import {$LT_CreateDefaultLogger, LangTagLogger} from "@/cli/logger.ts";

const DEFAULT_INIT_CONFIG = `
/** @type {import('lang-tag/cli/config').LangTagConfig} */
const config = {
    tagName: 'lang',
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build', '**/*.test.ts'],
    outputDir: 'public/locales/en',
    onConfigGeneration: (params) => {
        // We do not modify imported configurations
        if (params.isImportedLibrary) return undefined;

        //if (!params.config.path) {
        //    params.config.path = 'test';
        //    params.config.namespace = 'testNamespace';
        //}

        return undefined
    },
    collect: {
        defaultNamespace: 'common',
    },
    debug: false,
};

module.exports = config;
`;

/**
 * Initialize project with default configuration
 */
export async function $LT_CMD_InitConfig() {
    const logger: LangTagLogger = $LT_CreateDefaultLogger();

    if (existsSync(CONFIG_FILE_NAME)) {
        logger.success('Configuration file already exists. Please remove the existing configuration file before creating a new default one');
        return;
    }

    try {
        await writeFile(CONFIG_FILE_NAME, DEFAULT_INIT_CONFIG, 'utf-8');
        logger.success('Configuration file created successfully');
    } catch (error: any) {
        logger.error(error?.message);
    }
}