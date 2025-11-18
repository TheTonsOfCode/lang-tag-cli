import React, { ReactNode } from 'react';

export function reactProcessPlaceholders(
    translation: string,
    params?: { [key: string]: ReactNode }
): string {
    if (typeof translation !== 'string') return '';

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    translation.replace(/{{(.*?)}}/g, (match, placeholder, offset) => {
        if (lastIndex < offset) {
            parts.push(translation.slice(lastIndex, offset));
        }

        const key = placeholder.trim();
        const value = params?.[key];

        if (React.isValidElement(value)) {
            parts.push(value);
        } else if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            parts.push(String(value));
        } else {
            parts.push('');
        }

        lastIndex = offset + match.length;
        return match;
    });

    if (lastIndex < translation.length) {
        parts.push(translation.slice(lastIndex));
    }

    if (parts.every((part) => typeof part === 'string')) {
        return parts.join('');
    }

    return parts as unknown as string;
}
