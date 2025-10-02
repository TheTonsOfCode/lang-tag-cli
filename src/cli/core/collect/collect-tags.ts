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
                    fullMatch: tag.fullMatch.trim(),
                    invalid: tag.parameter1Text
                });
            if (tag.validity === 'invalid-param-2')
                logger.debug('Skipping tag "{fullMatch}". Invalid JSON: "{invalid}"', {
                    fullMatch: tag.fullMatch.trim(),
                    invalid: tag.parameter2Text
                });
            if (tag.validity === 'translations-not-found')
                logger.debug('Skipping tag "{fullMatch}". Translations not found at parameter position: {pos}', {
                    fullMatch: tag.fullMatch.trim(),
                    pos: config.translationArgPosition
                });

            return tag.validity === "ok";
        });

        if (!tags?.length) {
            continue;
        }

        for (let tag of tags) {
            tag.parameterConfig = config.collect!.onCollectConfigFix!(tag.parameterConfig, config);
        }

        tags = tags.filter((tag) => {
            if (!tag.parameterConfig) {
                logger.warn('Skipping tag "{fullMatch}". Tag configuration not defined. (Check lang-tag config at collect.onCollectConfigFix)', {
                    fullMatch: tag.fullMatch.trim()
                });
                return false;
            }
            if (!tag.parameterConfig.namespace) {
                logger.warn('Skipping tag "{fullMatch}". Tag configuration namespace not defined. (Check lang-tag config at collect.onCollectConfigFix)', {
                    fullMatch: tag.fullMatch.trim()
                });
                return false;
            }
            return true;
        })

        // TODO: conflict resolution system

        const relativeFilePath = path.relative(cwd, filePath)

        candidates.push({relativeFilePath, tags});
    }

    return candidates;
}