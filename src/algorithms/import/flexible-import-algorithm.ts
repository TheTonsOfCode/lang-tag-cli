import { LangTagCLIImportEvent } from "@/type.ts";
import { join } from "pathe";
import { CaseType, applyCaseTransform } from "../case-utils";
import micromatch from "micromatch";

/**
 * Available case transformation options for variable names.
 * Only includes transformations that produce valid JavaScript identifiers.
 */
export type VariableNameCaseType = 'no' | 'camel' | 'capital' | 'constant' | 'lower' | 'pascal' | 'snake' | 'swap' | 'upper';

/**
 * Case transformation configuration for file paths.
 * Can be a string for uniform case transformation, or an object with separate
 * case transformations for directories and files.
 */
export type FilePathCaseType = CaseType | {
    directories?: CaseType;
    files?: CaseType;
};

export interface VariableNameOptions {
    /**
     * Whether to prefix variable names with package name to avoid conflicts.
     * @default false
     */
    prefixWithPackageName?: boolean;

    /**
     * How to handle scoped package names (e.g., '@scope/package').
     * - 'remove-scope': Remove @scope/ part, keep only package name
     * - 'replace': Remove @ and replace / with underscores
     * @default 'replace'
     */
    scopedPackageHandling?: 'remove-scope' | 'replace';

    /**
     * Case transformation to apply to variable names.
     * Available options: 'camel', 'capital', 'constant', 'lower', 'no', 'pascal', 'snake', 'swap', 'upper'
     * @default 'no'
     */
    case?: VariableNameCaseType;

    /**
     * Whether to sanitize variable names by replacing invalid characters with $.
     * This ensures the final variable name is a valid JavaScript identifier.
     * @default true
     */
    sanitizeVariableName?: boolean;

    /**
     * How to handle tags without variableName.
     * - 'skip': Skip tags without variableName
     * - 'auto-generate': Generate names like 'translations1', 'translations2', etc. (default)
     * - Function: Custom function to generate variable names
     * @default 'auto-generate'
     */
    handleMissingVariableName?: 'skip' | 'auto-generate' | ((tag: any, packageName: string, fileName: string, index: number) => string);

    /**
     * Custom function to generate variable names, completely overriding original names from export.
     * When provided, this function will be used instead of the original variableName from the export.
     * 
     * Note: The returned custom name will still be processed by all other transformations
     * (case transformation, sanitization, prefixWithPackageName, etc.).
     * 
     * @param context - Context information about the import
     * @returns The custom variable name, or null to fall back to original naming logic
     * 
     * @example
     * ```typescript
     * customVariableName: (context) => {
     *   // Generate names based on package and file structure
     *   const packagePrefix = context.packageName.replace('@company/', '').replace('-', '');
     *   const fileBase = context.fileName.split('/').pop()?.replace('.ts', '') || 'unknown';
     *   return `${packagePrefix}_${fileBase}_${context.tagIndex + 1}`;
     *   // This will still be processed by case transformation, sanitization, etc.
     * }
     * ```
     */
    customVariableName?: (context: {
        packageName: string;
        fileName: string;
        originalVariableName: string | undefined;
        tagIndex: number;
        tag: any;
    }) => string | null;
}

export interface FilePathOptions {
    /**
     * Whether to group all translations from each package into a single file.
     * If false, preserves the original file structure from the library.
     * @default false
     */
    groupByPackage?: boolean;

    /**
     * Whether to include package name in the file path.
     * @default false
     */
    includePackageInPath?: boolean;

    /**
     * How to handle scoped package names in file paths (e.g., '@scope/package').
     * - 'remove-scope': Remove @scope/ part, keep only package name
     * - 'replace': Remove @ and replace / with dashes
     * @default 'replace'
     */
    scopedPackageHandling?: 'remove-scope' | 'replace';

    /**
     * Case transformation to apply to file names and path segments.
     * Can be a string for uniform case transformation, or an object with separate
     * case transformations for directories and files.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab', 
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default 'no'
     */
    case?: FilePathCaseType;
}

export interface FlexibleImportAlgorithmOptions {
    /**
     * Options for controlling variable name generation.
     */
    variableName?: VariableNameOptions;

    /**
     * Options for controlling file path generation.
     */
    filePath?: FilePathOptions;

    /**
     * Inclusion rules for filtering imports.
     * If undefined, all packages and namespaces are processed.
     * If defined, only matching packages and namespaces are processed.
     */
    include?: {
        /**
         * List of package name patterns to include from import.
         * Supports wildcards with * (e.g., '@company/*', 'ui-*')
         * @default undefined (include all)
         */
        packages?: string[];

        /**
         * List of namespace patterns to include from import.
         * Supports wildcards with * (e.g., 'ui.*', '*.common')
         * @default undefined (include all)
         */
        namespaces?: string[];
    };

    /**
     * Exclusion rules for filtering imports.
     * Applied after inclusion rules.
     */
    exclude?: {
        /**
         * List of package name patterns to exclude from import.
         * Supports wildcards with * (e.g., '@company/*', 'ui-*')
         * @default []
         */
        packages?: string[];

        /**
         * List of namespace patterns to exclude from import.
         * Supports wildcards with * (e.g., 'admin.*', '*.internal')
         * @default []
         */
        namespaces?: string[];
    };

    /**
     * Function to remap/override configs before saving imported tags.
     * Allows modification of namespace, path, and other config properties
     * based on package name, file path, or other context.
     * 
     * @param originalConfig - The original config from the imported tag
     * @param context - Context information about the import
     * @returns The modified config object, or null to remove the config from the tag
     * 
     * @example
     * ```typescript
     * configRemap: (config, context) => {
     *   // Override namespace based on package name
     *   if (context.packageName === 'ui-components') {
     *     return { ...config, namespace: 'ui' };
     *   }
     *   
     *   // Remove config for certain packages (tag will be imported without config)
     *   if (context.packageName === 'no-config-package') {
     *     return null;
     *   }
     *   
     *   // Add prefix to all paths
     *   if (config.path) {
     *     return { ...config, path: `lib.${config.path}` };
     *   }
     *   
     *   return config;
     * }
     * ```
     */
    configRemap?: (
        originalConfig: any,
        context: {
            packageName: string;
            fileName: string;
            variableName: string;
            tagIndex: number;
        }
    ) => any | null;

}

/**
 * Default import algorithm that imports translations from libraries.
 * 
 * This algorithm provides flexible options for organizing imported translations
 * while preserving the ability to customize the import process.
 * 
 * @param options - Configuration options for the import algorithm
 * @returns A function compatible with LangTagCLIConfig.import.onImport
 * 
 * @example
 * ```typescript
 * import { flexibleImportAlgorithm } from '@lang-tag/cli/algorithms';
 * 
 * export default {
 *   import: {
 *     onImport: flexibleImportAlgorithm({
 *       variableName: {
 *         prefixWithPackageName: true,
 *         scopedPackageHandling: 'replace', // '@scope/package' -> 'scope_package'
 *         case: 'camel', // 'scope_package_myVar' -> 'scopePackageMyVar'
 *         handleMissingVariableName: 'auto-generate' // Generate 'translations1', 'translations2', etc.
 *       },
 *       filePath: {
 *         groupByPackage: true,
 *         scopedPackageHandling: 'remove-scope', // '@scope/package' -> 'package'
 *         case: 'kebab' // 'package.ts' -> 'package.ts' (no change), 'my-file.ts' -> 'my-file.ts'
 *       },
 *       include: {
 *         packages: ['@company/*', 'ui-*'],
 *         namespaces: ['ui.*', '*.common']
 *       },
 *       exclude: {
 *         packages: ['@company/internal-*'],
 *         namespaces: ['admin.*', '*.internal']
 *       }
 *     })
 *   }
 * };
 * ```
 */
export function flexibleImportAlgorithm(
    options: FlexibleImportAlgorithmOptions = {}
): (event: LangTagCLIImportEvent) => void {
    const {
        variableName = {},
        filePath = {},
        include,
        exclude = {},
        configRemap
    } = options;

    const { packages: includePackages, namespaces: includeNamespaces } = include || {};
    const { packages: excludePackages = [], namespaces: excludeNamespaces = [] } = exclude;

    return (event: LangTagCLIImportEvent) => {
        const { exports, importManager, logger } = event;
        
        for (const { packageJSON, exportData } of exports) {
            const packageName = packageJSON.name || 'unknown-package';
            
            if (includePackages && !matchesAnyPattern(packageName, includePackages)) {
                logger.debug(`Skipping package not in include list: ${packageName}`);
                continue;
            }
            
            if (matchesAnyPattern(packageName, excludePackages)) {
                logger.debug(`Skipping excluded package: ${packageName}`);
                continue;
            }

            logger.debug(`Processing library: ${packageName}`);

            for (const file of exportData.files) {
                const originalFileName = file.relativeFilePath;
                
                const targetFilePath = generateFilePath(packageName, originalFileName, filePath);

                for (let i = 0; i < file.tags.length; i++) {
                    const tag = file.tags[i];
                    
                    const tagNamespace = (tag.config as any)?.namespace;
                    
                    if (includeNamespaces && tagNamespace && !matchesAnyPattern(tagNamespace, includeNamespaces)) {
                        logger.debug(`Skipping namespace not in include list: ${tagNamespace}`);
                        continue;
                    }
                    
                    if (tagNamespace && matchesAnyPattern(tagNamespace, excludeNamespaces)) {
                        logger.debug(`Skipping excluded namespace: ${tagNamespace}`);
                        continue;
                    }

                    const finalVariableName = generateVariableName(tag.variableName, packageName, originalFileName, i, variableName, tag);

                    if (finalVariableName === null) {
                        logger.debug(`Skipping tag without variableName in ${join(packageName, originalFileName)}`);
                        continue;
                    }

                    let finalConfig: any | null = tag.config;
                    if (configRemap) {
                        const remappedConfig = configRemap(tag.config, {
                            packageName,
                            fileName: originalFileName,
                            variableName: finalVariableName,
                            tagIndex: i
                        });
                        
                        if (remappedConfig === null) {
                            logger.debug(`Removing config due to configRemap returning null in ${join(packageName, originalFileName)}`);
                            finalConfig = null;
                        } else {
                            finalConfig = remappedConfig;
                        }
                    }

                    importManager.importTag(targetFilePath, {
                        variableName: finalVariableName,
                        translations: tag.translations,
                        config: finalConfig
                    });

                    logger.debug(`Imported: ${finalVariableName} -> ${targetFilePath}`);
                }
            }
        }
    };
}

function sanitizeVariableName(name: string): string {
    let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, '$');
    
    if (/^[0-9]/.test(sanitized)) {
        sanitized = '$' + sanitized;
    }
    
    if (sanitized === '') {
        sanitized = '$';
    }
    
    return sanitized;
}

/**
 * Applies case transformation to file path segments.
 * If caseType is a string, applies uniform transformation per segment.
 * If caseType is an object, applies separate transformations for directories and files.
 */
function applyCaseTransformToPath(filePath: string, caseType: FilePathCaseType): string {
    if (typeof caseType === 'string') {
        const segments = filePath.split('/');
        const fileName = segments[segments.length - 1];
        const directorySegments = segments.slice(0, -1);
        
        const transformedDirectories = directorySegments.map(dir => applyCaseTransform(dir, caseType));
        
        const transformedFileName = applyCaseTransformToFileName(fileName, caseType);
        
        if (transformedDirectories.length === 0) {
            return transformedFileName;
        }
        
        return [...transformedDirectories, transformedFileName].join('/');
    }
    
    if (typeof caseType === 'object') {
        const { directories = 'no', files = 'no' } = caseType;
        
        const segments = filePath.split('/');
        const fileName = segments[segments.length - 1];
        const directorySegments = segments.slice(0, -1);

        const transformedDirectories = directorySegments.map(dir => applyCaseTransform(dir, directories));
        
        const transformedFileName = applyCaseTransformToFileName(fileName, files);
        
        if (transformedDirectories.length === 0) {
            return transformedFileName;
        }
        
        return [...transformedDirectories, transformedFileName].join('/');
    }
    
    return filePath;
}

/**
 * Normalizes package name based on scoped package handling option.
 */
function normalizePackageName(
    packageName: string,
    scopedPackageHandling: 'remove-scope' | 'replace' = 'replace',
    context: 'variableName' | 'filePath' = 'variableName'
): string {
    switch (scopedPackageHandling) {
        case 'remove-scope':
            let result = packageName.replace(/^@[^/]+\//, '');
            if (context === 'variableName') {
                result = result.replace(/[^a-zA-Z0-9_$]/g, '_');
            }
            return result;
        case 'replace':
        default:
            let normalized = packageName.replace(/@/g, '').replace(/\//g, context === 'variableName' ? '_' : '-');
            if (context === 'variableName') {
                normalized = normalized.replace(/[^a-zA-Z0-9_$]/g, '_');
            }
            return normalized;
    }
}

/**
 * Generates the final variable name based on options.
 */
function generateVariableName(
    originalVariableName: string | undefined,
    packageName: string,
    fileName: string,
    index: number,
    options: VariableNameOptions,
    tag: any
): string | null {
    const { 
        prefixWithPackageName = false, 
        scopedPackageHandling = 'replace', 
        case: caseType = 'no',
        sanitizeVariableName: shouldSanitize = true,
        handleMissingVariableName = 'auto-generate',
        customVariableName
    } = options;
    
    if (customVariableName) {
        const customName = customVariableName({
            packageName,
            fileName,
            originalVariableName,
            tagIndex: index,
            tag
        });
        
        if (customName !== null) {
            originalVariableName = customName;
        }
    }
    
    if (!originalVariableName) {
        switch (handleMissingVariableName) {
            case 'skip':
                return null;
            case 'auto-generate':
                originalVariableName = `translations${index + 1}`;
                break;
            default:
                if (typeof handleMissingVariableName === 'function') {
                    originalVariableName = handleMissingVariableName({}, packageName, fileName, index);
                } else {
                    return null;
                }
        }
    }

    let finalName = originalVariableName;

    if (prefixWithPackageName) {
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling, 'variableName');
        finalName = `${normalizedPackageName}_${originalVariableName}`;
    }

    const transformedName = applyCaseTransform(finalName, caseType);
    
    return shouldSanitize ? sanitizeVariableName(transformedName) : transformedName;
}

/**
 * Generates the target file path for imported translations based on options.
 */
function generateFilePath(
    packageName: string,
    originalFileName: string,
    options: FilePathOptions
): string {
    const { groupByPackage = false, includePackageInPath = false, scopedPackageHandling = 'replace', case: caseType = 'no' } = options;

    if (groupByPackage) {
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling, 'filePath');
        const fileName = `${normalizedPackageName}.ts`;
        return applyCaseTransformToFileName(fileName, typeof caseType === 'string' ? caseType : caseType.files || 'no');
    } else if (includePackageInPath) {
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling, 'filePath');
        
        if (typeof caseType === 'string') {
            const transformedPackageName = applyCaseTransform(normalizedPackageName, caseType);
            const transformedFilePath = applyCaseTransformToPath(originalFileName, caseType);
            return join(transformedPackageName, transformedFilePath);
        } else {
            const transformedPackageName = applyCaseTransform(normalizedPackageName, caseType.directories || 'no');
            const transformedFilePath = applyCaseTransformToPath(originalFileName, caseType);
            return join(transformedPackageName, transformedFilePath);
        }
    } else {
        return applyCaseTransformToPath(originalFileName, caseType);
    }
}

/**
 * Applies case transformation to a file name while preserving the extension.
 */
function applyCaseTransformToFileName(fileName: string, caseType: CaseType): string {
    if (caseType === 'no') {
        return fileName;
    }

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return applyCaseTransform(fileName, caseType);
    }
    
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    
    const transformedName = applyCaseTransform(nameWithoutExt, caseType);
    return transformedName + extension;
}

/**
 * Checks if a string matches any of the given patterns using micromatch.
 * Supports glob patterns with * (e.g., '@company/*', 'ui-*', 'ui.*', '*.common')
 */
function matchesAnyPattern(str: string, patterns: string[]): boolean {
    return micromatch.isMatch(str, patterns);
}
