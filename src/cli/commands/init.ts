import {writeFile} from 'fs/promises';
import {messageExistingConfiguration, messageInitializedConfiguration} from '@/cli/message';
import {CONFIG_FILE_NAME} from "@/cli/constants.ts";
import {existsSync} from "fs";

const DEFAULT_INIT_CONFIG = `
/** @type {import('lang-tag/cli/config').LangTagConfig} */
export default  {
    includes: ['src/**/*.{js,ts,jsx,tsx}'],
    excludes: ['node_modules', 'dist', 'build', '**/*.test.ts'],
    outputDir: 'public/locales/en',
    onConfigGeneration: (params) => {
        // We do not modify imported configurations
        if (params.isImportedLibrary) return params.config;

        //if (!params.config.path) {
        //    params.config.path = 'test';
        //    params.config.namespace = 'testNamespace';
        //}

        return params.config
    }
};
`;

/**
 * Initialize project with default configuration
 */
export async function initConfig() {
    if (existsSync(CONFIG_FILE_NAME)) {
        messageExistingConfiguration();
        return;
    }

    try {
        await writeFile(CONFIG_FILE_NAME, DEFAULT_INIT_CONFIG, 'utf-8');
        messageInitializedConfiguration();
    } catch (error) {
        console.error('Error creating configuration file:', error);
    }
}
