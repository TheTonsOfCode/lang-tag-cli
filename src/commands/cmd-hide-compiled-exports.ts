import process from 'node:process';

import { existsSync, writeFileSync } from 'fs';
import path from 'path';

import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';
import { $LT_HideExportsInDtsFile } from '@/core/hide-compiled-exports/hide-exports';
import { $LT_MatchSourceToDtsFiles } from '@/core/hide-compiled-exports/match-source-to-dts';

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

    const files = await $LT_CollectCandidateFilesWithTags({
        config,
        logger,
        skipEmptyNamespaceCheck: true,
    });

    const matches = await $LT_MatchSourceToDtsFiles(
        files,
        distPath,
        process.cwd(),
        config
    );

    if (matches.length === 0) {
        logger.info(
            'No lang-tag variables found in source files or no matching .d.ts files found.'
        );
        return;
    }

    logger.info('Found {count} .d.ts files to process', {
        count: matches.length,
    });

    let hiddenCount = 0;

    for (const match of matches) {
        try {
            const result = $LT_HideExportsInDtsFile(
                match.dtsFilePath,
                match.variableNames
            );

            if (!result.hiddenCount) {
                continue;
            }

            writeFileSync(match.dtsFilePath, result.modifiedContent, 'utf-8');
            hiddenCount += result.hiddenCount;

            const hiddenVariables = Array.from(match.variableNames).join(', ');
            logger.debug(
                'Hidden exports from {file}: {variables} (from {sourceFile})',
                {
                    file: path.relative(process.cwd(), match.dtsFilePath),
                    variables: hiddenVariables,
                    sourceFile: match.sourceRelativePath,
                }
            );
        } catch (error: any) {
            logger.warn('Error processing file {file}: {error}', {
                file: match.sourceRelativePath,
                error: error.message || String(error),
            });
        }
    }

    logger.success('Hidden {hiddenCount} exports from {fileCount} files.', {
        hiddenCount,
        fileCount: matches.length,
    });
}
