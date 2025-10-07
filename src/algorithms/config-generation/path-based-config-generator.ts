import { LangTagCLIConfigGenerationEvent } from "@/config.ts";
import { dirname, basename, sep } from "pathe";
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
     * Defaults to the defaultNamespace from langTagConfig.collect.defaultNamespace if not provided.
     * @default undefined
     */
    fallbackNamespace?: string;

    /**
     * When true and the generated namespace equals the fallback/default namespace,
     * the namespace will be omitted from the configuration as it's redundant.
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
        
        // Determine the actual fallback namespace from options or config default
        const actualFallbackNamespace = fallbackNamespace ?? langTagConfig.collect?.defaultNamespace;

        // Extract path segments from relative path using path library for cross-platform compatibility
        let pathSegments = relativePath.split(sep).filter(Boolean);

        if (pathSegments.length === 0) {
            return;
        }

        // Handle filename inclusion
        const fileName = pathSegments[pathSegments.length - 1];
        const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '');

        if (includeFileName) {
            // Include filename without extension as a segment
            pathSegments[pathSegments.length - 1] = fileNameWithoutExt;
        } else {
            // Remove filename from segments
            pathSegments = pathSegments.slice(0, -1);
        }

        // Process bracketed folders
        pathSegments = pathSegments.map(segment => {
            const bracketMatch = segment.match(/^[\(\[](.+)[\)\]]$/);
            if (bracketMatch) {
                // Folder is wrapped in brackets
                return removeBracketedFolders ? null : bracketMatch[1];
            }
            return segment;
        }).filter((seg): seg is string => seg !== null);

        // Apply hierarchical ignore rules
        pathSegments = applyStructuredIgnore(pathSegments, ignoreStructured);

        // Apply global ignore rules
        pathSegments = pathSegments.filter(seg => !ignoreFolders.includes(seg));

        // Generate namespace and path from remaining segments
        let namespace: string | undefined;
        let path: string | undefined;

        if (pathSegments.length >= 1) {
            // First segment becomes the namespace
            namespace = pathSegments[0];

            // Remaining segments form the path
            if (pathSegments.length > 1) {
                path = pathSegments.slice(1).join('.');
            }
        } else {
            // No segments remain, use fallback
            namespace = actualFallbackNamespace;
        }

        // Apply case transformations
        if (namespace) {
            if (lowercaseNamespace) {
                namespace = namespace.toLowerCase();
            }
            if (namespaceCase) {
                namespace = applyCaseTransform(namespace, namespaceCase);
            }
        }

        if (path && pathCase) {
            const pathParts = path.split('.');
            const transformedParts = pathParts.map(part => applyCaseTransform(part, pathCase));
            path = transformedParts.join('.');
        }

        // Build the configuration object
        const newConfig: any = {};

        // Handle default namespace clearing
        if (clearOnDefaultNamespace && namespace === actualFallbackNamespace) {
            // Omit namespace when it equals the default
            if (path) {
                newConfig.path = path;
            } else {
                // No namespace, no path - clear entire config
                event.save(undefined);
                return;
            }
        } else {
            if (namespace) {
                newConfig.namespace = namespace;
            }
            if (path) {
                newConfig.path = path;
            }
        }

        // Save configuration if we have any fields
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
