export interface $LT_Logger {
    info(message: string, params?: Record<string, any>): void;
    success(message: string, params?: Record<string, any>): void;
    warn(message: string, params?: Record<string, any>): void;
    error(message: string, params?: Record<string, any>): void;
    debug(message: string, params?: Record<string, any>): void;

    logTagConflictInfo(tagInfo: any): void;
}

const ANSI_COLORS: Record<string, string> = {
    reset: '\x1b[0m',
    white: '\x1b[37m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[37m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};

function validateAndInterpolate(message: string, params?: Record<string, any>) {
    const placeholders = Array.from(message.matchAll(/\{(\w+)\}/g)).map(m => m[1]);

    const missing = placeholders.filter(p => !(p in (params || {})));
    if (missing.length) {
        throw new Error(`Missing variables in message: ${missing.join(', ')}`);
    }

    const extra = params ? Object.keys(params).filter(k => !placeholders.includes(k)) : [];
    if (extra.length) {
        throw new Error(`Extra variables provided not used in message: ${extra.join(', ')}`);
    }

    const parts: { text: string; isVar: boolean }[] = [];
    let lastIndex = 0;
    for (const match of message.matchAll(/\{(\w+)\}/g)) {
        const [fullMatch, key] = match;
        const index = match.index!;
        if (index > lastIndex) {
            parts.push({ text: message.slice(lastIndex, index), isVar: false });
        }
        parts.push({ text: String(params![key]), isVar: true });
        lastIndex = index + fullMatch.length;
    }
    if (lastIndex < message.length) {
        parts.push({ text: message.slice(lastIndex), isVar: false });
    }

    return parts;
}

function log(baseColor: string, message: string, params?: Record<string, any>) {
    const parts = validateAndInterpolate(message, params);

    const coloredMessage = parts
        .map(p =>
            p.isVar
                ? `${ANSI_COLORS.bold}${ANSI_COLORS.white}${p.text}${ANSI_COLORS.reset}${baseColor}`
                : p.text
        )
        .join('');

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:` +
        `${now.getMinutes().toString().padStart(2, '0')}:` +
        `${now.getSeconds().toString().padStart(2, '0')}`;

    const prefix =
        // Static colored "LangTag" prefix
        //`${ANSI_COLORS.bold}${ANSI_COLORS.cyan}LangTag${ANSI_COLORS.reset} ` +
        // Time
        `${ANSI_COLORS.gray}[${time}]${ANSI_COLORS.reset} `;

    console.log(`${prefix}${baseColor}${coloredMessage}${ANSI_COLORS.reset}`);
}

export function $LT_CreateDefaultLogger(debugMode?: boolean): $LT_Logger {
    return {
        info: (msg, params) => log(ANSI_COLORS.blue, msg, params),
        success: (msg, params) => log(ANSI_COLORS.green, msg, params),
        warn: (msg, params) => log(ANSI_COLORS.yellow, msg, params),
        error: (msg, params) => log(ANSI_COLORS.red, msg || 'empty error message', params),
        debug: (msg, params) => {
            if (!debugMode) return;
            log(ANSI_COLORS.gray, msg, params);
        },
        logTagConflictInfo: (tagInfo) => {
            const { tag, relativeFilePath, value } = tagInfo;
            
            // Log file path
            log(ANSI_COLORS.cyan, `File: {file}`, { file: relativeFilePath });
            
            // Log line and column info
            log(ANSI_COLORS.gray, `Line {line}, Column {column}:`, { 
                line: tag.line, 
                column: tag.column 
            });
            
            // Log the full match with line numbers and tabs using console.log
            const lines = tag.fullMatch.split('\n');
            lines.forEach((line: string, index: number) => {
                const lineNumber = tag.line + index;
                console.log(`${ANSI_COLORS.white}${lineNumber}\t| ${line}${ANSI_COLORS.reset}`);
            });
            
            // Log the value
            log(ANSI_COLORS.yellow, `  Value: {value}`, { 
                value: JSON.stringify(value) 
            });
            
            // Empty line for separation
            console.log('');
        },
    };
}