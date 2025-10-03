// Somehow "chalk" does not work


const ANSI_CODES: Record<string, string> = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgBlue: '\x1b[44m',
    bgYellow: '\x1b[43m',
    black: '\x1b[30m',
    white: '\x1b[37m'
};

function colorize(text: string, colorCode: string): string {
    return `${colorCode}${text}${ANSI_CODES.reset}`;
}

type MiniChalk = {
    red: (text: string) => string;
    green: (text: string) => string;
    blue: (text: string) => string;
    yellow: (text: string) => string;
    cyan: (text: string) => string;
    bgRedWhite: (text: string) => string;
    bgGreenBlack: (text: string) => string;
    bgBlueWhite: (text: string) => string;
    bgYellowBlack: (text: string) => string;
};

export const miniChalk: MiniChalk = {
    red: (text) => colorize(text, ANSI_CODES.red),
    green: (text) => colorize(text, ANSI_CODES.green),
    blue: (text) => colorize(text, ANSI_CODES.blue),
    yellow: (text) => colorize(text, ANSI_CODES.yellow),
    cyan: (text) => colorize(text, ANSI_CODES.cyan),
    bgRedWhite: (text) => colorize(text, `${ANSI_CODES.bgRed}${ANSI_CODES.white}`),
    bgGreenBlack: (text) => colorize(text, `${ANSI_CODES.bgGreen}${ANSI_CODES.black}`),
    bgBlueWhite: (text) => colorize(text, `${ANSI_CODES.bgBlue}${ANSI_CODES.white}`),
    bgYellowBlack: (text) => colorize(text, `${ANSI_CODES.bgYellow}${ANSI_CODES.black}`),
};