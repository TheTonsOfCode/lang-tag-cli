import {fileURLToPath} from "url";
import {join} from "path";
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from "fs";
import {execSync} from "child_process";
import process from "node:process";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const TESTS_ROOT_DIR = join(__dirname, '../..');
export const TESTS_TEST_DIR = join(TESTS_ROOT_DIR, '.e2e-tests-environment');

const MAIN_PROJECT_TEMPLATE = join(TESTS_ROOT_DIR, '.e2e-tests-main-project-template');

export function clearTestsEnvironment(suffix: string) {
    if (existsSync(TESTS_TEST_DIR + '-' + suffix)) {
        rmSync(TESTS_TEST_DIR + '-' + suffix, { recursive: true, force: true });
    }
}

export function clearPreparedMainProjectBase(suffix: string) {
    if (existsSync(MAIN_PROJECT_TEMPLATE + '-' + suffix)) {
        rmSync(MAIN_PROJECT_TEMPLATE + '-' + suffix, { recursive: true, force: true });
    }
}

export function copyPreparedMainProjectBase(suffix: string) {
    if (existsSync(MAIN_PROJECT_TEMPLATE + '-' + suffix)) {
        cpSync(MAIN_PROJECT_TEMPLATE + '-' + suffix, TESTS_TEST_DIR + '-' + suffix, { recursive: true });
    }
}

// NOTE: Npm install and build can take a while, so we do it once for all tests
export function prepareMainProjectBase(suffix: string) {
    if (!process.env.TESTS_BY_COMMAND) {
        // Build the main package first
        execSync('npm run pack-test-build', {cwd: TESTS_ROOT_DIR, stdio: 'inherit'});
    }

    const RUN_CMD = 'node --loader ts-node/esm ./node_modules/.bin/';

    clearPreparedMainProjectBase(suffix);

    mkdirSync(MAIN_PROJECT_TEMPLATE + '-' + suffix, {recursive: true});

    // Create package.json
    writeFileSync(
        join(MAIN_PROJECT_TEMPLATE + '-' + suffix, 'package.json'),
        JSON.stringify({
            name: 'test-main-project',
            version: '1.0.0',
            type: 'module',
            scripts: {
                c: `${RUN_CMD}langtag c`,
                rt: `${RUN_CMD}lang-tag rt`,
                init: `${RUN_CMD}langtag init`,
                watch: `${RUN_CMD}lang-tag watch`
            },
            dependencies: {
                'lang-tag': 'file:../dist/lang-tag.tgz'
            },
            devDependencies: {
                'ts-node': '^10.9.2',
                'typescript': '^5.0.0'
            }
        }, null, 2)
    );

    // Create tsconfig.json
    writeFileSync(
        join(MAIN_PROJECT_TEMPLATE + '-' + suffix, 'tsconfig.json'),
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
    execSync('npm install', {cwd: MAIN_PROJECT_TEMPLATE + '-' + suffix, stdio: 'ignore'});
}