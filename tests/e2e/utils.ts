import {fileURLToPath} from "url";
import {join} from "path";
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from "fs";
import {execSync} from "child_process";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const TESTS_ROOT_DIR = join(__dirname, '../..');
export const TESTS_TEST_DIR = join(TESTS_ROOT_DIR, '.e2e-tests-environment');

const MAIN_PROJECT_TEMPLATE = join(TESTS_ROOT_DIR, '.e2e-tests-main-project-template');

export function clearTestsEnvironment() {
    if (existsSync(TESTS_TEST_DIR)) {
        rmSync(TESTS_TEST_DIR, { recursive: true, force: true });
    }
}

export function writeTestsConfig(dir: string, testConfig: any, onImportString: string) {
    writeFileSync(
        join(dir, '.lang-tag.config.js'),
        `export default ${JSON.stringify(testConfig, null, 2).replace('"$ToReplace$"', onImportString)}`
    );
}

export function clearPreparedMainProjectBase() {
    if (existsSync(MAIN_PROJECT_TEMPLATE)) {
        rmSync(MAIN_PROJECT_TEMPLATE, { recursive: true, force: true });
    }
}

export function copyPreparedMainProjectBase() {
    if (existsSync(MAIN_PROJECT_TEMPLATE)) {
        cpSync(MAIN_PROJECT_TEMPLATE, TESTS_TEST_DIR, { recursive: true });
    }
}

// NOTE: Npm install and build can take a while, so we do it once for all tests
export function prepareMainProjectBase() {
    // Build the main package first
    execSync('npm run pack-test-build', {cwd: TESTS_ROOT_DIR, stdio: 'inherit'});

    const RUN_CMD = 'node --loader ts-node/esm ./node_modules/.bin/';

    clearPreparedMainProjectBase();

    mkdirSync(MAIN_PROJECT_TEMPLATE, {recursive: true});

    // Create package.json
    writeFileSync(
        join(MAIN_PROJECT_TEMPLATE, 'package.json'),
        JSON.stringify({
            name: 'test-main-project',
            version: '1.0.0',
            type: 'module',
            scripts: {
                collect: `${RUN_CMD}langtag collect`
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
        join(MAIN_PROJECT_TEMPLATE, 'tsconfig.json'),
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
    execSync('npm install', {cwd: MAIN_PROJECT_TEMPLATE, stdio: 'inherit'});
}