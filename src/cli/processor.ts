import {LangTagConfig} from "@/cli/config.ts";
import {LangTagTranslations, LangTagTranslationsConfig} from "@/index.ts";
import JSON5 from 'json5';
import {messageSkippingInvalidJson} from "@/cli/message";

export interface LangTagMatch {
    fullMatch: string;
    content1: string;
    content2?: string;
    variableName?: string;
    index: number;
}

export function extractLangTagData(config: LangTagConfig, match: LangTagMatch, beforeError: () => void) {
    const pos = config.translationArgPosition;
    const tagTranslationsContent = pos === 1 ? match.content1 : match.content2;

    if (!tagTranslationsContent) {
        beforeError();
        throw new Error('Translations not found');
    }

    const tagTranslations: LangTagTranslations = JSON5.parse(tagTranslationsContent);
    let tagConfigContent = pos === 1 ? match.content2 : match.content1;
    if (tagConfigContent) {
        tagConfigContent = JSON5.stringify(JSON5.parse(tagConfigContent), undefined, 4)
    }

    const tagConfig: LangTagTranslationsConfig = tagConfigContent ? JSON5.parse(tagConfigContent) : {
        path: '',
        namespace: ''
    };

    if (!tagConfig.path) tagConfig.path = ''
    if (!tagConfig.namespace) tagConfig.namespace = ''

    return {
        replaceTagConfigContent(newConfigString: string) {
            const tagFunction = `${config.tagName}(${tagTranslationsContent}, ${newConfigString})`;
            if (match.variableName) return ` ${match.variableName} = ${tagFunction}`;
            return tagFunction;
        },

        tagTranslationsContent,
        tagConfigContent,

        tagTranslations,
        tagConfig,
    }
}

export function findLangTags(config: Pick<LangTagConfig, 'tagName'>, content: string): LangTagMatch[] {
    const tagName = config.tagName;
    const objectPattern = '\\{[^]*?\\}';
    const firstCaptureGroup = `(${objectPattern})`;
    const optionalSecondParam = `(?:,\\s*(${objectPattern}))?`;
    const optionalVariableAssignment = `(?:\\s*(\\w+)\\s*=\\s*)?`;

    const pattern = new RegExp(`${optionalVariableAssignment}${tagName}\\(\\s*${firstCaptureGroup}\\s*${optionalSecondParam}\\s*\\)`, 'g');

    const matches: LangTagMatch[] = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
        matches.push({
            fullMatch: match[0],
            variableName: match[1] || undefined,
            content1: match[2],
            content2: match[3] || undefined,
            index: match.index,
        });
    }

    return matches.filter(m => {
        try {
            JSON5.parse(m.content1);
        } catch (error) {
            messageSkippingInvalidJson(m.content1, m);
            return false;
        }
        if (m.content2) {
            try {
                JSON5.parse(m.content2);
            } catch (error) {
                messageSkippingInvalidJson(m.content2, m);
                return false;
            }
        }
        return true;
    });
}

export function replaceLangTags(content: string, replacements: Map<LangTagMatch, string>): string {
    let updatedContent = content;
    let offset = 0;

    replacements.forEach((replacement, match) => {
        const startIdx = match.index + offset;
        const endIdx = startIdx + match.fullMatch.length;

        updatedContent = updatedContent.slice(0, startIdx) + replacement + updatedContent.slice(endIdx);

        offset += replacement.length - match.fullMatch.length;
    });

    return updatedContent;
}