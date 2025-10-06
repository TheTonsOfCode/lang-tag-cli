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
export function colorizeCode(code: string): string {
    let colorized = code;
    
    try {
        // Try to parse with Acorn
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
            if (/[{}[\],:()]/g.test(code[i])) {
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
        for (const range of ranges) {
            const before = colorized.substring(0, range.start);
            const text = colorized.substring(range.start, range.end);
            const after = colorized.substring(range.end);
            colorized = before + range.color + text + ANSI.reset + after;
        }
    } catch {
        // // If Acorn fails, use simple character-by-character coloring
        // let result = '';
        // let i = 0;
        //
        // while (i < code.length) {
        //     // Check for key pattern (word followed by optional spaces and colon)
        //     const keyMatch = code.substring(i).match(/^(\w+)(\s*):/);
        //     if (keyMatch) {
        //         result += ANSI.cyan + keyMatch[1] + ANSI.reset + keyMatch[2] + ANSI.green + ':' + ANSI.reset;
        //         i += keyMatch[0].length;
        //         continue;
        //     }
        //
        //     // Check for special characters
        //     if (/[{}[\](),]/.test(code[i])) {
        //         result += ANSI.green + code[i] + ANSI.reset;
        //         i++;
        //         continue;
        //     }
        //
        //     // Regular character
        //     result += code[i];
        //     i++;
        // }
        //
        // colorized = result;
        colorized = code;
    }
    
    // Return colorized lines without line numbers
    return colorized;
}

