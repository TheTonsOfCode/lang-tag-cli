#!/usr/bin/env node

import {program} from 'commander';
import {$LT_CMD_RegenerateTags} from '@/cli/commands/cmd-regenerate-tags.ts';
import {$LT_WatchTranslations} from '@/cli/commands/cmd-watch.ts';
import {$LT_CMD_InitConfig} from '@/cli/commands/cmd-init.ts';
import {$LT_ImportTranslations} from "@/cli/commands/cmd-import.ts";
import {$LT_CMD_Collect} from "@/cli/commands/cmd-collect.ts";

export function createCli() {
    program
        .name('lang-tag')
        .description('CLI to manage language translations')
        .version('0.1.0');

    program
        .command('collect')
        .alias('c')
        .description('Collect translations from source files')
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
        .description('Watch for changes in source files and automatically collect translations')
        .action($LT_WatchTranslations);

    program
        .command('init')
        .description('Initialize project with default configuration')
        .action($LT_CMD_InitConfig);

    program
        .command('init-tag')
        .description('Initialize project with default configuration')
        .action($LT_CMD_InitConfig);

    return program;
}

// Only run CLI when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createCli().parse();
}
