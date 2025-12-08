import process from 'node:process';

import fs from 'fs';
import { globby } from 'globby';
import path from 'pathe';

import { EXPORTS_FILE_NAME } from '@/core/constants';
import { LangTagCLILogger } from '@/logger';

export interface ExportFileWithPackage {
    exportPath: string;
    packageJsonPath: string;
}

export async function $LT_CollectExportFiles(
    logger: LangTagCLILogger
): Promise<ExportFileWithPackage[]> {
    const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        logger.error('"node_modules" directory not found');
        return [];
    }

    const results: ExportFileWithPackage[] = [];

    try {
        const exportFiles = await globby(
            [`node_modules/**/${EXPORTS_FILE_NAME}`],
            {
                cwd: process.cwd(),
                onlyFiles: true,
                ignore: ['**/node_modules/**/node_modules/**'],
                deep: 4,
            }
        );

        // Second stage: match each export file with its package.json
        for (const exportFile of exportFiles) {
            const fullExportPath = path.resolve(exportFile);
            const packageJsonPath = findPackageJsonForExport(
                fullExportPath,
                nodeModulesPath
            );

            if (packageJsonPath) {
                results.push({
                    exportPath: fullExportPath,
                    packageJsonPath,
                });
            } else {
                logger.warn(
                    'Found export file but could not match package.json: {exportPath}',
                    {
                        exportPath: fullExportPath,
                    }
                );
            }
        }

        logger.debug(
            'Found {count} export files with matching package.json in node_modules',
            {
                count: results.length,
            }
        );
    } catch (error) {
        logger.error('Error scanning node_modules with globby: {error}', {
            error: String(error),
        });
    }

    return results;
}

function findPackageJsonForExport(
    exportPath: string,
    nodeModulesPath: string
): string | null {
    const relativePath = path.relative(nodeModulesPath, exportPath);
    const pathParts = relativePath.split(path.sep);

    if (pathParts.length < 2) {
        return null;
    }

    if (pathParts[0].startsWith('@')) {
        // For scoped packages: node_modules/@scope/package/...
        if (pathParts.length >= 3) {
            const packageDir = path.join(
                nodeModulesPath,
                pathParts[0],
                pathParts[1]
            );
            const packageJsonPath = path.join(packageDir, 'package.json');

            if (fs.existsSync(packageJsonPath)) {
                return packageJsonPath;
            }
        }
    } else {
        // For regular packages: node_modules/package/...
        const packageDir = path.join(nodeModulesPath, pathParts[0]);
        const packageJsonPath = path.join(packageDir, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
            return packageJsonPath;
        }
    }

    return null;
}
