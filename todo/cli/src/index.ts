#!/usr/bin/env node
import {
    formatLanguageTag,
    isValidLanguageTag,
    normalizeLanguageTag,
} from '@lang-tag/core';
import { getPreset, listPresetNames } from '@lang-tag/presets';

const usage = `Usage:
  lang-tag <tag> [--parts]
  lang-tag preset <name>`;

const rawArgs = process.argv.slice(2);
const showParts = rawArgs.includes('--parts');
const args = rawArgs.filter((arg) => arg !== '--parts');

if (args.length === 0) {
    console.log(usage);
    process.exit(1);
}

const [commandOrTag, maybeValue] = args;

if (commandOrTag === 'preset') {
    if (!maybeValue) {
        console.error(
            'Please provide a preset name. Available:',
            listPresetNames()
        );
        process.exit(1);
    }

    try {
        const preset = getPreset(maybeValue);
        console.log(preset.normalized);

        if (showParts) {
            console.log(JSON.stringify(preset.parts, null, 2));
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exit(1);
    }
} else {
    const tag = commandOrTag;

    if (!isValidLanguageTag(tag)) {
        console.error(`Invalid language tag: ${tag}`);
        process.exit(1);
    }

    const normalized = normalizeLanguageTag(tag);
    console.log(formatLanguageTag(tag));

    if (showParts) {
        console.log(JSON.stringify(normalized.parts, null, 2));
    }
}
