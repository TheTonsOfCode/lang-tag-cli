import {importLibraries} from "@/cli/commands/core/import-node-modules-libraries";
import {$LT_ReadConfig} from '@/cli/core/io/read-config.ts';
import * as process from "node:process";
import {messageImportLibraries, messageLibrariesImportedSuccessfully} from '@/cli/message';

export async function importTranslations() {
    messageImportLibraries();
    const config = await $LT_ReadConfig(process.cwd());
    await importLibraries(config);
    messageLibrariesImportedSuccessfully();
} 