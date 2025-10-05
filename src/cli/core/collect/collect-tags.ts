import path from "path";
import process from "node:process";
import {readFileSync} from "fs";

import {globby} from "globby";

import {LangTagCLIConfig, LangTagCLIProcessedTag} from "@/cli/config.ts";
import {LangTagCLILogger} from "@/cli/logger.ts";
import {$LT_TagProcessor} from "@/cli/core/processor.ts";
import {$LT_FilterEmptyNamespaceTags, $LT_FilterInvalidTags} from "@/cli/core/collect/fillters.ts";

export interface $LT_TagCandidateFile {

    relativeFilePath: string;
    tags: LangTagCLIProcessedTag[]
}

interface Props {

    config: LangTagCLIConfig;
    logger: LangTagCLILogger;
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

        if (!tags.length) {
            continue;
        }

        tags = $LT_FilterInvalidTags(tags, config, logger);

        if (!tags.length) {
            continue;
        }

        for (let tag of tags) {
            tag.parameterConfig = config.collect!.onCollectConfigFix!(tag.parameterConfig, config);
        }

        // Note: onCollectConfigFix should always fix empty namespace tags to be directed to default namespace
        tags = $LT_FilterEmptyNamespaceTags(tags, logger);

        const relativeFilePath = path.relative(cwd, filePath)

        candidates.push({relativeFilePath, tags});
    }

    return candidates;
}