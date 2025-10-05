import { $LT_ReadFileContent } from './io/file.ts';
import { $LT_Conflict } from '../config.ts';

const ANSI_COLORS: Record<string, string> = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    bgRedWhiteText: '\x1b[41m\x1b[37m',
};

/**
 * Finds the line number in the tag's fullMatch that contains the conflicting path
 * by traversing the parsed translation object structure
 */
function findConflictLineInTag(tag: any, conflictPath: string): number | null {
    const pathSegments = conflictPath.split('.');
    const translations = tag.parameterTranslations;
    
    // Parse the fullMatch to find line offsets
    const fullMatchLines = tag.fullMatch.split('\n');
    
    // Try to find the path in the translations structure
    let current = translations;
    let searchKey = pathSegments[pathSegments.length - 1]; // Get the last segment (the actual key)
    
    // Navigate through nested objects to find the target
    for (let i = 0; i < pathSegments.length - 1; i++) {
        if (current && typeof current === 'object' && pathSegments[i] in current) {
            current = current[pathSegments[i]];
        } else {
            return null; // Path not found in this tag
        }
    }
    
    // Check if the final key exists at this level
    if (!current || typeof current !== 'object' || !(searchKey in current)) {
        return null;
    }
    
    // Now search for the key in the fullMatch text
    // We need to find which line contains this key definition
    const keyPattern = new RegExp(`^\\s*['"\`]?${searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]?\\s*:`, 'm');
    
    for (let i = 0; i < fullMatchLines.length; i++) {
        if (keyPattern.test(fullMatchLines[i])) {
            return tag.line + i; // Return absolute line number
        }
    }
    
    return null;
}

async function logTagConflictInfo(tagInfo: any, conflictPath: string): Promise<void> {
    const { tag, relativeFilePath, value } = tagInfo;

    console.log(`${ANSI_COLORS.white}at: ${ANSI_COLORS.cyan}${relativeFilePath}${ANSI_COLORS.reset}`);

    try {
        const fileContent = await $LT_ReadFileContent(relativeFilePath);

        const fileLines = fileContent.split('\n');
        const startLine = Math.max(0, tag.line - 1); // Convert to 0-based index
        const endLine = Math.min(fileLines.length - 1, tag.line + tag.fullMatch.split('\n').length - 2);

        // Find the exact line with the conflict
        const conflictLineNumber = findConflictLineInTag(tag, conflictPath);

        for (let i = startLine; i <= endLine; i++) {
            const lineNumber = i + 1; // Convert back to 1-based
            const line = fileLines[i];
            
            // Check if this is the line with the conflict
            const isConflictLine = conflictLineNumber !== null && lineNumber === conflictLineNumber;
            
            if (isConflictLine) {
                console.log(`${ANSI_COLORS.cyan}${lineNumber}${ANSI_COLORS.reset} | ${ANSI_COLORS.bgRedWhiteText}${line}${ANSI_COLORS.reset}`);
            } else {
                console.log(`${ANSI_COLORS.cyan}${lineNumber}${ANSI_COLORS.reset} | ${ANSI_COLORS.white}${line}${ANSI_COLORS.reset}`);
            }
        }
    } catch (error) {
        throw error;
    }
}

export async function $LT_LogConflict(conflict: $LT_Conflict): Promise<void> {
    const { path, tagA, tagB } = conflict;
    
    await logTagConflictInfo(tagA, path);
    await logTagConflictInfo(tagB, path);
}
