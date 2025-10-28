#!/usr/bin/env node
import { program } from 'commander';

import { $LT_CMD_Collect } from '@/commands/cmd-collect';
import { $LT_ImportTranslations } from '@/commands/cmd-import';
import { $LT_CMD_InitConfig } from '@/commands/cmd-init';
import { $LT_CMD_InitTagFile } from '@/commands/cmd-init-tag';
import { $LT_CMD_RegenerateTags } from '@/commands/cmd-regenerate-tags';
import { $LT_WatchTranslations } from '@/commands/cmd-watch';

export function createCli() {
    program
        .name('lang-tag')
        .description('CLI to manage language translations')
        .version('0.1.0');

    program
        .command('collect')
        .alias('c')
        .description('Collect translations from source files')
        .option('-c, --clean', 'Remove output directory before collecting')
        .action($LT_CMD_Collect);

    program
        .command('import')
        .alias('i')
        .description('Import translations from libraries in node_modules')
        .action($LT_ImportTranslations);

    program
        .command('regenerate-tags')
        .alias('rt')
        .description('Regenerate configuration for language tags')
        .action($LT_CMD_RegenerateTags);

    program
        .command('watch')
        .alias('w')
        .description(
            'Watch for changes in source files and automatically collect translations'
        )
        .action($LT_WatchTranslations);

    program
        .command('init')
        .description('Initialize project with default configuration')
        .option('-y, --yes', 'Skip prompts and use default configuration')
        .action($LT_CMD_InitConfig);

    program
        .command('init-tag')
        .description('Initialize a new lang-tag function file')
        .option(
            '-n, --name <name>',
            'Name of the tag function (default: from config)'
        )
        .option(
            '-l, --library',
            'Generate library-style tag (default: from config)'
        )
        .option(
            '-r, --react',
            'Include React-specific optimizations (default: auto-detect)'
        )
        .option(
            '-t, --typescript',
            'Force TypeScript output (default: auto-detect)'
        )
        .option(
            '-o, --output <path>',
            'Output file path (default: auto-generated)'
        )
        .action(async (options) => {
            await $LT_CMD_InitTagFile(options);
        });

    return program;
}

createCli().parse();
