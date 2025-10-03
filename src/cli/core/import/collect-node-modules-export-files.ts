import fs from "fs";
import path from "pathe";
import {EXPORTS_FILE_NAME} from "@/cli/core/constants.ts";
import process from "node:process";
import {$LT_Logger} from "@/cli/core/logger.ts";

export function $LT_CollectNodeModulesExportFilePaths(logger: $LT_Logger): string[] {
    const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        logger.error('"node_modules" directory not found')
        return [];
    }

    function findExportJson(dir: string, depth: number = 0, maxDepth: number = 3): string[] {
        if (depth > maxDepth) return [];
        let results: string[] = [];

        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    results = results.concat(findExportJson(fullPath, depth + 1, maxDepth));
                } else if (file === EXPORTS_FILE_NAME) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            logger.error('Error reading directory "{dir}": {error}', {
                dir,
                error: String(error),
            })
        }

        return results;
    }

    return findExportJson(nodeModulesPath);
}