import { ReactNode } from 'react';

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
        if (params && key in params) {
            parts.push(params[key]);
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
