import process from 'node:process';

import { existsSync } from 'fs';
import { globby } from 'globby';
import path from 'path';
import {
    Project,
    SyntaxKind,
    VariableDeclarationList,
    VariableStatement,
} from 'ts-morph';

import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';

import { $LT_GetCommandEssentials } from './setup';

export async function $LT_CMD_HideCompiledExports(options?: {
    distDir?: string;
}) {
    const { config, logger } = await $LT_GetCommandEssentials();

    const distDir = options?.distDir || config.hideDistDir || 'dist';
    const distPath = path.resolve(process.cwd(), distDir);

    if (!existsSync(distPath)) {
        logger.warn('Dist directory does not exist: {distPath}', { distPath });
        return;
    }

    logger.info('Scanning source files for lang-tag variables...');

    // Collect files with lang-tag variables, mapping source file to its variable names
    const files = await $LT_CollectCandidateFilesWithTags({ config, logger });

    // Map: source file path -> Set of variable names from lang-tags in that file
    const sourceFileToVariables = new Map<string, Set<string>>();
    const cwd = process.cwd();

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
        logger.info('No lang-tag variables found in source files.');
        return;
    }

    logger.info('Found {count} source files with lang-tag variables', {
        count: sourceFileToVariables.size,
    });

    // Find all .d.ts files in dist directory
    const dtsFiles = await globby('**/*.d.ts', {
        cwd: distPath,
        absolute: true,
    });

    if (dtsFiles.length === 0) {
        logger.info('No .d.ts files found in {distPath}', { distPath });
        return;
    }

    logger.info('Found {count} .d.ts files to process', {
        count: dtsFiles.length,
    });

    // Create a map of .d.ts files by their base name (without extension and path)
    // This helps us match source files to their compiled .d.ts counterparts
    const dtsFileMap = new Map<string, string>();
    for (const dtsFile of dtsFiles) {
        const relativeDtsPath = path.relative(distPath, dtsFile);
        // Try different matching strategies:
        // 1. Exact match: src/App.tsx -> dist/App.d.ts or dist/src/App.d.ts
        // 2. Base name match: App.tsx -> App.d.ts
        const baseName = path.basename(dtsFile, '.d.ts');
        const relativePathWithoutExt = relativeDtsPath.replace(/\.d\.ts$/, '');

        // Store multiple possible keys for matching
        dtsFileMap.set(relativePathWithoutExt, dtsFile);
        dtsFileMap.set(baseName, dtsFile);
    }

    // Initialize ts-morph project
    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
    });

    let hiddenCount = 0;
    const processedDtsFiles = new Set<string>();

    // Process each source file and find its corresponding .d.ts file
    for (const [sourceFilePath, variableNames] of sourceFileToVariables) {
        try {
            // Find corresponding .d.ts file
            const sourceRelativePath = path.relative(cwd, sourceFilePath);
            const sourceBaseName = path.basename(
                sourceFilePath,
                path.extname(sourceFilePath)
            );

            // Try to find matching .d.ts file
            // Strategy 1: Match by relative path (e.g., src/App.tsx -> dist/src/App.d.ts)
            let dtsFilePath = dtsFileMap.get(
                sourceRelativePath.replace(/\.(ts|tsx|js|jsx)$/, '')
            );

            // Strategy 2: Match by base name (e.g., App.tsx -> dist/App.d.ts)
            if (!dtsFilePath) {
                dtsFilePath = dtsFileMap.get(sourceBaseName);
            }

            // Strategy 3: Try with full relative path including extension removal
            if (!dtsFilePath) {
                const sourcePathWithoutExt = sourceRelativePath.replace(
                    /\.(ts|tsx|js|jsx)$/,
                    ''
                );
                dtsFilePath = dtsFileMap.get(sourcePathWithoutExt);
            }

            if (!dtsFilePath) {
                if (config.debug) {
                    logger.debug(
                        'No corresponding .d.ts file found for {sourceFile}',
                        { sourceFile: sourceRelativePath }
                    );
                }
                continue;
            }

            // Skip if already processed
            if (processedDtsFiles.has(dtsFilePath)) {
                continue;
            }

            processedDtsFiles.add(dtsFilePath);

            const sourceFile = project.addSourceFileAtPath(dtsFilePath);
            let hasChanges = false;

            // Find and hide exports of lang-tag variables from this specific source file
            const exportsToHide: string[] = [];
            const processedStatements = new Set();

            // Check variable declarations with export (including "export declare const")
            for (const declaration of sourceFile.getVariableDeclarations()) {
                const name = declaration.getName();
                // Only hide if this variable is from the current source file
                if (variableNames.has(name)) {
                    const parent = declaration.getParent();
                    if (
                        parent &&
                        parent.getKindName() === 'VariableDeclarationList'
                    ) {
                        const varList = parent as VariableDeclarationList;
                        const grandParent = varList.getParent();
                        if (
                            grandParent &&
                            grandParent.getKindName() === 'VariableStatement'
                        ) {
                            const varStatement =
                                grandParent as VariableStatement;
                            // Check for export keyword (handles both "export const" and "export declare const")
                            if (varStatement.hasExportKeyword()) {
                                // Avoid processing the same statement twice
                                if (!processedStatements.has(varStatement)) {
                                    processedStatements.add(varStatement);
                                    exportsToHide.push(name);
                                    // Remove only the export modifier, keep the declaration
                                    // Use toggleModifier to remove export while keeping other modifiers
                                    varStatement.toggleModifier(
                                        'export',
                                        false
                                    );
                                    hasChanges = true;
                                }
                            }
                        }
                    }
                }
            }

            if (hasChanges) {
                // Save the file
                sourceFile.saveSync();
                hiddenCount += exportsToHide.length;

                if (config.debug) {
                    logger.debug(
                        'Hidden exports from {file}: {variables} (from {sourceFile})',
                        {
                            file: path.relative(process.cwd(), dtsFilePath),
                            variables: exportsToHide.join(', '),
                            sourceFile: sourceRelativePath,
                        }
                    );
                }
            }
        } catch (error: any) {
            logger.warn('Error processing file {file}: {error}', {
                file: path.relative(cwd, sourceFilePath),
                error: error.message || String(error),
            });
        }
    }

    logger.success('Hidden {hiddenCount} exports from {fileCount} files.', {
        hiddenCount,
        fileCount: processedDtsFiles.size,
    });
}
