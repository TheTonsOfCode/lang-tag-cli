import {LangTagConfig} from "@/cli/config.ts";
import {extractLangTagData, findLangTags, LangTagMatch, replaceLangTags} from "@/cli/processor.ts";
import {readFileSync} from "fs";
import {writeFile} from "fs/promises";
import JSON5 from "json5";
import {sep} from "path";
import {messageErrorInFile} from "@/cli/message.ts";

export async function checkAndRegenerateFileLangTags(
    config: LangTagConfig,
    file: string,
    path: string,
) {
    const content = readFileSync(file, 'utf-8');

    let libraryImportsDir = config.import.dir;
    if (!libraryImportsDir.endsWith(sep)) libraryImportsDir += sep;

    const pos = config.translationArgPosition;

    const matches = findLangTags(config, content);

    const replacements: Map<LangTagMatch, string> = new Map();
    for (let match of matches) {
        const {tagConfig, tagConfigContent, replaceTagConfigContent} = extractLangTagData(config, match, () => {
            messageErrorInFile(`Translations at ${pos} argument position are not defined`, file, match);
        });

        const newConfig = config.onConfigGeneration({
            config: tagConfig,
            fullPath: file,
            path,
            isImportedLibrary: path.startsWith(libraryImportsDir)
        });

        if (!tagConfigContent || newConfig) {
            const newConfigString = JSON5.stringify(newConfig, undefined, 4);
            if (tagConfigContent !== newConfigString) {
                replacements.set(match, replaceTagConfigContent(newConfigString));
            }
        }
    }

    if (replacements.size) {
        const newContent = replaceLangTags(content, replacements);
        await writeFile(file, newContent, 'utf-8');
        return true;
    }
    return false;
}
