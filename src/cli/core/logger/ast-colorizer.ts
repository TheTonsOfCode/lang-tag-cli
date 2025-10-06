import { ASTNode, ASTNodeType } from './ast-parser.ts';

const ANSI = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[41m\x1b[37m',
    yellow: '\x1b[33m',
};

/**
 * Colorizes code based on AST nodes
 */
export function colorizeFromAST(code: string, nodes: ASTNode[]): string {
    // Create ranges to colorize
    const ranges: Array<{start: number, end: number, color: string, priority: number}> = [];
    
    for (const node of nodes) {
        const color = getColorForNodeType(node.type);
        const priority = getPriorityForNodeType(node.type);
        
        ranges.push({
            start: node.start,
            end: node.end,
            color,
            priority
        });
    }
    
    // Sort by position (reverse) and priority
    ranges.sort((a, b) => {
        if (b.start !== a.start) return b.start - a.start;
        return b.priority - a.priority;
    });
    
    // Apply colors in reverse order to preserve positions
    let colorized = code;
    for (const range of ranges) {
        const before = colorized.substring(0, range.start);
        const text = colorized.substring(range.start, range.end);
        const after = colorized.substring(range.end);
        colorized = before + range.color + text + ANSI.reset + after;
    }
    
    return colorized;
}

function getColorForNodeType(type: ASTNodeType): string {
    switch (type) {
        case 'key':
            return ANSI.cyan;
        case 'bracket':
        case 'colon':
            return ANSI.green;
        case 'value':
            return ANSI.white;
        case 'comment':
            return ANSI.yellow;
        case 'error':
            return ANSI.red;
        default:
            return ANSI.white;
    }
}

function getPriorityForNodeType(type: ASTNodeType): number {
    switch (type) {
        case 'error':
            return 3; // Highest priority
        case 'key':
            return 2;
        case 'value':
            return 1;
        case 'bracket':
        case 'colon':
        case 'comment':
            return 0; // Lowest priority
        default:
            return 0;
    }
}
