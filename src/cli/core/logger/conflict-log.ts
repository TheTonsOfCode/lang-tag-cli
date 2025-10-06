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
        
        // Get the full code to display (entire tag)
        const codeToDisplay = fileLines.slice(startLine - 1, endLine).join('\n');
        
        // Try to colorize - if it fails, show plain
        try {
            const colorizedLines = colorizeCode(codeToDisplay, startLine);
            colorizedLines.forEach(line => console.log(line));
        } catch {
            // Fallback: show plain lines
            for (let i = startLine - 1; i < endLine; i++) {
                console.log(`${ANSI.cyan}${i + 1}${ANSI.reset} | ${fileLines[i]}`);
            }
        }
    } catch (error) {
        console.error('Error displaying conflict:', error);
    }
}

export async function $LT_LogConflict(conflict: LangTagCLIConflict): Promise<void> {
    const { path, tagA, tagB } = conflict;
    
    await logTagConflictInfo(tagA, path);
    await logTagConflictInfo(tagB, path);
}
