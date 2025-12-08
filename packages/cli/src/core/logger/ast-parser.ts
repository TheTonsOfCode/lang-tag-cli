import * as acorn from 'acorn';

export type ASTNodeType =
    | 'key'
    | 'bracket'
    | 'colon'
    | 'value'
    | 'comment'
    | 'error';

export interface ASTNode {
    type: ASTNodeType;
    start: number;
    end: number;
    value: string;
    line: number;
    column: number;
    path?: string[]; // For keys - the full path to this key
}

/**
 * Parses JavaScript object code and returns AST nodes
 */
export function parseObjectAST(code: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    try {
        const ast = acorn.parse(`(${code})`, {
            ecmaVersion: 'latest',
            locations: true,
        });

        // Walk AST and collect nodes
        function walk(node: any, path: string[] = []) {
            if (node.type === 'Property' && node.key) {
                const keyName =
                    node.key.type === 'Identifier'
                        ? node.key.name
                        : node.key.type === 'Literal'
                          ? node.key.value
                          : null;

                if (keyName) {
                    const currentPath = [...path, keyName];

                    // Add key node
                    nodes.push({
                        type: 'key',
                        start: node.key.start - 1, // -1 for wrapper '('
                        end: node.key.end - 1,
                        value: keyName,
                        line: node.key.loc.start.line,
                        column: node.key.loc.start.column,
                        path: currentPath,
                    });

                    // Add value node if it's a literal
                    if (node.value && node.value.type === 'Literal') {
                        nodes.push({
                            type: 'value',
                            start: node.value.start - 1, // -1 for wrapper '('
                            end: node.value.end - 1,
                            value: node.value.value,
                            line: node.value.loc.start.line,
                            column: node.value.loc.start.column,
                        });
                    }

                    // Continue walking with updated path
                    if (node.value && node.value.type === 'ObjectExpression') {
                        walk(node.value, currentPath);
                        return;
                    }
                }
            }

            // Recursively walk all properties
            for (const key in node) {
                if (node[key] && typeof node[key] === 'object') {
                    if (Array.isArray(node[key])) {
                        node[key].forEach((child: any) => walk(child, path));
                    } else {
                        walk(node[key], path);
                    }
                }
            }
        }

        walk(ast);

        // Add brackets, colons, commas
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (/[{}[\](),:]/.test(char)) {
                // Check if this position is already covered by a key
                const isCovered = nodes.some((n) => i >= n.start && i < n.end);
                if (!isCovered) {
                    const nodeType = char === ':' ? 'colon' : 'bracket';
                    nodes.push({
                        type: nodeType,
                        start: i,
                        end: i + 1,
                        value: char,
                        line: 1, // Will be calculated properly
                        column: i + 1,
                    });
                }
            }
        }

        // Sort by position
        nodes.sort((a, b) => a.start - b.start);
    } catch (error) {
        // If parsing fails, mark as error
        nodes.push({
            type: 'error',
            start: 0,
            end: code.length,
            value: code,
            line: 1,
            column: 1,
        });
    }

    return nodes;
}

/**
 * Marks nodes as error based on conflict path
 */
export function markConflictNodes(
    nodes: ASTNode[],
    conflictPath: string
): ASTNode[] {
    const conflictKeys = conflictPath.split('.');

    return nodes.map((node) => {
        if (node.type === 'key' && node.path) {
            // Check if this key is part of the conflict path
            const isConflict =
                conflictKeys.length > 0 &&
                node.path.length <= conflictKeys.length &&
                node.path.every((key, idx) => key === conflictKeys[idx]);

            if (isConflict) {
                return { ...node, type: 'error' };
            }
        }
        return node;
    });
}
