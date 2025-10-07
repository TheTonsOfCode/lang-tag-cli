import {fileURLToPath} from "url";
import {join} from "path";
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync} from "fs";
import {execSync} from "child_process";
import process from "node:process";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const TESTS_ROOT_DIR = join(__dirname, '../..');
export const TESTS_CONTAINER_DIR = join(TESTS_ROOT_DIR, '.e2e-tests');
export const TESTS_TEST_DIR = join(TESTS_CONTAINER_DIR, '-');

const MAIN_PROJECT_TEMPLATE = join(TESTS_CONTAINER_DIR, '.template');

export function removeTestDirectory(directory: string) {
    if (existsSync(directory)) {
        rmSync(directory, {recursive: true, force: true});
    }
}

/**
 * @deprecated
 */
export function clearTestsEnvironment(suffix: string) {
    if (existsSync(TESTS_TEST_DIR + '-' + suffix)) {
        rmSync(TESTS_TEST_DIR + '-' + suffix, {recursive: true, force: true});
    }
}

export function clearPreparedMainProjectBase(suffix: string) {
    if (existsSync(MAIN_PROJECT_TEMPLATE + '-' + suffix)) {
        rmSync(MAIN_PROJECT_TEMPLATE + '-' + suffix, {recursive: true, force: true});
    }
}

export function copyPreparedMainProjectBase(suffix: string, targetDir?: string) {
    if (existsSync(MAIN_PROJECT_TEMPLATE + '-' + suffix)) {
        // process.stdout.write('Copying main project base...\n')
        cpSync(MAIN_PROJECT_TEMPLATE + '-' + suffix, targetDir || (TESTS_TEST_DIR + '-' + suffix), {recursive: true});
        // process.stdout.write('Copied\n')
    }

    // give system a little bit of time to remove previous directory
    setTimeout(() => {
        if (existsSync(TESTS_CONTAINER_DIR)) {
            const containerContents = readdirSync(TESTS_CONTAINER_DIR);
            if (containerContents.length === 0) {
                rmSync(TESTS_CONTAINER_DIR, {recursive: true, force: true});
            }
        }
    }, 100);
}

// NOTE: Npm install and build can take a while, so we do it once for all tests
export function prepareMainProjectBase(suffix: string) {
    if (!process.env.TESTS_BY_COMMAND) {
        // Build the main package first
        // process.stdout.write('Start building the main package...\n')
        execSync('npm run pack-test-build', {cwd: TESTS_ROOT_DIR, stdio: 'ignore'});
        // process.stdout.write('Done building the main package\n')
    }

    const RUN_CMD = 'node --loader ts-node/esm ./node_modules/.bin/';

    clearPreparedMainProjectBase(suffix);

    const mainProjectPath = MAIN_PROJECT_TEMPLATE + '-' + suffix;

    mkdirSync(mainProjectPath, {recursive: true});

    // Create package.json
    writeFileSync(
        join(mainProjectPath, 'package.json'),
        JSON.stringify({
            name: 'test-main-project',
            version: '1.0.0',
            scripts: {
                c: `${RUN_CMD}langtag c`,
                i: `${RUN_CMD}langtag i`,
                rt: `${RUN_CMD}lang-tag rt`,
                init: `${RUN_CMD}langtag init`,
                watch: `${RUN_CMD}lang-tag watch`,
                compile: `${RUN_CMD}tsc`,
            },
            dependencies: {
                "lang-tag": "0.10.0"
            },
            devDependencies: {
                '@lang-tag/cli': 'file:../../dist/lang-tag-cli.tgz',
                'ts-node': '^10.9.2',
                'typescript': '^5.0.0'
            }
        }, null, 2)
    );

    // Create tsconfig.json
    writeFileSync(
        join(mainProjectPath, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                target: 'ESNext',
                module: 'ESNext',
                moduleResolution: 'node',
                esModuleInterop: true,
                strict: true,
                skipLibCheck: true,
                baseUrl: '.',
                paths: {
                    '@/*': ['src/*']
                }
            }
        }, null, 2)
    );

    // Install dependencies
    try {
        execSync('npm install', {
            cwd: mainProjectPath,
            stdio: 'ignore',
            timeout: 12000
        });
    } catch (error: any) {
        if (error.code === 'ETIMEDOUT') {
            process.stdout.write('NPM registry timeout\n');
            throw new Error('NPM registry timeout');
        }
        throw error;
    }
}