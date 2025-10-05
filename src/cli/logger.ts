import { LangTagCLIConflict } from './config.ts';

export interface LangTagCLILogger {
    info(message: string, params?: Record<string, any>): void;
    success(message: string, params?: Record<string, any>): void;
    warn(message: string, params?: Record<string, any>): void;
    error(message: string, params?: Record<string, any>): void;
    debug(message: string, params?: Record<string, any>): void;

    conflict(conflict: LangTagCLIConflict): Promise<void>;
}