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

    // TODO: na
    //  `Original namespace file "{namespace}.json" not found. A new one will be created.`, { namespace }

    // TODO: dorobic ze ktos moze dac w globalnym configu 'treatNamespaceAsPathPrefix' aby bylo ladniej i nie polegamy wtedy na
    //      appendNamespaceToPath w dictionary collectorze i jest ladniej (ale tą opcję też zostawić)
}

// w filters to trzeba bedzie wywalic:
/*
  if (!tag.parameterConfig.namespace) {
            logger.warn('Skipping tag "{fullMatch}". Tag configuration namespace not defined. (Check lang-tag config at collect.onCollectConfigFix)', {
                fullMatch: tag.fullMatch.trim()
            });
            return false;
        }
 */