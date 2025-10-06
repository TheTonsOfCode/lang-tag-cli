import { $LT_ReadFileContent } from '../io/file.ts';
import {LangTagCLIConflict, LangTagCLITagConflictInfo} from '../../config.ts';
import { parseObjectAST, markConflictNodes } from './ast-parser.ts';
import { colorizeFromAST } from './ast-colorizer.ts';
import * as path from 'path';

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
    const { tag } = tagInfo;

    try {
        const startLine = tag.line;
        const wholeTagCode = await getLangTagCodeSection(tagInfo);
        const translationTagCode = translationArgPosition === 1 ? tag.parameter1Text : tag.parameter2Text;
        const configTagCode = translationArgPosition === 1 ? tag.parameter2Text : tag.parameter1Text;

        const translationErrorPath = stripPrefix(conflictPath, tag.parameterConfig?.path);

        let colorizedWhole = wholeTagCode;

        // Step 1: Colorize translation code
        if (translationTagCode) {
            try {
                // Parse translation AST
                const translationNodes = parseObjectAST(translationTagCode);
                
                // Mark conflict nodes if there's a translation error path
                const markedTranslationNodes = translationErrorPath ? 
                    markConflictNodes(translationNodes, translationErrorPath) : 
                    translationNodes;
                
                // Colorize translation
                const colorizedTranslation = colorizeFromAST(translationTagCode, markedTranslationNodes);
                colorizedWhole = colorizedWhole.replace(translationTagCode, colorizedTranslation);
            } catch (error) {
                console.error('Failed to colorize translation:', error);
            }
        }

        // Step 2: Colorize config code
        if (configTagCode) {
            try {
                // Parse config AST
                const configNodes = parseObjectAST(configTagCode);
                
                // Find path key and mark its value as error
                let pathKeyFound = false;
                const markedConfigNodes = configNodes.map((node, index) => {
                    // Check if this is a 'path' key
                    if (node.type === 'key' && node.value === 'path') {
                        pathKeyFound = true;
                        return node; // Keep the key as is
                    }
                    
                    // If we found a path key and this is the next value node, mark it as error
                    if (pathKeyFound && node.type === 'value') {
                        // Check if the path value is a prefix of the conflict path
                        if (conflictPath.startsWith(node.value + '.')) {
                            pathKeyFound = false; // Reset for next path key
                            return { ...node, type: 'error' as const };
                        }
                    }
                    
                    return node;
                });
                
                // Colorize config
                const colorizedConfig = colorizeFromAST(configTagCode, markedConfigNodes);
                colorizedWhole = colorizedWhole.replace(configTagCode, colorizedConfig);
            } catch (error) {
                console.error('Failed to colorize config:', error);
            }
        }

        printLines(colorizedWhole.split('\n'), startLine);
    } catch (error) {
        console.error('Error displaying conflict:', error);
    }
}

export async function $LT_LogConflict(conflict: LangTagCLIConflict, translationArgPosition: number): Promise<void> {
    const { path: conflictPath, tagA, tagB } = conflict;
    
    const logTag = async (tagInfo: LangTagCLITagConflictInfo, prefix: string) => {
        console.log(`${ANSI.white}${prefix} file://${path.join(process.cwd(), tagInfo.relativeFilePath)}:${tagInfo.tag.line} ${ANSI.reset}`);
        await logTagConflictInfo(tagInfo, conflictPath, translationArgPosition);
    };
    
    await logTag(tagA, 'between');
    await logTag(tagB, 'and');
}
