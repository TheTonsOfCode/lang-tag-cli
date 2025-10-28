import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { CONFIG_FILE_NAME } from '@/core/constants';
import {
    askProjectSetupQuestions,
    getDefaultAnswers,
} from '@/core/init/inquirer-prompts';
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

interface InitOptions {
    yes?: boolean;
}

export async function $LT_CMD_InitConfig(options: InitOptions = {}) {
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
        const answers = options.yes
            ? getDefaultAnswers()
            : await askProjectSetupQuestions();

        if (options.yes) {
            logger.info('Using default configuration (--yes flag detected)...');
        }

        const moduleSystem = await detectModuleSystem();

        const configContent = renderConfigTemplate({
            answers,
            moduleSystem,
        });

        await writeFile(CONFIG_FILE_NAME, configContent, 'utf-8');

        logger.success('Configuration file created successfully!');
        logger.success('Created {configFile}', {
            configFile: CONFIG_FILE_NAME,
        });

        logger.info('Next steps:');
        logger.info('  1. Review and customize {configFile}', {
            configFile: CONFIG_FILE_NAME,
        });
        logger.info(
            '  2. Since you have installed all basic libraries (React, TypeScript, etc.)'
        );
        logger.info(
            '     and the initialized basic tag is based on what you use in your project,'
        );
        logger.info(
            '     we recommend using "npx lang-tag init-tag" to generate an initial version of the tag'
        );
        logger.info(
            '  3. Use your tag in the project under the include directories'
        );
        logger.info('  4. Run "npx lang-tag collect" to collect translations');
        if (answers.projectType === 'project') {
            logger.info('  5. Your translations will be in {dir}', {
                dir: answers.localesDirectory,
            });
        }
    } catch (error: any) {
        if (error.name === 'ExitPromptError') {
            logger.warn('Setup cancelled');
            return;
        }
        logger.error(error?.message || 'An error occurred during setup');
    }
}
