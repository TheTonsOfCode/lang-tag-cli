import { $LT_ReadFileContent } from '../io/file.ts';
import { LangTagCLIConflict } from '../../config.ts';
import { parseSimpleJSON5Object, findKeyInSimpleAST, SimpleASTNode } from './simple-json5-ast-parser.ts';

const ANSI_COLORS: Record<string, string> = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    bgRedWhiteText: '\x1b[41m\x1b[37m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
};

/**
 * Highlights specific characters in a line with color
 */
function highlightInLine(line: string, startCol: number, endCol: number, color: string): string {
    if (startCol < 0 || endCol <= startCol || startCol >= line.length) {
        return line;
    }
    
    const before = line.substring(0, startCol);
    const highlight = line.substring(startCol, Math.min(endCol, line.length));
    const after = line.substring(Math.min(endCol, line.length));
    
    return `${before}${color}${highlight}${ANSI_COLORS.reset}${after}`;
}

async function logTagConflictInfo(tagInfo: any, conflictPath: string): Promise<void> {
    const { tag, relativeFilePath, value } = tagInfo;

    console.log(`${ANSI_COLORS.white}at: ${ANSI_COLORS.cyan}${relativeFilePath}${ANSI_COLORS.reset}`);

    try {
        const fileContent = await $LT_ReadFileContent(relativeFilePath);
        const fileLines = fileContent.split('\n');
        const startLine = Math.max(0, tag.line - 1); // Convert to 0-based index
        const endLine = Math.min(fileLines.length - 1, tag.line + tag.fullMatch.split('\n').length - 2);
        

        // Parse the object using AST parser
        const astResult = parseSimpleJSON5Object(tag.parameter1Text || tag.parameter2Text || '{}', tag.index);
        
        // Find the conflicting key in AST
        const pathSegments = conflictPath.split('.');
        let conflictingKeyNode = astResult ? findKeyInSimpleAST(astResult.ast, pathSegments) : null;
        
        // For path_overwrite conflicts, if we can't find the full path, try to find the key at root level
        if (!conflictingKeyNode && tag.path && pathSegments.length > 1) {
            const rootKey = pathSegments[pathSegments.length - 1]; // Get last segment (the actual key)
            conflictingKeyNode = astResult ? findKeyInSimpleAST(astResult.ast, [rootKey]) : null;
        }
        
        
        // Find path option node if it exists (for path_overwrite conflicts)
        let pathOptionNode: SimpleASTNode | null = null;
        if (tag.path && pathSegments.length > 1) {
            const pathPrefix = pathSegments.slice(0, -1).join('.');
            if (tag.path === pathPrefix) {
                // Look for path option in the tag's config parameter
                const configText = tag.parameterConfig ? 
                    (typeof tag.parameterConfig === 'string' ? tag.parameterConfig : JSON.stringify(tag.parameterConfig)) :
                    '';
                if (configText) {
                    const configAst = parseSimpleJSON5Object(configText, tag.index);
                    if (configAst) {
                        pathOptionNode = findKeyInSimpleAST(configAst.ast, ['path']);
                    }
                }
            }
        }

        // Render each line with proper highlighting
        for (let i = startLine; i <= endLine; i++) {
            const lineNumber = i + 1; // Convert back to 1-based
            let line = fileLines[i];
            
            // Highlight conflicting key if it's on this line
            // Map AST line to file line: AST line 1 = tag.line + 1 (since tag.line is where the tag starts)
            const astLineInFile = tag.line + conflictingKeyNode.line - 1;
            if (conflictingKeyNode && astLineInFile === lineNumber) {
                const keyStartCol = conflictingKeyNode.column - 1; // Convert to 0-based
                const keyEndCol = keyStartCol + (conflictingKeyNode.key?.length || 0);
                
                // Highlight the key name in red
                line = highlightInLine(line, keyStartCol, keyEndCol, ANSI_COLORS.bgRedWhiteText);
            }
            
            // Highlight path option if it's on this line
            if (pathOptionNode) {
                const pathAstLineInFile = tag.line + pathOptionNode.line - 1;
                if (pathAstLineInFile === lineNumber) {
                // Find "path:" in the line
                const pathMatch = line.match(/\bpath\s*:/);
                if (pathMatch) {
                    const pathStartCol = pathMatch.index || 0;
                    const pathEndCol = pathStartCol + pathMatch[0].length;
                    
                    // Highlight "path:" in yellow
                    line = highlightInLine(line, pathStartCol, pathEndCol, ANSI_COLORS.yellow);
                    
                    // Also highlight the path value
                    const restOfLine = line.substring(pathEndCol);
                    const pathValueMatch = restOfLine.match(/['"`][^'"`]*['"`]/);
                    if (pathValueMatch) {
                        const valueStartCol = pathEndCol + (pathValueMatch.index || 0);
                        const valueEndCol = valueStartCol + pathValueMatch[0].length;
                        
                    // Highlight path value in yellow
                    line = highlightInLine(line, valueStartCol, valueEndCol, ANSI_COLORS.yellow);
                }
                }
            }
            }
            
            // Highlight brackets and structure in green
            line = line.replace(/([{}[\]])/g, `${ANSI_COLORS.green}$1${ANSI_COLORS.reset}`);
            
            console.log(`${ANSI_COLORS.cyan}${lineNumber}${ANSI_COLORS.reset} | ${ANSI_COLORS.white}${line}${ANSI_COLORS.reset}`);
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
