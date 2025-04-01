#!/usr/bin/env node
import { createCli } from './langtag';

createCli().parse();


export interface LangTagExportFileData {
    matches: {
        translations: string,
        config: string | undefined,
    }[]
}

export type LangTagExportFiles = Record<string /* path */, LangTagExportFileData>;

export interface LangTagExportData {

    language: string;

    files: LangTagExportFiles;
}