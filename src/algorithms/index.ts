/**
 * Algorithm modules for lang-tag-cli.
 * 
 * This module provides access to all available algorithms organized by category:
 * - Collectors: Define how translation tags are organized into output files
 * - Config Generation: Customize tag configuration generation
 * - Import: Handle importing translation libraries (future)
 */


// Collectors Algorithms
export * from './collector/index.ts';

// Config Generation Algorithms
export * from './config-generation/index.ts';

// Import Algorithms
// (currently empty - future algorithms will be exported here)

