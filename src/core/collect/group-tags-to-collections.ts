import {$LT_TagCandidateFile} from "@/core/collect/collect-tags.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {LangTagCLITagConflictInfo, LangTagCLIConflict, LangTagCLIConfig} from "@/type.ts";

type ValueTracker = {
    get(path: string): LangTagCLITagConflictInfo | undefined;
    trackValue(path: string, value: any): void;
}

type AddConflictFunction = (path: string, tagA: LangTagCLITagConflictInfo, tagBValue: any, conflictType: 'path_overwrite' | 'type_mismatch') => Promise<void>;

export async function $LT_GroupTagsToCollections({logger, files, config}: {
    logger: LangTagCLILogger,
    files: $LT_TagCandidateFile[],
    config: LangTagCLIConfig
}) {
    let totalTags = 0;
    const collections: Record<string, Record<string, any>> = {};

    function getTranslationsCollection(namespace: string): Record<string, any> {
        const collectionName = config.collect!.collector!.aggregateCollection(namespace);

        const collection: Record<string, any> = collections[collectionName] || {};
        if (!(collectionName in collections)) {
            collections[collectionName] = collection;
        }
        return collection;
    }

    // Track conflicts across all files
    const allConflicts: LangTagCLIConflict[] = [];

    // Track existing values and their sources for conflict detection per namespace
    const existingValuesByNamespace: Map<string, Map<string, LangTagCLITagConflictInfo>> = new Map();

    for (const file of files) {
        totalTags += file.tags.length;

        for (const _tag of file.tags) {
            const tag = config.collect!.collector!.transformTag(_tag);

            const tagConfig = tag.parameterConfig;
            const collection = getTranslationsCollection(tagConfig.namespace);

            // Get or create existing values map for this namespace
            let existingValues = existingValuesByNamespace.get(tagConfig.namespace);
            if (!existingValues) {
                existingValues = new Map();
                existingValuesByNamespace.set(tagConfig.namespace, existingValues);
            }

            // Create value tracker for this tag
            const valueTracker: ValueTracker = {
                get: (path: string) => existingValues.get(path),
                trackValue: (path: string, value: any) => {
                    existingValues.set(path, {tag, relativeFilePath: file.relativeFilePath, value});
                }
            };

            const addConflict: AddConflictFunction = async (path: string, tagA: LangTagCLITagConflictInfo, tagBValue: any, conflictType: 'path_overwrite' | 'type_mismatch') => {
                // Skip conflicts when values match and ignoreConflictsWithMatchingValues is enabled
                if (conflictType === 'path_overwrite' && 
                    config.collect?.ignoreConflictsWithMatchingValues !== false &&
                    tagA.value === tagBValue) {
                    return; // Silently skip this conflict
                }

                const conflict: LangTagCLIConflict = {
                    path,
                    tagA,
                    tagB: {
                        tag,
                        relativeFilePath: file.relativeFilePath,
                        value: tagBValue
                    },
                    conflictType
                };

                // Call onConflictResolution for each conflict
                if (config.collect?.onConflictResolution) {
                    let shouldContinue = true;
                    await config.collect.onConflictResolution({
                        conflict, logger, exit() {
                            shouldContinue = false;
                        }
                    });
                    if (!shouldContinue) {
                        throw new Error(`LangTagConflictResolution:Processing stopped due to conflict resolution: ${conflict.tagA.tag.parameterConfig.namespace}|${conflict.path}`);
                    }
                }

                allConflicts.push(conflict);
            };

            const target = await ensureNestedObject(
                tagConfig.path,
                collection,
                valueTracker,
                addConflict
            );

            await mergeWithConflictDetection(
                target,
                tag.parameterTranslations,
                tagConfig.path || '',
                valueTracker,
                addConflict
            );
        }
    }

    // Report all conflicts found
    if (allConflicts.length > 0) {
        logger.warn(`Found ${allConflicts.length} conflicts.`);
    }

    // Call onCollectFinish
    if (config.collect?.onCollectFinish) {
        let shouldContinue = true;
        config.collect.onCollectFinish({
            totalTags,
            namespaces: collections,
            conflicts: allConflicts, logger, exit() {
                shouldContinue = false;
            }
        });
        if (!shouldContinue) {
            throw new Error(`LangTagConflictResolution:Processing stopped due to collect finish handler`);
        }
    }

    return collections;
}


/**
 * Creates nested object structure for dot-notation path and returns target object.
 * Example: "buttons.primary" creates { buttons: { primary: {} } } and returns primary object.
 */
async function ensureNestedObject(
    path: string | undefined,
    rootCollection: Record<string, any>,
    valueTracker: ValueTracker,
    addConflict: AddConflictFunction
): Promise<Record<string, any>> {
    if (!path || !path.trim()) return rootCollection;

    let current = rootCollection;
    let currentPath = '';

    for (const key of path.split('.')) {
        currentPath = currentPath ? `${currentPath}.${key}` : key;

        // If key exists but is a primitive value, we can't navigate deeper
        if (current[key] !== undefined && typeof current[key] !== 'object') {
            // Found a conflict - trying to navigate through a primitive value
            const existingInfo = valueTracker.get(currentPath);
            if (existingInfo) {
                // We're trying to create nested structure but there's already a primitive here
                await addConflict(currentPath, existingInfo, {}, 'type_mismatch');
            }
            // Can't navigate deeper, return current level
            return current;
        }

        // Create object if it doesn't exist, or use existing object
        current[key] = current[key] || {};
        current = current[key];
    }

    return current;
}

/**
 * Merges translations with conflict detection.
 * Returns array of conflicts found during merge.
 */
async function mergeWithConflictDetection(
    target: any,
    source: any,
    basePath: string = '',
    valueTracker: ValueTracker,
    addConflict: AddConflictFunction
): Promise<void> {
    if (typeof target !== 'object' || typeof source !== 'object') {
        return;
    }

    for (const key in source) {
        if (!source.hasOwnProperty(key)) {
            continue;
        }

        const currentPath = basePath ? `${basePath}.${key}` : key;
        let targetValue = target[key];
        const sourceValue = source[key];

        // Check for array conflicts
        if (Array.isArray(sourceValue)) {
            continue; // Skip arrays silently
        }

            // Check for conflicts if target already has a value
        if (targetValue !== undefined) {
            const targetType = typeof targetValue;
            const sourceType = typeof sourceValue;

            // Get existing value info from our tracking map
            let existingInfo = valueTracker.get(currentPath);

            // If we don't have direct info but target is an object, try to find info from nested values
            if (!existingInfo && targetType === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                // Recursively search for any tracked nested value
                const findNestedInfo = (obj: any, prefix: string): LangTagCLITagConflictInfo | undefined => {
                    for (const key in obj) {
                        const path = prefix ? `${prefix}.${key}` : key;
                        const info = valueTracker.get(path);
                        if (info) {
                            return info;
                        }
                        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                            const nestedInfo = findNestedInfo(obj[key], path);
                            if (nestedInfo) {
                                return nestedInfo;
                            }
                        }
                    }
                    return undefined;
                };
                existingInfo = findNestedInfo(targetValue, currentPath);
            }

            // Detect type mismatch conflicts (any type change)
            if (targetType !== sourceType) {
                if (existingInfo) {
                    await addConflict(currentPath, existingInfo, sourceValue, 'type_mismatch');
                }
                continue; // Skip this merge
            }

            // Detect path overwrite conflicts (same type)
            // For objects, we let the recursive merge handle nested conflicts
            if (targetType !== 'object') {
                if (existingInfo) {
                    // Always call addConflict - it will decide whether to skip based on config
                    await addConflict(currentPath, existingInfo, sourceValue, 'path_overwrite');
                }
                // Skip merge only if values are different
                if (targetValue !== sourceValue) {
                    continue;
                }
            }
        }

        // Merge objects recursively (but not null or arrays)
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
            if (!targetValue) {
                targetValue = {};
                target[key] = targetValue;
            }

            await mergeWithConflictDetection(
                targetValue,
                sourceValue,
                currentPath,
                valueTracker,
                addConflict
            );
        } else {
            // Set primitive value (string, number, boolean, null, undefined, function, array) and track it
            target[key] = sourceValue;
            valueTracker.trackValue(currentPath, sourceValue);
        }
    }

}