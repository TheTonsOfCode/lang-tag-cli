
/** @type {import('./src/cli/config.ts').LangTagConfig} */
const config = {
    tagName: 'i18n',
    includes: ['src', 'components'],
    excludes: ['node_modules', 'dist', 'build', '**/*.test.ts'],
    outputDir: 'locales/en',
    language: 'en',
};

export default config;
