import * as acorn from 'acorn';

const ANSI = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[41m\x1b[37m',
    yellow: '\x1b[33m',
};

/**
 * Colorizes JavaScript object code and returns formatted lines
 */
export function colorizeCode(code: string, startLineNumber: number = 1): string[] {
    // Parse with Acorn
    const ast = acorn.parse(`(${code})`, { 
        ecmaVersion: 'latest', 
        locations: true 
    });
    
    // Collect ranges to colorize
    const ranges: Array<{start: number, end: number, color: string, priority: number}> = [];
    
    // Walk AST and collect keys to highlight
    function walk(node: any) {
        if (node.type === 'Property' && node.key) {
            // Highlight property keys
            ranges.push({
                start: node.key.start - 1, // -1 for wrapper '('
                end: node.key.end - 1,
                color: ANSI.cyan,
                priority: 1 // Higher priority
            });
        }
        
        // Recursively walk all properties
        for (const key in node) {
            if (node[key] && typeof node[key] === 'object') {
                if (Array.isArray(node[key])) {
                    node[key].forEach((child: any) => walk(child));
                } else {
                    walk(node[key]);
                }
            }
        }
    }
    
    walk(ast);
    
    // Find brackets/colons/commas
    for (let i = 0; i < code.length; i++) {
        if (/[{}[\],:]/g.test(code[i])) {
            // Only add if not already covered by a key range
            const overlaps = ranges.some(r => i >= r.start && i < r.end);
            if (!overlaps) {
                ranges.push({
                    start: i,
                    end: i + 1,
                    color: ANSI.green,
                    priority: 0 // Lower priority
                });
            }
        }
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
    
    // Split into lines and add line numbers
    const lines = colorized.split('\n');
    return lines.map((line, i) => 
        `${ANSI.cyan}${startLineNumber + i}${ANSI.reset} | ${line}`
    );
}

