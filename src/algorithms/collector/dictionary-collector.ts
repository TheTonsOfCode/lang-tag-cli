import {TranslationsCollector} from "@/algorithms/collector/type.ts";
import {LangTagCLIProcessedTag} from "@/type.ts";
import path, {resolve} from "pathe";
import {mkdir, rm} from 'fs/promises';
import process from "node:process";

interface Options {
    appendNamespaceToPath: boolean;
}

export class DictionaryCollector extends TranslationsCollector {

    private clean!: boolean;

    constructor(
        private readonly options: Options = {
            appendNamespaceToPath: false,
        }
    ) {
        super();
    }

    aggregateCollection(namespace: string): string {
        return this.config.baseLanguageCode;
    }

    transformTag(tag: LangTagCLIProcessedTag): LangTagCLIProcessedTag {

        const originalPath = tag.parameterConfig.path;
        let path= originalPath;

        if (this.options.appendNamespaceToPath) {
            path = tag.parameterConfig.namespace;
            if (originalPath) {
                path += '.';
                path += originalPath;
            }

            return {
                ...tag,
                parameterConfig: {
                    ...tag.parameterConfig,
                    namespace: undefined,
                    path
                }
            };
        }

        return tag;
    }

    async preWrite(clean: boolean): Promise<void> {
        this.clean = clean;

        const baseDictionaryFile = path.join(this.config.localesDirectory, `${this.config.baseLanguageCode}.json`);

        if (clean) {
            this.logger.info('Removing {file}', {file: baseDictionaryFile});
            await removeFile(baseDictionaryFile);
        }

        await ensureDirectoryExists(this.config.localesDirectory);
    }

    async resolveCollectionFilePath(baseLanguageCode: string): Promise<any> {
        return resolve(
            process.cwd(),
            this.config.localesDirectory,
            baseLanguageCode + '.json'
        );
    }

    async onMissingCollection(baseLanguageCode: string): Promise<void> {
        if (!this.clean) {
            this.logger.warn(`Original dictionary file "{namespace}.json" not found. A new one will be created.`, { namespace: baseLanguageCode })
        }
    }

    async postWrite(changedCollections: string[]): Promise<void> {
        if (!changedCollections?.length) {
            this.logger.info('No changes were made based on the current configuration and files')
            return;
        }

        if (changedCollections.length > 1) {
            throw new Error('Should not write more than 1 collection! Only 1 base language dictionary expected!');
        }

        const dict = resolve(
            this.config.localesDirectory,
            this.config.baseLanguageCode + '.json'
        )

        this.logger.success('Updated dictionary {dict}', { dict });
    }
}

async function ensureDirectoryExists(filePath: string): Promise<void> {
    try {
        await mkdir(filePath, {recursive: true});
    } catch (error) {
        if ((error as any).code !== 'EEXIST') {
            throw error;
        }
    }
}

async function removeFile(filePath: string): Promise<void> {
    try {
        await rm(filePath, {force: true});
    } catch (error) {
    }
}