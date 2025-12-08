import { globby } from 'globby';
import path from 'path';

import { $LT_TagCandidateFile } from '@/core/collect/collect-tags';
import { LangTagCLIConfig } from '@/type';

export interface SourceToDtsMatch {
    sourceFilePath: string;
    sourceRelativePath: string;
    dtsFilePath: string;
    variableNames: Set<string>;
}

export type MatchingStrategy =
    | 'relative-path'
    | 'includes-prefix-stripped'
    | 'base-name'
    | null;

export interface MatchingResult {
    dtsFilePath: string | null;
    strategy: MatchingStrategy;
}

/**
 * Extracts directory prefixes from includes patterns.
 * Handles patterns like:
 * - src/.../*.ts -> src
 * - (components|shared)/.../*.ts -> components, shared
 * - lib/.../*.ts -> lib
 */
function extractPrefixesFromIncludes(includes: string[]): string[] {
    const prefixes = new Set<string>();

    for (const pattern of includes) {
        // Match patterns like '(components|shared)/**/*.{js,ts}' FIRST
        const groupMatch = pattern.match(/^\(([^)]+)\)\/\*\*/);
        if (groupMatch) {
            const options = groupMatch[1].split('|').map((s) => s.trim());
            options.forEach((opt) => prefixes.add(opt));
            continue;
        }

        // Match patterns like 'src/**/*.{js,ts}' or 'lib/**/*.ts'
        const simpleMatch = pattern.match(/^([^/]+)\/\*\*/);
        if (simpleMatch) {
            prefixes.add(simpleMatch[1]);
            continue;
        }

        // Match patterns like 'src/*.ts' or 'lib/file.ts'
        const singleMatch = pattern.match(/^([^/]+)\//);
        if (singleMatch) {
            prefixes.add(singleMatch[1]);
        }
    }

    return Array.from(prefixes);
}

export function findMatchingDtsFile(
    sourceFilePath: string,
    sourceRelativePath: string,
    dtsFileMap: Map<string, string>,
    config?: LangTagCLIConfig
): MatchingResult {
    const sourceBaseName = path.basename(
        sourceFilePath,
        path.extname(sourceFilePath)
    );

    // Strategy 1: Match by relative path (e.g., src/App.tsx -> dist/src/App.d.ts)
    const relativePathKey = sourceRelativePath.replace(
        /\.(ts|tsx|js|jsx)$/,
        ''
    );
    let dtsFilePath = dtsFileMap.get(relativePathKey);
    if (dtsFilePath) {
        return { dtsFilePath, strategy: 'relative-path' };
    }

    // Strategy 2: Strip prefixes from includes config and try matching
    if (config?.includes) {
        const prefixes = extractPrefixesFromIncludes(config.includes);
        for (const prefix of prefixes) {
            // Check if sourceRelativePath starts with the prefix
            const prefixPattern = new RegExp(
                `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`
            );
            if (prefixPattern.test(sourceRelativePath)) {
                // Remove the prefix and try matching
                const strippedPath = sourceRelativePath.replace(
                    prefixPattern,
                    ''
                );
                const strippedPathKey = strippedPath.replace(
                    /\.(ts|tsx|js|jsx)$/,
                    ''
                );

                // Try matching with stripped path (can be nested path or just base name)
                dtsFilePath = dtsFileMap.get(strippedPathKey);
                if (dtsFilePath) {
                    return {
                        dtsFilePath,
                        strategy: 'includes-prefix-stripped',
                    };
                }
            }
        }
    }

    // Strategy 3: Match by base name (e.g., App.tsx -> dist/App.d.ts) - LAST RESORT
    dtsFilePath = dtsFileMap.get(sourceBaseName);
    if (dtsFilePath) {
        return { dtsFilePath, strategy: 'base-name' };
    }

    return { dtsFilePath: null, strategy: null };
}

export async function $LT_MatchSourceToDtsFiles(
    files: $LT_TagCandidateFile[],
    distPath: string,
    cwd: string,
    config?: LangTagCLIConfig
): Promise<SourceToDtsMatch[]> {
    const sourceFileToVariables = new Map<string, Set<string>>();

    for (const file of files) {
        const sourceFilePath = path.resolve(cwd, file.relativeFilePath);
        const variableNames = new Set<string>();

        for (const tag of file.tags) {
            if (tag.variableName) {
                variableNames.add(tag.variableName);
            }
        }

        if (variableNames.size > 0) {
            sourceFileToVariables.set(sourceFilePath, variableNames);
        }
    }

    if (sourceFileToVariables.size === 0) {
        return [];
    }

    const dtsFiles = await globby('**/*.d.ts', {
        cwd: distPath,
        absolute: true,
    });

    if (dtsFiles.length === 0) {
        return [];
    }

    const dtsFileMap = new Map<string, string>();
    for (const dtsFile of dtsFiles) {
        const relativeDtsPath = path.relative(distPath, dtsFile);
        const baseName = path.basename(dtsFile, '.d.ts');
        const relativePathWithoutExt = relativeDtsPath.replace(/\.d\.ts$/, '');

        dtsFileMap.set(relativePathWithoutExt, dtsFile);
        dtsFileMap.set(baseName, dtsFile);
    }

    const matches: SourceToDtsMatch[] = [];
    const processedDtsFiles = new Set<string>();

    for (const [sourceFilePath, variableNames] of sourceFileToVariables) {
        const sourceRelativePath = path.relative(cwd, sourceFilePath);
        const match = findMatchingDtsFile(
            sourceFilePath,
            sourceRelativePath,
            dtsFileMap,
            config
        );

        if (!match.dtsFilePath) {
            continue;
        }

        // Skip if already processed (multiple source files can map to same .d.ts)
        if (processedDtsFiles.has(match.dtsFilePath)) {
            continue;
        }

        processedDtsFiles.add(match.dtsFilePath);

        matches.push({
            sourceFilePath,
            sourceRelativePath,
            dtsFilePath: match.dtsFilePath,
            variableNames,
        });
    }

    return matches;
}
