import {LangTagConfig} from "@/cli/config.ts";
import {readJSON, writeJSON} from "@/cli/commands/utils/file.ts";
import process from "node:process";
import {messageErrorInFile, messageWrittenExportsFile} from "@/cli/message";
import {readFileSync} from "fs";
import {extractLangTagData, findLangTags} from "@/cli/processor.ts";
import {EXPORTS_FILE_NAME} from "@/cli/constants.ts";
import path from "path";
import {LangTagExportData, LangTagExportFileData, LangTagExportFiles} from "@/cli";

export async function saveAsLibrary(files: string[], config: LangTagConfig) {

    const cwd = process.cwd();

    const packageJson: any = await readJSON(path.resolve(cwd, 'package.json'));

    if (!packageJson) {
        throw new Error('package.json not found');
    }

    const pos = config.translationArgPosition;

    const langTagFiles: LangTagExportFiles = {};

    for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const matches = findLangTags(config, content);

        if (!matches?.length) {
            continue;
        }

        const relativePath = path.relative(cwd, file)

        const fileObject: LangTagExportFileData = {
            matches: []
        }
        langTagFiles[relativePath] = fileObject;

        for (let match of matches) {
            const {tagTranslationsContent, tagConfigContent} = extractLangTagData(config, match, () => {
                messageErrorInFile(`Translations at ${pos} argument position are not defined`, file, match);
            });

            fileObject.matches.push({
                translations: tagTranslationsContent,
                config: tagConfigContent,
                variableName: match.variableName
            });
        }
    }

    const data: LangTagExportData = {
        language: config.language,
        packageName: packageJson.name || '',
        files: langTagFiles
    };

    await writeJSON(EXPORTS_FILE_NAME, data);
    messageWrittenExportsFile();
}