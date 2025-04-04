#!/usr/bin/env node

import {program} from 'commander';
import {collectTranslations} from '@/cli/commands/collect';
import {regenerateTags} from '@/cli/commands/regenerate-tags';
import {watchTranslations} from '@/cli/commands/watch';
import {initConfig} from '@/cli/commands/init';

export function createCli() {
    program
        .name('langtag')
        .description('CLI to manage language translations')
        .version('0.1.0');

    program
        .command('collect')
        .alias('c')
        .description('Collect translations from source files')
        .option('-l, --libraries', 'Importing libraries translations before collecting translations')
        .action(async (options) => {
            const importLibraries = options.libraries;

            await collectTranslations(importLibraries);
        });

    program
        .command('regenerate-tags')
        .alias('rt')
        .description('Regenerate configuration for language tags')
        .action(regenerateTags);

    program
        .command('watch')
        .alias('w')
        .description('Watch for changes in source files and automatically collect translations')
        .action(watchTranslations);

    program
        .command('init')
        .description('Initialize project with default configuration')
        .action(initConfig);

    return program;
}

// Only run CLI when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createCli().parse();
}
