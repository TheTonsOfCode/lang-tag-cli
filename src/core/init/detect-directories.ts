import { readFileSync, readdirSync, statSync } from 'fs';
import micromatch from 'micromatch';
import { join } from 'path';

function parseGitignore(cwd: string): string[] {
    const gitignorePath = join(cwd, '.gitignore');

    try {
        const content = readFileSync(gitignorePath, 'utf-8');
        return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .filter((line) => !line.startsWith('!')) // Exclude negation patterns
            .map((line) => (line.endsWith('/') ? line.slice(0, -1) : line))
            .filter((line) => {
                // Only keep patterns that are meant for directories
                // Exclude patterns with file extensions (*.log, *.json, etc.)
                // Exclude patterns starting with * that are clearly for files
                if (line.startsWith('*.')) return false;
                if (line.includes('.') && line.split('.')[1].length <= 4)
                    return false;
                return true;
            });
    } catch {
        return [];
    }
}

function isIgnored(entry: string, ignorePatterns: string[]): boolean {
    if (entry.startsWith('.')) {
        return true;
    }

    if (ignorePatterns.length === 0) {
        return false;
    }

    return micromatch.isMatch(entry, ignorePatterns);
}

export function detectProjectDirectories(): string[] {
    const cwd = process.cwd();
    const ignorePatterns = parseGitignore(cwd);
    const detectedFolders: string[] = [];

    try {
        const entries = readdirSync(cwd);

        for (const entry of entries) {
            if (isIgnored(entry, ignorePatterns)) {
                continue;
            }

            try {
                const fullPath = join(cwd, entry);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    detectedFolders.push(entry);
                }
            } catch {
                continue;
            }
        }
    } catch {
        return ['src', 'app'];
    }

    return detectedFolders.length > 0 ? detectedFolders.sort() : ['src', 'app'];
}
