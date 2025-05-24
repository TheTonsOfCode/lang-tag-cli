import {importLibraries} from "@/cli/commands/core/import-node-modules-libraries";
import {readConfig} from '@/cli/commands/utils/read-config';
import * as process from "node:process";
import {messageImportLibraries, messageLibrariesImportedSuccessfully} from '@/cli/message';

export async function importTranslations() {
    messageImportLibraries();
    const config = await readConfig(process.cwd());
    await importLibraries(config);
    messageLibrariesImportedSuccessfully();
} 