import {LangTagCLIConfig, LangTagCLIProcessedTag} from "@/config.ts";
import {LangTagCLILogger} from "@/logger.ts";

export abstract class TranslationsCollector {

    public config!: LangTagCLIConfig;
    public logger!: LangTagCLILogger;

    abstract aggregateCollection(namespace: string): string;

    abstract transformTag(tag: LangTagCLIProcessedTag): LangTagCLIProcessedTag;

    abstract preWrite(clean?: boolean): Promise<void>;

    abstract resolveCollectionFilePath(collectionName: string): Promise<string>;

    abstract onMissingCollection(collectionName: string): Promise<void>;

    abstract postWrite(changedCollections: string[]): Promise<void>;

}