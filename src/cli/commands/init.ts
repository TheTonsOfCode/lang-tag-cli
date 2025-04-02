import {writeFile} from 'fs/promises';
import {messageInitializedConfiguration} from '@/cli/message';
import {CONFIG_FILE_NAME} from "@/cli/constants.ts";

/**
 * Initialize project with default configuration
 */
export async function initConfig() {
    const configContent = `/** @type {import('lang-tag/cli/config.ts').LangTagConfig} */
const config = {
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

export default config;
`;

    try {
        await writeFile(CONFIG_FILE_NAME, configContent, 'utf-8');
        messageInitializedConfiguration();
    } catch (error) {
        console.error('Error creating configuration file:', error);
    }
}
