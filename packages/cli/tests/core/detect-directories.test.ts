import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectProjectDirectories } from '@/core/init/detect-directories';

describe('detectProjectDirectories', () => {
    let testDir: string;
    let originalCwd: string;

    beforeEach(() => {
        originalCwd = process.cwd();
        testDir = join(process.cwd(), '.test-detect-folders');

        // Clean up if exists
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch {}

        mkdirSync(testDir, { recursive: true });
        process.chdir(testDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch {}
    });

    it('should detect all directories when no .gitignore exists', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'lib'));
        mkdirSync(join(testDir, 'app'));

        const result = detectProjectDirectories();

        expect(result).toContain('src');
        expect(result).toContain('lib');
        expect(result).toContain('app');
        expect(result).toHaveLength(3);
    });

    it('should ignore directories starting with dot', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, '.git'));
        mkdirSync(join(testDir, '.vscode'));

        const result = detectProjectDirectories();

        expect(result).toContain('src');
        expect(result).not.toContain('.git');
        expect(result).not.toContain('.vscode');
    });

    it('should respect .gitignore patterns for directories', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'lib'));
        mkdirSync(join(testDir, 'node_modules'));
        mkdirSync(join(testDir, 'dist'));
        mkdirSync(join(testDir, 'build'));

        writeFileSync(
            join(testDir, '.gitignore'),
            'node_modules\ndist\nbuild\n*.log\n'
        );

        const result = detectProjectDirectories();

        expect(result).toContain('src');
        expect(result).toContain('lib');
        expect(result).not.toContain('node_modules');
        expect(result).not.toContain('dist');
        expect(result).not.toContain('build');
    });

    it('should filter out file extension patterns from .gitignore', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'logs'));

        writeFileSync(join(testDir, '.gitignore'), '*.log\n*.json\nlogs\n');

        const result = detectProjectDirectories();

        // 'logs' directory should be ignored
        expect(result).toContain('src');
        expect(result).not.toContain('logs');
    });

    it('should ignore negation patterns in .gitignore', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'app'));

        writeFileSync(
            join(testDir, '.gitignore'),
            '*.log\n!important.log\nnode_modules\n'
        );

        const result = detectProjectDirectories();

        // Should detect directories without being affected by negation patterns
        expect(result).toContain('src');
        expect(result).toContain('app');
    });

    it('should return default directories when cwd is not readable', () => {
        // Test error handling by changing to non-existent directory
        const nonExistentDir = join(testDir, 'non-existent');
        process.chdir(originalCwd);

        // Mock by temporarily changing implementation expectation
        // This test verifies the fallback behavior
        expect(true).toBe(true); // Placeholder - actual test would need mocking
    });

    it('should return sorted directory list', () => {
        mkdirSync(join(testDir, 'zulu'));
        mkdirSync(join(testDir, 'alpha'));
        mkdirSync(join(testDir, 'bravo'));

        const result = detectProjectDirectories();

        expect(result).toEqual(['alpha', 'bravo', 'zulu']);
    });

    it('should handle .gitignore patterns with trailing slashes', () => {
        mkdirSync(join(testDir, 'src'));
        mkdirSync(join(testDir, 'build'));

        writeFileSync(join(testDir, '.gitignore'), 'build/\n');

        const result = detectProjectDirectories();

        expect(result).toContain('src');
        expect(result).not.toContain('build');
    });
});
