export function getBasePath(pattern: string): string {
    const globStartIndex = pattern.indexOf('*');
    const braceStartIndex = pattern.indexOf('{');
    let endIndex = -1;

    if (globStartIndex !== -1 && braceStartIndex !== -1) {
        endIndex = Math.min(globStartIndex, braceStartIndex);
    } else if (globStartIndex !== -1) {
        endIndex = globStartIndex;
    } else if (braceStartIndex !== -1) {
        endIndex = braceStartIndex;
    }

    // If there's no '*' or '{', return the whole pattern (it might be a file path)
    if (endIndex === -1) {
        // If the pattern contains '/', find the last '/'
        const lastSlashIndex = pattern.lastIndexOf('/');
        return lastSlashIndex !== -1
            ? pattern.substring(0, lastSlashIndex)
            : '.'; // Return '.' if there's no slash
    }

    // Find the last directory separator before '*' or '{'
    const lastSeparatorIndex = pattern.lastIndexOf('/', endIndex);

    return lastSeparatorIndex === -1
        ? '.'
        : pattern.substring(0, lastSeparatorIndex);
}
