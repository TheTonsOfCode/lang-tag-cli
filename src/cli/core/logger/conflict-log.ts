import { $LT_ReadFileContent } from '../io/file.ts';
import {LangTagCLIConflict, LangTagCLITagConflictInfo} from '../../config.ts';
import { colorizeCode } from './simple-colorize.ts';

const ANSI = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
};

/**
 * Prints lines with line numbers
 */
function printLines(lines: string[], startLineNumber: number): void {
    lines.forEach((line, i) => {
        const lineNumber = startLineNumber + i;
        console.log(`${ANSI.cyan}${lineNumber}${ANSI.reset} | ${line}`);
    });
}

async function getLangTagCodeSection(tagInfo: LangTagCLITagConflictInfo) {
    const { tag, relativeFilePath } = tagInfo;

    const fileContent = await $LT_ReadFileContent(relativeFilePath);
    const fileLines = fileContent.split('\n');
    const startLine = tag.line;
    const endLine = tag.line + tag.fullMatch.split('\n').length - 1;

    // Get the full code to display (entire tag)
    return fileLines.slice(startLine - 1, endLine).join('\n');
}

function stripPrefix(str: string, prefix: string) {
    if (!prefix) return str;
    if (str.startsWith(prefix)) {
        if (!prefix.endsWith('.')) {
            prefix += '.';
        }
        return str.slice(prefix.length);
    }
    return str;
}

async function logTagConflictInfo(tagInfo: LangTagCLITagConflictInfo, conflictPath: string, translationArgPosition: number): Promise<void> {
    const { tag, relativeFilePath } = tagInfo;

    console.log(`${ANSI.white}at: ${ANSI.cyan}${relativeFilePath}${ANSI.reset}`);

    try {
        const startLine = tag.line;
        const wholeTagCode = await getLangTagCodeSection(tagInfo);
        const translationTagCode = translationArgPosition === 1 ? tag.parameter1Text : tag.parameter2Text;
        const configTagCode = translationArgPosition === 1 ? tag.parameter2Text : tag.parameter1Text;

        const translationErrorPath = stripPrefix(conflictPath, tag.parameterConfig.path);

        let colorizedWhole = wholeTagCode;

        // const colorized = colorizeCode(translationTagCode);
        // TODO: pokoloruj kod translacji i podmien go w wholeTagCode
        if (configTagCode) {
            // TODO: pokoloruj kod translacji i podmien go w wholeTagCode
        }

        printLines(colorizedWhole.split('\n'), startLine);
    } catch (error) {
        console.error('Error displaying conflict:', error);
    }
}

export async function $LT_LogConflict(conflict: LangTagCLIConflict, translationArgPosition: number): Promise<void> {
    const { path, tagA, tagB } = conflict;
    
    await logTagConflictInfo(tagA, path, translationArgPosition);
    await logTagConflictInfo(tagB, path, translationArgPosition);
}
