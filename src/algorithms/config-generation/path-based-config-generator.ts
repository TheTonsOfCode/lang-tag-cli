import { LangTagCLIConfigGenerationEvent } from "@/config.ts";
import { basename } from "pathe";
import * as caseLib from "case";

export interface PathBasedConfigGeneratorOptions {
    /**
     * Whether to include the filename (without extension) as part of the path segments.
     * @default false
     */
    includeFileName?: boolean;

    /**
     * Whether to completely remove folders wrapped in brackets () or [].
     * If false, only the brackets are removed from folder names.
     * @default true
     * 
     * @example
     * - true: 'app/(admin)/users' -> 'app/users'
     * - false: 'app/(admin)/users' -> 'app/admin/users'
     */
    removeBracketedFolders?: boolean;

    /**
     * List of folder names to completely ignore globally.
     * These will be removed from all paths regardless of their position.
     * @default []
     * 
     * @example ['src', 'app', 'components']
     */
    ignoreFolders?: string[];

    /**
     * Hierarchical structure for ignoring specific folder patterns.
     * Keys represent path segments to match, values indicate what to ignore at that level.
     * 
     * @example
     * {
     *   'src': {
     *     'app': true,  // ignore 'app' when under 'src'
     *     'features': ['auth', 'admin']  // ignore 'auth' and 'admin' under 'src/features'
     *   }
     * }
     */
    ignoreStructured?: Record<string, any>;

    /**
     * Convert the final namespace to lowercase.
     * @default false
     */
    lowercaseNamespace?: boolean;

    /**
     * Case transformation to apply to the namespace.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab', 
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default undefined (no transformation)
     */
    namespaceCase?: 'camel' | 'capital' | 'constant' | 'dot' | 'header' | 'kebab' | 'lower' | 'no' | 'param' | 'pascal' | 'path' | 'sentence' | 'snake' | 'swap' | 'title' | 'upper';

    /**
     * Case transformation to apply to the path segments.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab', 
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default undefined (no transformation)
     */
    pathCase?: 'camel' | 'capital' | 'constant' | 'dot' | 'header' | 'kebab' | 'lower' | 'no' | 'param' | 'pascal' | 'path' | 'sentence' | 'snake' | 'swap' | 'title' | 'upper';

    /**
     * Fallback namespace to use when no segments remain after filtering.
     * If not provided, uses the defaultNamespace from langTagConfig.collect.defaultNamespace
     * @default undefined (will use config default)
     */
    fallbackNamespace?: string;

    /**
     * If true, when the generated namespace equals the fallback/default namespace,
     * the configuration will be cleared (save(undefined)) as it's not needed.
     * @default true
     */
    clearOnDefaultNamespace?: boolean;
}

/**
 * Automatically generates namespace and path configuration based on file path structure.
 * 
 * This algorithm analyzes the relative file path and intelligently extracts namespace
 * and path segments according to configurable rules.
 * 
 * @param options - Configuration options for path-based generation
 * @returns A function compatible with LangTagCLIConfig.onConfigGeneration
 * 
 * @example
 * ```typescript
 * import { pathBasedConfigGenerator } from '@lang-tag/cli/algorithms';
 * 
 * export default {
 *   onConfigGeneration: pathBasedConfigGenerator({
 *     includeFileName: false,
 *     removeBracketedFolders: true,
 *     ignoreFolders: ['src', 'app', 'components'],
 *     lowercaseNamespace: true,
 *     fallbackNamespace: 'common'
 *   })
 * };
 * ```
 */
export function pathBasedConfigGenerator(
    options: PathBasedConfigGeneratorOptions = {}
): (event: LangTagCLIConfigGenerationEvent) => Promise<void> {
    const {
        includeFileName = false,
        removeBracketedFolders = true,
        ignoreFolders = [],
        ignoreStructured = {},
        lowercaseNamespace = false,
        namespaceCase,
        pathCase,
        fallbackNamespace,
        clearOnDefaultNamespace = true
    } = options;

    return async (event: LangTagCLIConfigGenerationEvent) => {
        const { relativePath, langTagConfig } = event;
        
        // Determine the actual fallback namespace (option g)
        const actualFallbackNamespace = fallbackNamespace ?? langTagConfig.collect?.defaultNamespace;

        // Step 1: Take relative path
        // Step 2: Split path into segments using path library
        let pathSegments = relativePath.split('/').filter(Boolean);

        if (pathSegments.length === 0) {
            return;
        }

        // Step 3: Handle filename based on option a)
        const fileName = pathSegments[pathSegments.length - 1];
        const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '');

        if (includeFileName) {
            // true: remove extension from filename in the list
            pathSegments[pathSegments.length - 1] = fileNameWithoutExt;
        } else {
            // false: remove filename from the list
            pathSegments = pathSegments.slice(0, -1);
        }

        // Step 4: Handle bracketed folders based on option b)
        pathSegments = pathSegments.map(segment => {
            const bracketMatch = segment.match(/^[\(\[](.+)[\)\]]$/);
            if (bracketMatch) {
                if (removeBracketedFolders) {
                    // true: remove these folders from the list
                    return null;
                } else {
                    // false: remove brackets around them
                    return bracketMatch[1];
                }
            }
            return segment;
        }).filter((seg): seg is string => seg !== null);

        // Step 5: Apply hierarchical ignore (option d) - remove matching folders hierarchically
        pathSegments = applyStructuredIgnore(pathSegments, ignoreStructured);

        // Step 6: Apply global ignore (option c) - remove globally excluded names
        pathSegments = pathSegments.filter(seg => !ignoreFolders.includes(seg));

        // Step 7: Determine namespace and handle fallback
        let namespace: string | undefined;
        let path: string | undefined;

        if (pathSegments.length >= 1) {
            // At least 1 entry - it becomes the namespace
            namespace = pathSegments[0];

            // Step 8: If more than 1 entry, rest creates joined "." path
            if (pathSegments.length > 1) {
                path = pathSegments.slice(1).join('.');
            }
        } else {
            // No entries left - use fallback namespace
            namespace = actualFallbackNamespace;
        }

        // Apply case transformations (from step 7 with options e) and f))
        if (namespace) {
            // Option e): lowercase namespace
            if (lowercaseNamespace) {
                namespace = namespace.toLowerCase();
            }
            // Option f): apply case transformation to namespace
            if (namespaceCase) {
                namespace = applyCaseTransform(namespace, namespaceCase);
            }
        }

        // Option f): apply case transformation to path segments
        if (path && pathCase) {
            const pathParts = path.split('.');
            const transformedParts = pathParts.map(part => applyCaseTransform(part, pathCase));
            path = transformedParts.join('.');
        }

        // Build the new configuration
        const newConfig: any = {};

        // Option h): clearOnDefaultNamespace
        if (clearOnDefaultNamespace && namespace === actualFallbackNamespace) {
            // When namespace equals default, clear it (don't add to config)
            if (path) {
                newConfig.path = path;
            } else {
                // No namespace, no path - clear entire config
                event.save(undefined);
                return;
            }
        } else {
            // Add namespace if present
            if (namespace) {
                newConfig.namespace = namespace;
            }
            // Add path if present and not empty
            if (path) {
                newConfig.path = path;
            }
        }

        // Save only if we have something to save
        if (Object.keys(newConfig).length > 0) {
            event.save(newConfig);
        }
    };
}

/**
 * Applies hierarchical structured ignore rules to path segments.
 * Processes segments depth-first, removing matches according to the structure.
 */
function applyStructuredIgnore(
    segments: string[],
    structure: Record<string, any>
): string[] {
    const result: string[] = [];
    let currentStructure = structure;
    
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // Check if current segment matches any key in current structure level
        if (segment in currentStructure) {
            const rule = currentStructure[segment];
            
            if (rule === true) {
                // Skip this segment (don't add to result)
                // Reset structure for next iteration
                currentStructure = structure;
                continue;
            } else if (Array.isArray(rule)) {
                // Add current segment to result
                result.push(segment);
                
                // Check if next segment should be removed
                if (i + 1 < segments.length && rule.includes(segments[i + 1])) {
                    // Skip next segment
                    i++;
                }
                // Reset structure
                currentStructure = structure;
                continue;
            } else if (typeof rule === 'object' && rule !== null) {
                // Add current segment and go deeper into structure
                result.push(segment);
                currentStructure = rule;
                continue;
            }
        }
        
        // No match - add segment and reset structure
        result.push(segment);
        currentStructure = structure;
    }
    
    return result;
}

/**
 * Applies case transformation to a string using the case library.
 */
function applyCaseTransform(str: string, caseType: string): string {
    const caseFunction = (caseLib as any)[caseType];
    if (typeof caseFunction === 'function') {
        return caseFunction(str);
    }
    return str;
}
