import { $LT_ReadFileContent } from '../io/file.ts';
import {LangTagCLIConflict, LangTagCLITagConflictInfo} from '../../type.ts';
import { parseObjectAST, markConflictNodes, ASTNode } from './ast-parser.ts';
import { colorizeFromAST } from './ast-colorizer.ts';
import * as path from 'path';

const ANSI = {
    reset: '\x1b[0m',
    white: '\x1b[97m',
    cyan: '\x1b[96m',
    gray: '\x1b[37m',
    darkGray: '\x1b[90m',
    bold: '\x1b[1m',
};

/**
 * Determines which lines should be visible based on error lines
 */
function getVisibleLines(totalLines: number, errorLines: Set<number>, threshold = 10): Set<number> | null {
    // If the code is short enough, show all lines
    if (totalLines <= threshold) {
        return null; // null means show all
    }

    const visible = new Set<number>();
    const contextLines = 2; // Lines before and after errors to show

    // Always show first 2 and last 2 lines
    visible.add(0);
    visible.add(1);
    visible.add(totalLines - 2);
    visible.add(totalLines - 1);

    // Add error lines and their context
    for (const errorLine of errorLines) {
        for (let i = Math.max(0, errorLine - contextLines); i <= Math.min(totalLines - 1, errorLine + contextLines); i++) {
            visible.add(i);
        }
    }

    return visible;
}

/**
 * Prints lines with line numbers, collapsing non-essential lines if needed
 */
function printLines(lines: string[], startLineNumber: number, errorLines: Set<number> = new Set(), condense: boolean = false): void {
    const visibleLines = condense ? getVisibleLines(lines.length, errorLines) : null;

    if (visibleLines === null) {
        // Show all lines
        lines.forEach((line, i) => {
            const lineNumber = startLineNumber + i;
            const lineNumStr = String(lineNumber).padStart(3, ' ');
            console.log(`${ANSI.gray}${lineNumStr}${ANSI.reset} ${ANSI.darkGray}│${ANSI.reset} ${line}`);
        });
    } else {
        // Show only visible lines with collapse indicators
        let lastPrinted = -2;
        lines.forEach((line, i) => {
            if (visibleLines.has(i)) {
                // Print collapse indicator if we skipped lines (but not before the first line)
                if (i > lastPrinted + 1 && lastPrinted >= 0) {
                    console.log(`${ANSI.gray}  -${ANSI.reset} ${ANSI.darkGray}│${ANSI.reset} ${ANSI.gray}...${ANSI.reset}`);
                }
                
                const lineNumber = startLineNumber + i;
                const lineNumStr = String(lineNumber).padStart(3, ' ');
                console.log(`${ANSI.gray}${lineNumStr}${ANSI.reset} ${ANSI.darkGray}│${ANSI.reset} ${line}`);
                lastPrinted = i;
            }
        });
    }
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

/**
 * Extracts line numbers that contain error nodes from AST
 */
function getErrorLineNumbers(code: string, nodes: ASTNode[]): Set<number> {
    const errorLines = new Set<number>();
    const lines = code.split('\n');
    
    // Find all error nodes
    const errorNodes = nodes.filter(n => n.type === 'error');
    
    for (const errorNode of errorNodes) {
        // Calculate which lines this error spans
        let currentPos = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const lineLength = lines[lineIndex].length;
            const lineEnd = currentPos + lineLength;
            
            // Check if this error node overlaps with this line
            if (errorNode.start < lineEnd && errorNode.end > currentPos) {
                errorLines.add(lineIndex);
            }
            
            currentPos = lineEnd + 1; // +1 for newline
        }
    }
    
    return errorLines;
}

async function logTagConflictInfo(tagInfo: LangTagCLITagConflictInfo, prefix: string, conflictPath: string, translationArgPosition: number, condense?: boolean): Promise<void> {
    const { tag } = tagInfo;

    const filePath = path.join(process.cwd(), tagInfo.relativeFilePath);
    let lineNum = tagInfo.tag.line;

    try {
        const startLine = tag.line;
        const wholeTagCode = await getLangTagCodeSection(tagInfo);
        const translationTagCode = translationArgPosition === 1 ? tag.parameter1Text : tag.parameter2Text;
        const configTagCode = translationArgPosition === 1 ? tag.parameter2Text : tag.parameter1Text;

        const translationErrorPath = stripPrefix(conflictPath, tag.parameterConfig?.path);

        let colorizedWhole = wholeTagCode;
        let errorLines = new Set<number>();

        // Step 1: Colorize translation code
        if (translationTagCode) {
            try {
                // Parse translation AST
                const translationNodes = parseObjectAST(translationTagCode);
                
                // Mark conflict nodes if there's a translation error path
                const markedTranslationNodes = translationErrorPath ? 
                    markConflictNodes(translationNodes, translationErrorPath) : 
                    translationNodes;
                
                // Extract error line numbers from the translation section
                const translationErrorLines = getErrorLineNumbers(translationTagCode, markedTranslationNodes);
                
                // Find the start line of translation section in whole code
                const translationStartInWhole = wholeTagCode.indexOf(translationTagCode);
                if (translationStartInWhole >= 0) {
                    const linesBeforeTranslation = wholeTagCode.substring(0, translationStartInWhole).split('\n').length - 1;
                    // Map translation error lines to whole code line numbers
                    translationErrorLines.forEach(lineNum => {
                        errorLines.add(linesBeforeTranslation + lineNum);
                    });
                    
                    // Update lineNum to the last error line in translations if there are any
                    if (translationErrorLines.size > 0) {
                        const lastTranslationErrorLine = Math.max(...Array.from(translationErrorLines));
                        lineNum = startLine + linesBeforeTranslation + lastTranslationErrorLine;
                    }
                }
                
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
                
                // Extract error line numbers from config section
                const configErrorLines = getErrorLineNumbers(configTagCode, markedConfigNodes);
                
                // Find the start line of config section in whole code
                const configStartInWhole = wholeTagCode.indexOf(configTagCode);
                if (configStartInWhole >= 0) {
                    const linesBeforeConfig = wholeTagCode.substring(0, configStartInWhole).split('\n').length - 1;
                    // Map config error lines to whole code line numbers
                    configErrorLines.forEach(lineNum => {
                        errorLines.add(linesBeforeConfig + lineNum);
                    });
                }
                
                // Colorize config
                const colorizedConfig = colorizeFromAST(configTagCode, markedConfigNodes);
                colorizedWhole = colorizedWhole.replace(configTagCode, colorizedConfig);
            } catch (error) {
                console.error('Failed to colorize config:', error);
            }
        }

        // Print file path with the updated line number (encode URI to handle special characters like [])
        const encodedPath = encodeURI(filePath);
        console.log(`${ANSI.gray}${prefix}${ANSI.reset} ${ANSI.cyan}file://${encodedPath}${ANSI.reset}${ANSI.gray}:${lineNum}${ANSI.reset}`);
        
        printLines(colorizedWhole.split('\n'), startLine, errorLines, condense);
    } catch (error) {
        console.error('Error displaying conflict:', error);
    }
}

export async function $LT_LogConflict(conflict: LangTagCLIConflict, translationArgPosition: number, condense?: boolean): Promise<void> {
    const { path: conflictPath, tagA, tagB } = conflict;

    await logTagConflictInfo(tagA, 'between', conflictPath, translationArgPosition, condense);
    await logTagConflictInfo(tagB, 'and', conflictPath, translationArgPosition, condense);
}
