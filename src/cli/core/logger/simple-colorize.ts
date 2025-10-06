import { parseObjectAST, markConflictNodes } from './ast-parser.ts';
import { colorizeFromAST } from './ast-colorizer.ts';

/**
 * Colorizes JavaScript object code and returns formatted lines
 */
export function colorizeCode(code: string, conflictPath?: string): string {
    // Step 1: Parse AST
    const nodes = parseObjectAST(code);
    
    // Step 2: Mark conflict nodes if conflictPath provided
    const finalNodes = conflictPath ? markConflictNodes(nodes, conflictPath) : nodes;
    
    // Step 3: Colorize based on AST
    return colorizeFromAST(code, finalNodes);
}

