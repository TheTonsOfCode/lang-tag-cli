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
    const optionalVariableAssignment = `(?:\\s*(\\w+)\\s*=\\s*)?`;
    
    // Find all potential lang tag matches
    const matches: LangTagMatch[] = [];
    let currentIndex = 0;
    
    // Create a regex to find the start of a lang tag
    const startPattern = new RegExp(`${optionalVariableAssignment}${tagName}\\(\\s*\\{`, 'g');
    
    while (true) {
        // Find the next potential match
        startPattern.lastIndex = currentIndex;
        const startMatch = startPattern.exec(content);
        
        if (!startMatch) break;
        
        const matchStartIndex = startMatch.index;
        const variableName = startMatch[1] || undefined;
        
        // Find the matching closing brace for the first object
        let braceCount = 1;
        let i = matchStartIndex + startMatch[0].length;
        
        while (i < content.length && braceCount > 0) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;
            i++;
        }
        
        if (braceCount !== 0) {
            // No matching closing brace found, skip this match
            currentIndex = matchStartIndex + 1;
            continue;
        }
        
        // Check if there's a second parameter
        let content1 = content.substring(matchStartIndex + startMatch[0].length - 1, i);
        let content2: string | undefined;
        
        // Skip whitespace and comma
        while (i < content.length && (content[i] === ' ' || content[i] === '\n' || content[i] === '\t' || content[i] === ',')) {
            i++;
        }
        
        // If we find another opening brace, it's the second parameter
        if (i < content.length && content[i] === '{') {
            braceCount = 1;
            const secondParamStart = i;
            i++;
            
            while (i < content.length && braceCount > 0) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                i++;
            }
            
            if (braceCount === 0) {
                content2 = content.substring(secondParamStart, i);
            }
        }
        
        // Skip to the closing parenthesis
        while (i < content.length && content[i] !== ')') {
            i++;
        }
        
        if (i < content.length) {
            i++; // Include the closing parenthesis
        }
        
        const fullMatch = content.substring(matchStartIndex, i);
        
        matches.push({
            fullMatch,
            variableName,
            content1,
            content2,
            index: matchStartIndex,
        });
        
        currentIndex = i;
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