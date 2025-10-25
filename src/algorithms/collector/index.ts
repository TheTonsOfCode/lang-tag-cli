/**
 * Translation collectors for organizing translation tags into output files.
 * 
 * These collectors define how translation tags are grouped and written to files
 * during the collection process. Each collector implements a different strategy
 * for organizing translations (e.g., single dictionary vs. namespace-based files).
 */

export { DictionaryCollector } from './dictionary-collector.ts';
export { NamespaceCollector } from './namespace-collector.ts';
export { type TranslationsCollector } from './type.ts';

