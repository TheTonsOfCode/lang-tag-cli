import {writeFile} from 'fs/promises';
import {CONFIG_FILE_NAME} from "@/cli/core/constants.ts";
import {existsSync} from "fs";
import {LangTagCLILogger} from "@/cli/logger.ts";
import {$LT_CreateDefaultLogger} from "@/cli/core/logger/default-logger.ts";
import {readFile} from 'fs/promises';
import {join} from 'path';

async function detectModuleSystem(): Promise<'esm' | 'cjs'> {
    const packageJsonPath = join(process.cwd(), 'package.json');
    
    if (!existsSync(packageJsonPath)) {
        return 'cjs';
    }
    
    try {
        const content = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        
        if (packageJson.type === 'module') {
            return 'esm';
        }
        
        // Maybe check for .mjs files or other ESM indicators
        // For now, default to CommonJS if not explicitly set to module
        return 'cjs';
    } catch (error) {
        // Default to CommonJS on error
        return 'cjs';
    }
}

function getExportStatement(moduleSystem: 'esm' | 'cjs'): string {
    return moduleSystem === 'esm' ? 'export default config;' : 'module.exports = config;';
}

async function generateDefaultConfig(): Promise<string> {
    const moduleSystem = await detectModuleSystem();
    const exportStatement = getExportStatement(moduleSystem);
    
    return `/** @type {import('lang-tag/cli/config').LangTagCLIConfig} */
const config = {
    tagName: 'lang',
    isLibrary: false,
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
        onConflictResolution: async event => {
            await event.logger.conflict(event.conflict, true);
            // By default, continue processing even if conflicts occur
            // Call event.exit(); to terminate the process upon the first conflict
        },
        onCollectFinish: event => {
            event.exit(); // Stop the process to avoid merging on conflict
        }
    },
    translationArgPosition: 1,
    debug: false,
};

${exportStatement}`;
}

export async function $LT_CMD_InitConfig() {
    const logger: LangTagCLILogger = $LT_CreateDefaultLogger();

    if (existsSync(CONFIG_FILE_NAME)) {
        logger.success('Configuration file already exists. Please remove the existing configuration file before creating a new default one');
        return;
    }

    try {
        const configContent = await generateDefaultConfig();
        await writeFile(CONFIG_FILE_NAME, configContent, 'utf-8');
        logger.success('Configuration file created successfully');
    } catch (error: any) {
        logger.error(error?.message);
    }
}