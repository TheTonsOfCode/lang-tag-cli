export interface SimpleASTNode {
    type: 'object' | 'property' | 'string' | 'number' | 'boolean' | 'null' | 'array';
    key?: string;
    value?: any;
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface SimpleASTResult {
    ast: SimpleASTNode;
    comments: Array<{ text: string; line: number; column: number; start: number; end: number }>;
}

/**
 * Simple JSON5 AST parser without TypeScript dependency
 * Parses JSON5-like object literals and returns AST with precise locations
 */
export function parseSimpleJSON5Object(sourceCode: string, startOffset: number = 0): SimpleASTResult | null {
    const lines = sourceCode.split('\n');
    const comments: Array<{ text: string; line: number; column: number; start: number; end: number }> = [];
    
    // Extract comments first
    extractComments(sourceCode, lines, comments, startOffset);
    
    // Parse the object
    const ast = parseObject(sourceCode, 0, lines, startOffset);
    
    return ast ? { ast, comments } : null;
}

function extractComments(sourceCode: string, lines: string[], comments: Array<{ text: string; line: number; column: number; start: number; end: number }>, startOffset: number) {
    let pos = 0;
    
    while (pos < sourceCode.length) {
        // Find single-line comments
        const singleLineMatch = sourceCode.substring(pos).match(/\/\/(.*?)(?:\n|$)/);
        if (singleLineMatch) {
            const matchPos = sourceCode.indexOf(singleLineMatch[0], pos);
            const lineCol = getLineAndColumn(sourceCode, matchPos, lines);
            comments.push({
                text: singleLineMatch[0],
                line: lineCol.line,
                column: lineCol.column,
                start: matchPos + startOffset,
                end: matchPos + singleLineMatch[0].length + startOffset
            });
            pos = matchPos + singleLineMatch[0].length;
            continue;
        }
        
        // Find multi-line comments
        const multiLineMatch = sourceCode.substring(pos).match(/\/\*[\s\S]*?\*\//);
        if (multiLineMatch) {
            const matchPos = sourceCode.indexOf(multiLineMatch[0], pos);
            const lineCol = getLineAndColumn(sourceCode, matchPos, lines);
            comments.push({
                text: multiLineMatch[0],
                line: lineCol.line,
                column: lineCol.column,
                start: matchPos + startOffset,
                end: matchPos + multiLineMatch[0].length + startOffset
            });
            pos = matchPos + multiLineMatch[0].length;
            continue;
        }
        
        break;
    }
}

function parseObject(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    // Skip whitespace and comments
    let pos = skipWhitespaceAndComments(sourceCode, startPos);
    
    if (sourceCode[pos] !== '{') {
        return null;
    }
    
    const openBracePos = pos;
    const openBraceLineCol = getLineAndColumn(sourceCode, pos, lines);
    
    pos++; // Skip opening brace
    const properties: SimpleASTNode[] = [];
    
    while (pos < sourceCode.length) {
        pos = skipWhitespaceAndComments(sourceCode, pos);
        
        if (sourceCode[pos] === '}') {
            pos++; // Skip closing brace
            break;
        }
        
        if (sourceCode[pos] === ',') {
            pos++; // Skip comma
            continue;
        }
        
        // Parse property
        const property = parseProperty(sourceCode, pos, lines, globalOffset);
        if (property) {
            properties.push(property);
            pos = property.end - globalOffset;
            
            // Skip comma after property if it exists
            pos = skipWhitespaceAndComments(sourceCode, pos);
            if (sourceCode[pos] === ',') {
                pos++;
            }
        } else {
            // If we can't parse a property, it might be the end of the object
            // Let's check if we're at a closing brace
            if (sourceCode[pos] === '}') {
                break;
            }
            // Otherwise, skip this character and continue
            pos++;
        }
    }
    
    const closeBracePos = pos - 1;
    const closeBraceLineCol = getLineAndColumn(sourceCode, closeBracePos, lines);
    
    // Skip whitespace and comma after the closing brace
    let finalPos = pos;
    finalPos = skipWhitespaceAndComments(sourceCode, finalPos);
    if (sourceCode[finalPos] === ',') {
        finalPos++;
    }
    
    return {
        type: 'object',
        start: openBracePos + globalOffset,
        end: finalPos + globalOffset,
        line: openBraceLineCol.line,
        column: openBraceLineCol.column,
        value: properties
    };
}

function parseProperty(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    let pos = skipWhitespaceAndComments(sourceCode, startPos);
    const keyStartPos = pos;
    
    // Parse key
    const key = parseKey(sourceCode, pos);
    if (!key) return null;
    
    pos = key.end - globalOffset;
    
    // Skip whitespace and colon
    pos = skipWhitespaceAndComments(sourceCode, pos);
    if (sourceCode[pos] !== ':') return null;
    pos++;
    pos = skipWhitespaceAndComments(sourceCode, pos);
    
    // Parse value
    const value = parseValue(sourceCode, pos, lines, globalOffset);
    if (!value) return null;
    
    const keyLineCol = getLineAndColumn(sourceCode, keyStartPos, lines);
    
    // Skip whitespace and comma after the value
    let finalPos = value.end - globalOffset;
    finalPos = skipWhitespaceAndComments(sourceCode, finalPos);
    if (sourceCode[finalPos] === ',') {
        finalPos++;
    }
    
    return {
        type: 'property',
        key: key.value,
        start: keyStartPos + globalOffset,
        end: finalPos + globalOffset,
        line: keyLineCol.line,
        column: keyLineCol.column,
        value: value
    };
}

function parseKey(sourceCode: string, startPos: number): { value: string; end: number } | null {
    let pos = startPos;
    
    // Handle quoted keys
    if (sourceCode[pos] === '"' || sourceCode[pos] === "'" || sourceCode[pos] === '`') {
        const quote = sourceCode[pos];
        pos++;
        let key = '';
        
        while (pos < sourceCode.length && sourceCode[pos] !== quote) {
            if (sourceCode[pos] === '\\') {
                pos++; // Skip escape character
                if (pos < sourceCode.length) {
                    key += sourceCode[pos];
                    pos++;
                }
            } else {
                key += sourceCode[pos];
                pos++;
            }
        }
        
        if (pos < sourceCode.length) {
            pos++; // Skip closing quote
        }
        
        return { value: key, end: pos };
    }
    
    // Handle unquoted keys (identifiers)
    let key = '';
    while (pos < sourceCode.length && /[a-zA-Z0-9_$]/.test(sourceCode[pos])) {
        key += sourceCode[pos];
        pos++;
    }
    
    return key ? { value: key, end: pos } : null;
}

function parseValue(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    let pos = skipWhitespaceAndComments(sourceCode, startPos);
    
    if (pos >= sourceCode.length) return null;
    
    const char = sourceCode[pos];
    
    // String values
    if (char === '"' || char === "'" || char === '`') {
        return parseString(sourceCode, pos, lines, globalOffset);
    }
    
    // Number values
    if (/[0-9-]/.test(char)) {
        return parseNumber(sourceCode, pos, lines, globalOffset);
    }
    
    // Boolean values
    if (sourceCode.substr(pos, 4) === 'true') {
        const lineCol = getLineAndColumn(sourceCode, pos, lines);
        return {
            type: 'boolean',
            start: pos + globalOffset,
            end: pos + 4 + globalOffset,
            line: lineCol.line,
            column: lineCol.column,
            value: true
        };
    }
    
    if (sourceCode.substr(pos, 5) === 'false') {
        const lineCol = getLineAndColumn(sourceCode, pos, lines);
        return {
            type: 'boolean',
            start: pos + globalOffset,
            end: pos + 5 + globalOffset,
            line: lineCol.line,
            column: lineCol.column,
            value: false
        };
    }
    
    // Null values
    if (sourceCode.substr(pos, 4) === 'null') {
        const lineCol = getLineAndColumn(sourceCode, pos, lines);
        return {
            type: 'null',
            start: pos + globalOffset,
            end: pos + 4 + globalOffset,
            line: lineCol.line,
            column: lineCol.column,
            value: null
        };
    }
    
    // Object values
    if (char === '{') {
        return parseObject(sourceCode, pos, lines, globalOffset);
    }
    
    // Array values
    if (char === '[') {
        return parseArray(sourceCode, pos, lines, globalOffset);
    }
    
    return null;
}

function parseString(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    const quote = sourceCode[startPos];
    let pos = startPos + 1;
    let value = '';
    
    while (pos < sourceCode.length && sourceCode[pos] !== quote) {
        if (sourceCode[pos] === '\\') {
            pos++; // Skip escape character
            if (pos < sourceCode.length) {
                value += sourceCode[pos];
                pos++;
            }
        } else {
            value += sourceCode[pos];
            pos++;
        }
    }
    
    if (pos < sourceCode.length) {
        pos++; // Skip closing quote
    }
    
    const lineCol = getLineAndColumn(sourceCode, startPos, lines);
    
    return {
        type: 'string',
        start: startPos + globalOffset,
        end: pos + globalOffset,
        line: lineCol.line,
        column: lineCol.column,
        value: value
    };
}

function parseNumber(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    let pos = startPos;
    let value = '';
    
    // Handle negative numbers
    if (sourceCode[pos] === '-') {
        value += sourceCode[pos];
        pos++;
    }
    
    // Parse digits
    while (pos < sourceCode.length && /[0-9]/.test(sourceCode[pos])) {
        value += sourceCode[pos];
        pos++;
    }
    
    // Handle decimal point
    if (sourceCode[pos] === '.') {
        value += sourceCode[pos];
        pos++;
        
        while (pos < sourceCode.length && /[0-9]/.test(sourceCode[pos])) {
            value += sourceCode[pos];
            pos++;
        }
    }
    
    // Handle scientific notation
    if (pos < sourceCode.length && /[eE]/.test(sourceCode[pos])) {
        value += sourceCode[pos];
        pos++;
        
        if (pos < sourceCode.length && /[+-]/.test(sourceCode[pos])) {
            value += sourceCode[pos];
            pos++;
        }
        
        while (pos < sourceCode.length && /[0-9]/.test(sourceCode[pos])) {
            value += sourceCode[pos];
            pos++;
        }
    }
    
    const lineCol = getLineAndColumn(sourceCode, startPos, lines);
    
    return {
        type: 'number',
        start: startPos + globalOffset,
        end: pos + globalOffset,
        line: lineCol.line,
        column: lineCol.column,
        value: parseFloat(value)
    };
}

function parseArray(sourceCode: string, startPos: number, lines: string[], globalOffset: number): SimpleASTNode | null {
    let pos = startPos + 1; // Skip opening bracket
    const elements: SimpleASTNode[] = [];
    
    while (pos < sourceCode.length) {
        pos = skipWhitespaceAndComments(sourceCode, pos);
        
        if (sourceCode[pos] === ']') {
            pos++; // Skip closing bracket
            break;
        }
        
        if (sourceCode[pos] === ',') {
            pos++; // Skip comma
            continue;
        }
        
        // Parse element
        const element = parseValue(sourceCode, pos, lines, globalOffset);
        if (element) {
            elements.push(element);
            pos = element.end - globalOffset;
        } else {
            break;
        }
        
        // Skip comma after element
        pos = skipWhitespaceAndComments(sourceCode, pos);
        if (sourceCode[pos] === ',') {
            pos++;
        }
    }
    
    const lineCol = getLineAndColumn(sourceCode, startPos, lines);
    
    return {
        type: 'array',
        start: startPos + globalOffset,
        end: pos + globalOffset,
        line: lineCol.line,
        column: lineCol.column,
        value: elements
    };
}

function skipWhitespace(sourceCode: string, pos: number): number {
    while (pos < sourceCode.length && /[\s\n\r\t]/.test(sourceCode[pos])) {
        pos++;
    }
    return pos;
}

function skipWhitespaceAndComments(sourceCode: string, pos: number): number {
    while (pos < sourceCode.length) {
        const originalPos = pos;
        
        // Skip whitespace
        while (pos < sourceCode.length && /[\s\n\r\t]/.test(sourceCode[pos])) {
            pos++;
        }
        
        // Skip single-line comments
        if (pos < sourceCode.length && sourceCode.substr(pos, 2) === '//') {
            while (pos < sourceCode.length && sourceCode[pos] !== '\n') {
                pos++;
            }
            continue;
        }
        
        // Skip multi-line comments
        if (pos < sourceCode.length && sourceCode.substr(pos, 2) === '/*') {
            const commentEnd = sourceCode.indexOf('*/', pos);
            if (commentEnd !== -1) {
                pos = commentEnd + 2;
                continue;
            }
        }
        
        // If we didn't advance, break
        if (pos === originalPos) {
            break;
        }
    }
    return pos;
}

function getLineAndColumn(sourceCode: string, pos: number, lines: string[]): { line: number; column: number } {
    let currentPos = 0;
    let line = 1;
    let column = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        
        if (currentPos + lineLength > pos) {
            column = pos - currentPos + 1;
            break;
        }
        
        currentPos += lineLength;
        line++;
        column = 1;
    }
    
    return { line, column };
}

/**
 * Finds a specific key path in the AST
 */
export function findKeyInSimpleAST(ast: SimpleASTNode, keyPath: string[]): SimpleASTNode | null {
    if (!ast || ast.type !== 'object') {
        return null;
    }

    let current: SimpleASTNode | null = ast;
    
    for (let i = 0; i < keyPath.length; i++) {
        const keySegment = keyPath[i];
        
        if (!current || current.type !== 'object') {
            return null;
        }
        
        const properties = current.value as SimpleASTNode[];
        const foundProp = properties.find(prop => prop.key === keySegment);
        
        if (!foundProp) {
            return null;
        }
        
        // If this is the last segment, return the property node itself
        // Otherwise, continue with its value
        if (i === keyPath.length - 1) {
            return foundProp;
        } else {
            current = foundProp.value as SimpleASTNode;
        }
    }
    
    return current;
}

// Test function
if (import.meta.url === `file://${process.argv[1]}`) {
    const testCode = `
	{
	some: {
	    /*
	    Multiline
	    comment
	    */
		structured: {
			foo: 'Foo',
			"bar": 'Bar',
			'fii': 123,
		}
	},
	//test
	abc: 'XD2',
}`;

    console.log('Testing Simple JSON5 AST Parser...');
    console.log('Input:', testCode.trim());
    console.log('=' .repeat(50));
    
    const result = parseSimpleJSON5Object(testCode);
    
    if (result) {
        console.log('\n✅ AST Parsed Successfully!\n');
        console.log('AST:', JSON.stringify(result.ast, null, 2));
        console.log('\nComments:', result.comments);
        
        // Test key lookups
        console.log('\n' + '='.repeat(50));
        console.log('Testing key lookups...\n');
        
        const found = findKeyInSimpleAST(result.ast, ['some', 'structured', 'foo']);
        if (found) {
            console.log('✅ Found key "some.structured.foo":', {
                line: found.line,
                column: found.column,
                start: found.start,
                end: found.end,
                value: found.value
            });
        } else {
            console.log('❌ Key "some.structured.foo" not found');
        }
        
        const barFound = findKeyInSimpleAST(result.ast, ['some', 'structured', 'bar']);
        if (barFound) {
            console.log('\n✅ Found key "some.structured.bar":', {
                line: barFound.line,
                column: barFound.column,
                start: barFound.start,
                end: barFound.end,
                value: barFound.value
            });
        } else {
            console.log('\n❌ Key "some.structured.bar" not found');
        }
        
        const abcFound = findKeyInSimpleAST(result.ast, ['abc']);
        if (abcFound) {
            console.log('\n✅ Found key "abc":', {
                line: abcFound.line,
                column: abcFound.column,
                start: abcFound.start,
                end: abcFound.end,
                value: abcFound.value
            });
        } else {
            console.log('\n❌ Key "abc" not found');
        }
    } else {
        console.log('❌ Failed to parse!');
    }
}
