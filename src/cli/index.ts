#!/usr/bin/env node
import {createCli} from './langtag';

createCli().parse();

export interface LangTagExportFileData {
    matches: {
        translations: string,
        config: string | undefined,
        variableName: string | undefined,
    }[]
}

export type LangTagExportFiles = Record<string /* path */, LangTagExportFileData>;

export interface LangTagExportData {

    language: string;

    packageName: string;

    files: LangTagExportFiles;
}