export type LanguageTagParts = {
    language: string;
    script?: string;
    region?: string;
    variants: string[];
};

export type NormalizedLanguageTag = {
    original: string;
    normalized: string;
    parts: LanguageTagParts;
};

const tagRegex =
    /^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-[A-Za-z0-9]{5,8})*$/;

const scriptCase = (value: string): string =>
    `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;

/**
 * Returns whether the provided tag looks like a valid BCP 47 tag.
 * This is intentionally simple and not a full validator.
 */
export function isValidLanguageTag(tag: string): boolean {
    return tagRegex.test(tag.trim());
}

/**
 * Normalizes casing for common BCP 47 segments.
 */
export function normalizeLanguageTag(tag: string): NormalizedLanguageTag {
    const trimmed = tag.trim();

    if (!trimmed) {
        throw new Error('Language tag cannot be empty.');
    }

    if (!isValidLanguageTag(trimmed)) {
        throw new Error(`Invalid language tag: ${tag}`);
    }

    const [language, ...rest] = trimmed.split(/[-_]/);

    const parts: LanguageTagParts = {
        language: language.toLowerCase(),
        variants: [],
    };

    for (const segment of rest) {
        if (segment.length === 4 && /^[A-Za-z]+$/.test(segment)) {
            parts.script = scriptCase(segment);
            continue;
        }

        if (
            (segment.length === 2 && /^[A-Za-z]+$/.test(segment)) ||
            (segment.length === 3 && /^[0-9A-Za-z]+$/.test(segment))
        ) {
            parts.region = segment.toUpperCase();
            continue;
        }

        parts.variants.push(segment.toLowerCase());
    }

    const normalized = [
        parts.language,
        parts.script,
        parts.region,
        ...parts.variants,
    ]
        .filter(Boolean)
        .join('-');

    return { original: tag, normalized, parts };
}

/**
 * Convenience helper that just returns the normalized tag string.
 */
export function formatLanguageTag(tag: string): string {
    return normalizeLanguageTag(tag).normalized;
}
