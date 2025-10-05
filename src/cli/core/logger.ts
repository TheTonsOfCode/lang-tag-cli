import { $LT_ReadFileContent } from './io/file.ts';
import { $LT_Conflict } from '../config.ts';

export interface $LT_Logger {
    info(message: string, params?: Record<string, any>): void;
    success(message: string, params?: Record<string, any>): void;
    warn(message: string, params?: Record<string, any>): void;
    error(message: string, params?: Record<string, any>): void;
    debug(message: string, params?: Record<string, any>): void;

    conflict(conflict: $LT_Conflict): Promise<void>;
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

async function logTagConflictInfo(tagInfo: any): Promise<void> {
    const { tag, relativeFilePath, value } = tagInfo;

    console.log(`${ANSI_COLORS.white}at: ${ANSI_COLORS.cyan}${relativeFilePath}${ANSI_COLORS.reset}`);

    try {
        const fileContent = await $LT_ReadFileContent(relativeFilePath);

        const fileLines = fileContent.split('\n');
        const startLine = Math.max(0, tag.line - 1); // Convert to 0-based index
        const endLine = Math.min(fileLines.length - 1, tag.line + tag.fullMatch.split('\n').length - 2);

        for (let i = startLine; i <= endLine; i++) {
            const lineNumber = i + 1; // Convert back to 1-based
            const line = fileLines[i];
            console.log(`${ANSI_COLORS.cyan}${lineNumber}${ANSI_COLORS.reset} | ${ANSI_COLORS.white}${line}${ANSI_COLORS.reset}`);
        }
    } catch (error) {
        throw error;
    }

    // log(ANSI_COLORS.yellow, `  Value: {value}`, {
    //     value: JSON.stringify(value)
    // });
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
        conflict: async (conflict) => {
            const { path, tagA, tagB, conflictType } = conflict;
            
            log(ANSI_COLORS.yellow, `Conflict detected: {conflictType} at "{path}"`, { 
                conflictType, 
                path 
            });
            
            await logTagConflictInfo(tagA);
            await logTagConflictInfo(tagB);
        },
    };
}