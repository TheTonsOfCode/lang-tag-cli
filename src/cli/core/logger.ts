import { $LT_Conflict } from '../config.ts';

export interface $LT_Logger {
    info(message: string, params?: Record<string, any>): void;
    success(message: string, params?: Record<string, any>): void;
    warn(message: string, params?: Record<string, any>): void;
    error(message: string, params?: Record<string, any>): void;
    debug(message: string, params?: Record<string, any>): void;

    conflict(conflict: $LT_Conflict): Promise<void>;
}