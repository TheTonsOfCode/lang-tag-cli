import fs from "fs";
import path from "pathe";
import {EXPORTS_FILE_NAME} from "@/core/constants.ts";
import process from "node:process";
import {LangTagCLILogger} from "@/logger.ts";

export interface ExportFileWithPackage {
    exportPath: string;
    packageJsonPath: string;
}

export function $LT_CollectExportFiles(logger: LangTagCLILogger): ExportFileWithPackage[] {
    const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        logger.error('"node_modules" directory not found')
        return [];
    }

    const results: ExportFileWithPackage[] = [];

    try {
        const entries = fs.readdirSync(nodeModulesPath);
        
        for (const entry of entries) {
            const fullPath = path.join(nodeModulesPath, entry);
            const stat = fs.statSync(fullPath);
            
            if (!stat.isDirectory()) continue;

            if (entry.startsWith('@')) {
                // Process scoped packages
                try {
                    const scopedEntries = fs.readdirSync(fullPath);
                    
                    for (const scopedEntry of scopedEntries) {
                        const packageDir = path.join(fullPath, scopedEntry);
                        const packageJsonPath = path.join(packageDir, 'package.json');
                        
                        if (fs.existsSync(packageJsonPath)) {
                            searchForExportFiles(packageDir, (exportPath) => {
                                results.push({
                                    exportPath,
                                    packageJsonPath
                                });
                            });
                        }
                    }
                } catch (error) {
                    // Skip if cannot read directory
                }
            } else {
                // Process regular package
                const packageJsonPath = path.join(fullPath, 'package.json');
                
                if (fs.existsSync(packageJsonPath)) {
                    searchForExportFiles(fullPath, (exportPath) => {
                        results.push({
                            exportPath,
                            packageJsonPath
                        });
                    });
                }
            }
        }
    } catch (error) {
        logger.error('Error reading node_modules: {error}', {
            error: String(error),
        });
    }

    return results;
}

function searchForExportFiles(
    dir: string, 
    onExportFound: (exportPath: string) => void,
    currentDepth: number = 0,
    maxDepth: number = 1
): void {
    if (currentDepth > maxDepth) return;
    
    try {
        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursively search subdirectories (limited to maxDepth)
                searchForExportFiles(fullPath, onExportFound, currentDepth + 1, maxDepth);
            } else if (entry === EXPORTS_FILE_NAME) {
                // Found an export file
                onExportFound(fullPath);
            }
        }
    } catch (error) {
        // Skip if cannot read directory
    }
}
