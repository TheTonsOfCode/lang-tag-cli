import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { CONFIG_FILE_NAME } from '@/core/constants';
import { askProjectSetupQuestions } from '@/core/init/inquirer-prompts';
import { renderConfigTemplate } from '@/core/init/renderer';
import { $LT_CreateDefaultLogger } from '@/core/logger/default-logger';
import { LangTagCLILogger } from '@/logger';

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

export async function $LT_CMD_InitConfig() {
    const logger: LangTagCLILogger = $LT_CreateDefaultLogger();

    if (existsSync(CONFIG_FILE_NAME)) {
        logger.error(
            'Configuration file already exists. Please remove the existing configuration file before creating a new one'
        );
        return;
    }

    console.log('');
    logger.info('Welcome to Lang Tag CLI Setup!');
    console.log('');

    try {
        // Ask interactive questions
        const answers = await askProjectSetupQuestions();

        // Detect module system
        const moduleSystem = await detectModuleSystem();

        // Render config from templates
        const configContent = renderConfigTemplate({
            answers,
            moduleSystem,
        });

        // Write config file
        await writeFile(CONFIG_FILE_NAME, configContent, 'utf-8');

        logger.success('Configuration file created successfully!');
        logger.success('Created {configFile}', {
            configFile: CONFIG_FILE_NAME,
        });

        // Print next steps
        logger.info('Next steps:');
        logger.info('  1. Review and customize {configFile}', {
            configFile: CONFIG_FILE_NAME,
        });
        logger.info('  2. Run "npx lang-tag collect" to collect translations');
        if (answers.projectType === 'project') {
            logger.info('  3. Your translations will be in {dir}', {
                dir: answers.localesDirectory,
            });
        }
    } catch (error: any) {
        if (error.name === 'ExitPromptError') {
            // User cancelled the prompt
            logger.warn('Setup cancelled');
            return;
        }
        logger.error(error?.message || 'An error occurred during setup');
    }
}
