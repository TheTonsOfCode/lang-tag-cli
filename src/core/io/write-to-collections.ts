import { $LT_ReadJSON, $LT_WriteJSON } from '@/core/io/file';
import { deepMergeTranslations } from '@/core/merge';
import { LangTagCLILogger } from '@/logger';
import { LangTagCLIConfig } from '@/type';

export async function $LT_WriteToCollections({
  config,
  collections,
  logger,
  clean,
}: {
  config: LangTagCLIConfig;
  collections: Record<string, Record<string, any>>;
  logger: LangTagCLILogger;
  clean?: boolean;
}): Promise<void> {
  await config.collect!.collector!.preWrite(clean);

  const changedCollections: string[] = [];

  for (let collectionName of Object.keys(collections)) {
    if (!collectionName) {
      continue;
    }

    const filePath =
      await config.collect!.collector!.resolveCollectionFilePath(
        collectionName
      );

    let originalJSON = {};
    try {
      originalJSON = await $LT_ReadJSON(filePath);
    } catch (e) {
      await config.collect!.collector!.onMissingCollection(collectionName);
    }

    if (deepMergeTranslations(originalJSON, collections[collectionName])) {
      changedCollections.push(collectionName);
      await $LT_WriteJSON(filePath, originalJSON);
    }
  }

  await config.collect!.collector!.postWrite(changedCollections);
}
