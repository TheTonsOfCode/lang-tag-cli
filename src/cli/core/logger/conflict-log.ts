import { $LT_ReadFileContent } from '../io/file.ts';
import { LangTagCLIConflict } from '../../config.ts';

const ANSI_COLORS: Record<string, string> = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    bgRedWhiteText: '\x1b[41m\x1b[37m',
};

/**
 * Finds the line numbers in the tag's fullMatch that should be highlighted for a conflict
 * Returns an array of line numbers that contain either:
 * 1. The conflicting key definition
 * 2. The path option (when path_overwrite conflict with explicit path option)
 */
function findConflictLinesInTag(tag: any, conflictPath: string): number[] {
    const conflictLines: number[] = [];
    const pathSegments = conflictPath.split('.');
    const translations = tag.parameterTranslations;
    const fullMatchLines = tag.fullMatch.split('\n');
    
    // Find the conflicting key line
    let current = translations;
    let searchKey = pathSegments[pathSegments.length - 1]; // Get the last segment (the actual key)
    
    // Navigate through nested objects to find the target
    for (let i = 0; i < pathSegments.length - 1; i++) {
        if (current && typeof current === 'object' && pathSegments[i] in current) {
            current = current[pathSegments[i]];
        } else {
            break; // Path not found in this tag's translations
        }
    }
    
    // Check if the final key exists at this level and find its line
    if (current && typeof current === 'object' && searchKey in current) {
        const keyPattern = new RegExp(`^\\s*['"\`]?${searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]?\\s*:`, 'm');
        
        for (let i = 0; i < fullMatchLines.length; i++) {
            if (keyPattern.test(fullMatchLines[i])) {
                conflictLines.push(tag.line + i);
                break;
            }
        }
    }
    
    // Also check if there's an explicit path option being used
    // This handles cases where conflict occurs due to path_overwrite
    if (tag.path && pathSegments.length > 1) {
        const pathPrefix = pathSegments.slice(0, -1).join('.');
        if (tag.path === pathPrefix) {
            // Find the line with path: 'some.structured'
            const pathPattern = new RegExp(`\\bpath\\s*:\\s*['"\`]${pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`, 'm');
            
            for (let i = 0; i < fullMatchLines.length; i++) {
                if (pathPattern.test(fullMatchLines[i])) {
                    conflictLines.push(tag.line + i);
                    break;
                }
            }
        }
    }
    
    return conflictLines;
}

async function logTagConflictInfo(tagInfo: any, conflictPath: string): Promise<void> {
    const { tag, relativeFilePath, value } = tagInfo;

    console.log(`${ANSI_COLORS.white}at: ${ANSI_COLORS.cyan}${relativeFilePath}${ANSI_COLORS.reset}`);

    try {
        const fileContent = await $LT_ReadFileContent(relativeFilePath);

        const fileLines = fileContent.split('\n');
        const startLine = Math.max(0, tag.line - 1); // Convert to 0-based index
        const endLine = Math.min(fileLines.length - 1, tag.line + tag.fullMatch.split('\n').length - 2);

        // Find all lines that should be highlighted for this conflict
        const conflictLineNumbers = findConflictLinesInTag(tag, conflictPath);

        for (let i = startLine; i <= endLine; i++) {
            const lineNumber = i + 1; // Convert back to 1-based
            const line = fileLines[i];
            
            // Check if this is one of the conflict lines
            const isConflictLine = conflictLineNumbers.includes(lineNumber);
            
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

export async function $LT_LogConflict(conflict: LangTagCLIConflict): Promise<void> {
    const { path, tagA, tagB } = conflict;
    
    await logTagConflictInfo(tagA, path);
    await logTagConflictInfo(tagB, path);
}
