import {$LT_TagCandidateFile} from "@/cli/core/collect/collect-tags.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {$LT_TagConflictInfo, $LT_Conflict, LangTagConfig} from "@/cli/config.ts";

interface ValueTracker {
    get(path: string): $LT_TagConflictInfo | undefined;
    trackValue(path: string, value: any): void;
}

type AddConflictFunction = (path: string, tagA: $LT_TagConflictInfo, tagBValue: any, conflictType: 'path_overwrite' | 'type_mismatch') => void;

export async function $LT_GroupTagsToNamespaces({logger, files, config}: {
    logger: $LT_Logger,
    files: $LT_TagCandidateFile[],
    config: LangTagConfig
}) {
    let totalTags = 0;
    const namespaces: Record<string, Record<string, any>> = {};

    function getTranslations(namespace: string): Record<string, any> {
        const namespaceTranslations: Record<string, any> = namespaces[namespace] || {};
        if (!(namespace in namespaces)) {
            namespaces[namespace] = namespaceTranslations;
        }
        return namespaceTranslations;
    }

    // Track conflicts across all files
    const allConflicts: $LT_Conflict[] = [];

    // Track existing values and their sources for conflict detection per namespace
    const existingValuesByNamespace: Map<string, Map<string, $LT_TagConflictInfo>> = new Map();

    for (const file of files) {
        totalTags += file.tags.length;

        for (const tag of file.tags) {
            const tagConfig = tag.parameterConfig;
            const namespaceTranslations = getTranslations(tagConfig.namespace);

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
                    existingValues.set(path, { tag, relativeFilePath: file.relativeFilePath, value });
                }
            };

            const addConflict: AddConflictFunction = (path: string, tagA: $LT_TagConflictInfo, tagBValue: any, conflictType: 'path_overwrite' | 'type_mismatch') => {
                const conflict: $LT_Conflict = {
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
                    const shouldContinue = config.collect.onConflictResolution(conflict);
                    if (!shouldContinue) {
                        throw new Error(`LangTagConflictResolution:Processing stopped due to conflict resolution: ${conflict.tagA.tag.parameterConfig.namespace}|${conflict.path}`);
                    }
                }
                
                allConflicts.push(conflict);
            };

            const target = ensureNestedObject(
                tagConfig.path, 
                namespaceTranslations,
                valueTracker,
                addConflict
            );
            
            mergeWithConflictDetection(
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
        logger.warn(`Found ${allConflicts.length} conflicts across files:`);
        for (const conflict of allConflicts) {
            logger.warn([
                `  - ${conflict.conflictType}: "${conflict.path}"`,
                `    TagA: ${conflict.tagA.relativeFilePath} (${conflict.tagA.tag.fullMatch})`,
                `    TagB: ${conflict.tagB.relativeFilePath} (${conflict.tagB.tag.fullMatch})`,
                `    ValueA: ${JSON.stringify(conflict.tagA.value)}`,
                `    ValueB: ${JSON.stringify(conflict.tagB.value)}`
            ].join('\n'));
        }

        // Call onCollectFinish with all conflicts
        if (config.collect?.onCollectFinish) {
            const shouldContinue = config.collect.onCollectFinish(allConflicts);
            if (!shouldContinue) {
                throw new Error(`LangTagConflictResolution:Processing stopped due to collect finish handler`);
            }
        }
    }

    return namespaces;
}


/**
 * Creates nested object structure for dot-notation path and returns target object.
 * Example: "buttons.primary" creates { buttons: { primary: {} } } and returns primary object.
 */
function ensureNestedObject(
    path: string | undefined, 
    root: Record<string, any>,
    valueTracker: ValueTracker,
    addConflict: AddConflictFunction
): Record<string, any> {
    if (!path || !path.trim()) return root;
    
    let current = root;
    let currentPath = '';
    
    for (const key of path.split('.')) {
        currentPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (current[key] && typeof current[key] !== 'object') {
            // Found a conflict - trying to create object structure over existing value
            const existingInfo = valueTracker.get(currentPath);
            if (existingInfo) {
                addConflict(currentPath, existingInfo, null, 'type_mismatch'); // null because we're trying to create object structure
            }
            // Skip creating the nested structure if there's a conflict
            return current;
        }
        
        current[key] = current[key] || {};
        current = current[key];
    }
    
    return current;
}

/**
 * Merges translations with conflict detection.
 * Returns array of conflicts found during merge.
 */
function mergeWithConflictDetection(
    target: any,
    source: any,
    basePath: string = '',
    valueTracker: ValueTracker,
    addConflict: AddConflictFunction
): void {
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
            const existingInfo = valueTracker.get(currentPath);

            // Detect type mismatch conflicts (any type change)
            if (targetType !== sourceType) {
                if (existingInfo) {
                    addConflict(currentPath, existingInfo, sourceValue, 'type_mismatch');
                }
                continue; // Skip this merge
            }

            // Detect path overwrite conflicts (same type but different values)
            if (targetValue !== sourceValue) {
                if (existingInfo) {
                    addConflict(currentPath, existingInfo, sourceValue, 'path_overwrite');
                }
                continue; // Skip this merge
            }
        }

        // Merge objects recursively (but not null or arrays)
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
            if (!targetValue) {
                targetValue = {};
                target[key] = targetValue;
            }

            mergeWithConflictDetection(
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