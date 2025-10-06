import { ASTNode, ASTNodeType } from './ast-parser.ts';

const ANSI = {
    reset: '\x1b[0m',
    white: '\x1b[97m',
    brightCyan: '\x1b[96m',
    cyan: '\x1b[36m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    gray: '\x1b[90m',
    red: '\x1b[91m',
    redBg: '\x1b[41m\x1b[97m',
    bold: '\x1b[1m',
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
            return ANSI.brightCyan;
        case 'bracket':
        case 'colon':
            return ANSI.gray;
        case 'value':
            return ANSI.green;
        case 'comment':
            return ANSI.gray;
        case 'error':
            return ANSI.bold + ANSI.redBg;
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
