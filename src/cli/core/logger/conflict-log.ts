import { $LT_ReadFileContent } from '../io/file.ts';
import { LangTagCLIConflict } from '../../config.ts';
import { colorizeCode } from './simple-colorize.ts';

const ANSI = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
};

async function logTagConflictInfo(tagInfo: any, conflictPath: string): Promise<void> {
    const { tag, relativeFilePath } = tagInfo;

    console.log(`${ANSI.white}at: ${ANSI.cyan}${relativeFilePath}${ANSI.reset}`);

    try {
        const fileContent = await $LT_ReadFileContent(relativeFilePath);
        const fileLines = fileContent.split('\n');
        const startLine = tag.line;
        const endLine = tag.line + tag.fullMatch.split('\n').length - 1;
        
        // Get the object text to colorize
        const objectText = tag.parameter1Text || tag.parameter2Text || '{}';
        
        // Find where the object starts in fullMatch
        const fullMatchLines = tag.fullMatch.split('\n');
        let objectStartLine = startLine;
        for (let i = 0; i < fullMatchLines.length; i++) {
            if (fullMatchLines[i].includes('{')) {
                objectStartLine = startLine + i;
                break;
            }
        }
        
        // Colorize the object
        const colorizedLines = colorizeCode(objectText, objectStartLine);
        
        // Print the full tag with colorized object
        for (let i = startLine - 1; i < endLine; i++) {
            const lineNumber = i + 1;
            const line = fileLines[i];
            
            // Check if this line is part of the object
            const objectLineIndex = lineNumber - objectStartLine;
            if (objectLineIndex >= 0 && objectLineIndex < colorizedLines.length) {
                // Use colorized version
                console.log(colorizedLines[objectLineIndex]);
            } else {
                // Use plain version with line number
                console.log(`${ANSI.cyan}${lineNumber}${ANSI.reset} | ${line}`);
            }
        }
    } catch (error) {
        console.error('Error displaying conflict:', error);
        // Fallback: just show plain lines
        const fileLines = (await $LT_ReadFileContent(relativeFilePath)).split('\n');
        const startLine = tag.line;
        const endLine = tag.line + tag.fullMatch.split('\n').length - 1;
        for (let i = startLine - 1; i < endLine; i++) {
            console.log(`${ANSI.cyan}${i + 1}${ANSI.reset} | ${fileLines[i]}`);
        }
    }
}

export async function $LT_LogConflict(conflict: LangTagCLIConflict): Promise<void> {
    const { path, tagA, tagB } = conflict;
    
    await logTagConflictInfo(tagA, path);
    await logTagConflictInfo(tagB, path);
}
