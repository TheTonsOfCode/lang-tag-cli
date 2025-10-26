import { globby } from "globby";
import path from "pathe";
import {EXPORTS_FILE_NAME} from "@/core/constants.ts";
import process from "node:process";
import {LangTagCLILogger} from "@/logger.ts";

export async function $LT_CollectExportFiles(logger: LangTagCLILogger): Promise<string[]> {
    const results: string[] = [];

    try {
        const exportFiles = await globby([
            `node_modules/**/${EXPORTS_FILE_NAME}`
        ], {
            cwd: process.cwd(),
            onlyFiles: true,
            ignore: ['**/node_modules/**/node_modules/**'],
            deep: 4
        });

        results.push(...exportFiles.map(file => path.resolve(file)));

        logger.debug('Found {count} export files in node_modules', {
            count: results.length
        });
    } catch (error) {
        logger.error('Error scanning node_modules with globby: {error}', {
            error: String(error),
        });
    }

    return results;
}
