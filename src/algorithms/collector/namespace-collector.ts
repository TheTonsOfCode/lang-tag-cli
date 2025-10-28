import process from 'node:process';

import { mkdir, rm } from 'fs/promises';
import path, { resolve } from 'pathe';

import { TranslationsCollector } from '@/algorithms/collector/type';
import { LangTagCLIProcessedTag } from '@/type';

export class NamespaceCollector extends TranslationsCollector {
    private clean!: boolean;
    private languageDirectory!: string;

    aggregateCollection(namespace: string): string {
        return namespace;
    }

    transformTag(tag: LangTagCLIProcessedTag): LangTagCLIProcessedTag {
        return tag;
    }

    async preWrite(clean: boolean): Promise<void> {
        this.clean = clean;
        this.languageDirectory = path.join(
            this.config.localesDirectory,
            this.config.baseLanguageCode
        );

        if (clean) {
            this.logger.info('Cleaning output directory...');
            await removeDirectory(this.languageDirectory);
        }

        await ensureDirectoryExists(this.languageDirectory);
    }

    async resolveCollectionFilePath(collectionName: string): Promise<any> {
        return resolve(
            process.cwd(),
            this.languageDirectory,
            collectionName + '.json'
        );
    }

    async onMissingCollection(collectionName: string): Promise<void> {
        if (!this.clean) {
            this.logger.warn(
                `Original namespace file "{namespace}.json" not found. A new one will be created.`,
                { namespace: collectionName }
            );
        }
    }

    async postWrite(changedCollections: string[]): Promise<void> {
        if (!changedCollections?.length) {
            this.logger.info(
                'No changes were made based on the current configuration and files'
            );
            return;
        }

        const n = changedCollections.map((n) => `"${n}.json"`).join(', ');

        this.logger.success('Updated namespaces {outputDir} ({namespaces})', {
            outputDir: this.config.localesDirectory,
            namespaces: n,
        });
    }
}

async function ensureDirectoryExists(filePath: string): Promise<void> {
    try {
        await mkdir(filePath, { recursive: true });
    } catch (error) {
        if ((error as any).code !== 'EEXIST') {
            throw error;
        }
    }
}

async function removeDirectory(dirPath: string): Promise<void> {
    try {
        await rm(dirPath, { recursive: true, force: true });
    } catch (error) {}
}
