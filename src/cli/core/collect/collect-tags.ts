import path from "path";
import process from "node:process";
import {readFileSync} from "fs";

import {globby} from "globby";

import {LangTagConfig} from "@/cli/config.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {$LT_Tag, $LT_TagProcessor} from "@/cli/core/processor.ts";

export interface $LT_TagCandidateFile {

    relativeFilePath: string;
    tags: $LT_Tag[]
}

interface Props {

    config: LangTagConfig;
    logger: $LT_Logger;
    filesToScan?: string[]
}

export async function $LT_CollectCandidateFilesWithTags(props: Props): Promise<$LT_TagCandidateFile[]> {
    const {config, logger} = props;
    const processor = new $LT_TagProcessor(config);

    const cwd = process.cwd();

    let filesToScan = props.filesToScan;
    if (!filesToScan) {
        filesToScan = await globby(config.includes, {cwd, ignore: config.excludes, absolute: true});
    }

    const candidates: $LT_TagCandidateFile[] = [];

    for (const filePath of filesToScan) {
        const fileContent = readFileSync(filePath, 'utf-8');

        let tags = processor.extractTags(fileContent);

        if (!tags?.length) {
            continue;
        }

        tags = tags.filter((tag) => {
            if (tag.validity === 'invalid-param-1')
                logger.debug('Skipping tag "{fullMatch}". Invalid JSON: "{invalid}"', {
                    fullMatch: tag.fullMatch,
                    invalid: tag.parameter1Text
                });
            if (tag.validity === 'invalid-param-2')
                logger.debug('Skipping tag "{fullMatch}". Invalid JSON: "{invalid}"', {
                    fullMatch: tag.fullMatch,
                    invalid: tag.parameter2Text
                });
            if (tag.validity === 'translations-not-found')
                logger.debug('Skipping tag "{fullMatch}". Translations not found at parameter position: {pos}', {
                    fullMatch: tag.fullMatch,
                    pos: config.translationArgPosition
                });

            return tag.validity === "ok";
        });

        // TODO: conflict resolution system

        if (!tags?.length) {
            continue;
        }

        const relativeFilePath = path.relative(cwd, filePath)

        candidates.push({relativeFilePath, tags});
    }

    return candidates;
}