import {LangTagConfig} from "@/cli/config.ts";
import JSON5 from "json5";

type Validity = 'ok' | 'invalid-param-1' | 'invalid-param-2' | 'translations-not-found';

export interface $LT_Tag {
    fullMatch: string;

    parameter1Text: string;
    parameter2Text?: string;
    parameterTranslations: any;
    parameterConfig?: any;

    variableName?: string;

    /** Character index in the whole text where the match starts */
    index: number;
    /** Line number (1-based) where the match was found */
    line: number;
    /** Column number (1-based) where the match starts in the line */
    column: number;

    validity: Validity;
}

export interface $LT_TagReplaceData {
    tag: $LT_Tag;

    newConfig: any;
}

export class $LT_TagProcessor {

    constructor(private config: LangTagConfig) {}

    public extractTags(fileContent: string): $LT_Tag[] {
        const tagName = this.config.tagName;
        const optionalVariableAssignment = `(?:\\s*(\\w+)\\s*=\\s*)?`;

        // Find all potential lang tag matches
        const matches: $LT_Tag[] = [];
        let currentIndex = 0;

        // Create a regex to find the start of a lang tag
        const startPattern = new RegExp(`${optionalVariableAssignment}${tagName}\\(\\s*\\{`, 'g');

        while (true) {
            // Find the next potential match
            startPattern.lastIndex = currentIndex;
            const startMatch = startPattern.exec(fileContent);

            if (!startMatch) break;

            const matchStartIndex = startMatch.index;
            const variableName = startMatch[1] || undefined;

            // Find the matching closing brace for the first object
            let braceCount = 1;
            let i = matchStartIndex + startMatch[0].length;

            while (i < fileContent.length && braceCount > 0) {
                if (fileContent[i] === '{') braceCount++;
                if (fileContent[i] === '}') braceCount--;
                i++;
            }

            if (braceCount !== 0) {
                // No matching closing brace found, skip this match
                currentIndex = matchStartIndex + 1;
                continue;
            }

            // Check if there's a second parameter
            let parameter1Text = fileContent.substring(matchStartIndex + startMatch[0].length - 1, i);
            let parameter2Text: string | undefined;

            // Skip whitespace and comma
            while (i < fileContent.length && (fileContent[i] === ' ' || fileContent[i] === '\n' || fileContent[i] === '\t' || fileContent[i] === ',')) {
                i++;
            }

            // If we find another opening brace, it's the second parameter
            if (i < fileContent.length && fileContent[i] === '{') {
                braceCount = 1;
                const secondParamStart = i;
                i++;

                while (i < fileContent.length && braceCount > 0) {
                    if (fileContent[i] === '{') braceCount++;
                    if (fileContent[i] === '}') braceCount--;
                    i++;
                }

                if (braceCount === 0) {
                    parameter2Text = fileContent.substring(secondParamStart, i);
                }
            }

            // Skip to the closing parenthesis
            while (i < fileContent.length && fileContent[i] !== ')') {
                i++;
            }

            if (i < fileContent.length) {
                i++; // Include the closing parenthesis
            }

            const fullMatch = fileContent.substring(matchStartIndex, i);

            const {line, column} = getLineAndColumn(fileContent, matchStartIndex)

            let validity: Validity = 'ok';

            let parameter1 = undefined;
            let parameter2 = undefined;

            try {
                parameter1 = JSON5.parse(parameter1Text);
                if (parameter2Text) {
                    try {
                        parameter2 = JSON5.parse(parameter2Text);
                    } catch (error) {
                        validity = 'invalid-param-2';
                    }
                }
            } catch (error) {
                validity = 'invalid-param-1';
            }

            let parameterTranslations = this.config.translationArgPosition === 1 ? parameter1 : parameter2;
            let parameterConfig = this.config.translationArgPosition === 1 ? parameter2 : parameter1;

            if (validity === 'ok') {
                if (!parameterTranslations) validity = 'translations-not-found';
            }

            matches.push({
                fullMatch,
                variableName,
                parameter1Text,
                parameter2Text,
                parameterTranslations,
                parameterConfig,
                index: matchStartIndex,
                line,
                column,
                validity,
            });

            currentIndex = i;
        }

        return matches;
    }

    public replaceTags(fileContent: string, replacements: $LT_TagReplaceData[]): string {

        const replaceMap: Map<$LT_Tag, string> = new Map();

        replacements.forEach(({tag, newConfig}) => {

            const newConfigString = JSON5.stringify(JSON5.parse(newConfig), undefined, 4);
            const tagTranslationsContent = this.config.translationArgPosition === 1 ? tag.parameter1Text : tag.parameter2Text;

            const arg1 = this.config.translationArgPosition === 1  ? tagTranslationsContent : newConfigString;
            const arg2 = this.config.translationArgPosition === 1  ? newConfigString : tagTranslationsContent;

            const tagFunction = `${this.config.tagName}(${arg1}, ${arg2})`;
            if (tag.variableName) return ` ${tag.variableName} = ${tagFunction}`;

            replaceMap.set(tag, tagFunction);
        })

        let offset = 0;

        replaceMap.forEach((replacement, match) => {
            const startIdx = match.index + offset;
            const endIdx = startIdx + match.fullMatch.length;

            fileContent = fileContent.slice(0, startIdx) + replacement + fileContent.slice(endIdx);

            offset += replacement.length - match.fullMatch.length;
        });

        return fileContent;
    }
}

function getLineAndColumn(text: string, matchIndex: number): { line: number; column: number } {
    const lines = text.slice(0, matchIndex).split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
}
