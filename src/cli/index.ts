#!/usr/bin/env node

import {program} from 'commander';
import {$LT_CMD_RegenerateTags} from '@/cli/commands/cmd-regenerate-tags.ts';
import {$LT_WatchTranslations} from '@/cli/commands/cmd-watch.ts';
import {$LT_CMD_InitConfig} from '@/cli/commands/cmd-init.ts';
import {$LT_ImportTranslations} from "@/cli/commands/cmd-import.ts";
import {$LT_CMD_Collect} from "@/cli/commands/cmd-collect.ts";
import {$LT_CMD_InitTagFile} from "@/cli/commands/cmd-init-tag.ts";

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
        .description('Initialize a new lang-tag function file')
        .option('-n, --name <name>', 'Name of the tag function (default: from config)')
        .option('-l, --library', 'Generate library-style tag')
        .option('-r, --react', 'Include React-specific optimizations')
        .option('-t, --typescript', 'Force TypeScript output (default: auto-detect)')
        .option('-o, --output <path>', 'Output file path (default: auto-generated)')
        .action(async (options) => {
            await $LT_CMD_InitTagFile(options);
        });

    return program;
}

createCli().parse();