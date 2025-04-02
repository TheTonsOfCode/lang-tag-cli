import {readConfig} from '@/cli/commands/utils/read-config';
import { checkAndRegenerateFileLangTags } from './core/regenerate-config';
import { messageLangTagTranslationConfigRegenerated, messageNoChangesMade } from '@/cli/message';
import { globby } from 'globby';

export async function generateConfig() {
    const config = await readConfig(process.cwd());

    const files = await globby(config.includes, {
        cwd: process.cwd(),
        ignore: config.excludes,
        absolute: true
    });
    const charactersToSkip = process.cwd().length + 1;

    let dirty = false;

    for (const file of files) {
        const path = file.substring(charactersToSkip);

        const localDirty = await checkAndRegenerateFileLangTags(config, file, path);

        if (localDirty) {
            messageLangTagTranslationConfigRegenerated(path);
            dirty = true;
        }
    }

    if (!dirty) {
        messageNoChangesMade();
    }
}