import chokidar from 'chokidar';

import { getBasePath } from '@/core/watch/path-utils';
import { LangTagCLIConfig } from '@/type';

export function $LT_CreateChokidarWatcher(config: LangTagCLIConfig) {
  const cwd = process.cwd();

  // Chokidar doesn't seem to handle glob patterns reliably, especially during tests.
  // To unify watching behavior in both tests and production:
  // From patterns like ['src/**/*.{js,ts,jsx,tsx}', 'app/components/**/*.{js,ts}'],
  // we extract the base directories:
  // ['src', 'app/components']
  // Chokidar can handle watching these base directories more reliably.
  // Then, we check the full original pattern match inside 'handleFile' once a file change is detected.
  const baseDirsToWatch = [
    ...new Set(config.includes.map((pattern) => getBasePath(pattern))),
  ];

  // If the base path is '.', replace it with an empty string or handle it differently,
  // depending on how chokidar interprets it in the cwd context
  // For now, let's leave '.', assuming chokidar with the cwd option can handle it
  const finalDirsToWatch = baseDirsToWatch.map((dir) =>
    dir === '.' ? cwd : dir
  ); // Can be adjusted

  // Somehow on mac ignores does not work...
  // https://github.com/paulmillr/chokidar/issues/773
  const ignored = [...config.excludes, '**/.git/**']; // Keep ignored patterns

  // console.log('Original patterns:', config.includes);
  // console.log('Watching base directories:', finalDirsToWatch); // Log base directories
  // console.log('Ignoring patterns:', ignored);

  return chokidar.watch(finalDirsToWatch, {
    // Watch base directories
    cwd: cwd,
    ignored: ignored,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });
}
