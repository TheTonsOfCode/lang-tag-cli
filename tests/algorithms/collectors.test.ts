import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DictionaryCollector } from '@/algorithms/collector/dictionary-collector';
import { NamespaceCollector } from '@/algorithms/collector/namespace-collector';
import { LangTagCLILogger } from '@/logger';
import { LangTagCLIConfig, LangTagCLIProcessedTag } from '@/type';

const mockConfig: LangTagCLIConfig = {
  baseLanguageCode: 'en',
  localesDirectory: '/test/locales',
} as any;

const mockLogger: LangTagCLILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
} as any;

const mockTag: LangTagCLIProcessedTag = {
  parameterConfig: {
    path: 'greeting',
    namespace: 'common',
  },
} as any;

describe('DictionaryCollector', () => {
  let collector: DictionaryCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new DictionaryCollector();
    collector.config = mockConfig;
    collector.logger = mockLogger;
  });

  it('should aggregate to baseLanguageCode', () => {
    const result = collector.aggregateCollection('common');
    expect(result).toBe('en');
  });

  it('should not transform tag when appendNamespaceToPath is false', () => {
    const result = collector.transformTag(mockTag);
    expect(result).toEqual(mockTag);
  });

  it('should append namespace to path when option enabled', () => {
    const collectorWithOption = new DictionaryCollector({
      appendNamespaceToPath: true,
    });
    collectorWithOption.config = mockConfig;

    const result = collectorWithOption.transformTag(mockTag);
    expect(result.parameterConfig.path).toBe('common.greeting');
    expect(result.parameterConfig.namespace).toBeUndefined();
  });

  it('should append namespace as path', () => {
    const collectorWithOption = new DictionaryCollector({
      appendNamespaceToPath: true,
    });
    collectorWithOption.config = mockConfig;

    const tagWithoutPath = { parameterConfig: { namespace: 'admin' } } as any;
    const result = collectorWithOption.transformTag(tagWithoutPath);
    expect(result.parameterConfig.path).toBe('admin');
  });

  it('should warn on missing collection when not cleaning', async () => {
    collector['clean'] = false;
    await collector.onMissingCollection('en');
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should not warn on missing collection when cleaning', async () => {
    collector['clean'] = true;
    await collector.onMissingCollection('en');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should throw error when multiple collections changed', async () => {
    await expect(collector.postWrite(['en', 'extra'])).rejects.toThrow(
      'Should not write more than 1 collection'
    );
  });

  it('should log success when single collection updated', async () => {
    await collector.postWrite(['en']);
    expect(mockLogger.success).toHaveBeenCalled();
  });

  it('should log info when no collections changed', async () => {
    await collector.postWrite([]);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'No changes were made based on the current configuration and files'
    );
  });

  describe('Edge Cases - transformTag', () => {
    it('should handle tag with undefined path', () => {
      const tagNoPath = { parameterConfig: { namespace: 'admin' } } as any;
      const result = collector.transformTag(tagNoPath);
      expect(result).toEqual(tagNoPath);
    });

    it('should handle tag with undefined namespace', () => {
      const tagNoNamespace = { parameterConfig: { path: 'greeting' } } as any;
      const result = collector.transformTag(tagNoNamespace);
      expect(result).toEqual(tagNoNamespace);
    });

    it('should handle both namespace and path when appendNamespaceToPath is true', () => {
      const collectorWithOption = new DictionaryCollector({
        appendNamespaceToPath: true,
      });
      collectorWithOption.config = mockConfig;

      const tag = {
        parameterConfig: { namespace: 'messages', path: 'welcome' },
      } as any;
      const result = collectorWithOption.transformTag(tag);
      expect(result.parameterConfig.path).toBe('messages.welcome');
      expect(result.parameterConfig.namespace).toBeUndefined();
    });

    it('should not mutate original tag object', () => {
      const collectorWithOption = new DictionaryCollector({
        appendNamespaceToPath: true,
      });
      collectorWithOption.config = mockConfig;
      const originalTag = {
        parameterConfig: { namespace: 'admin', path: 'panel' },
      } as any;
      const originalNamespace = originalTag.parameterConfig.namespace;

      collectorWithOption.transformTag(originalTag);
      expect(originalTag.parameterConfig.namespace).toBe(originalNamespace);
    });
  });

  describe('Edge Cases - postWrite', () => {
    it('should handle null changedCollections', async () => {
      await expect(collector.postWrite(null as any)).resolves.not.toThrow();
    });

    it('should handle undefined changedCollections', async () => {
      await expect(
        collector.postWrite(undefined as any)
      ).resolves.not.toThrow();
    });
  });

  describe('Edge Cases - resolveCollectionFilePath', () => {
    it('should return correct file path for collection', async () => {
      const filePath = await collector.resolveCollectionFilePath('en');
      expect(filePath).toContain('/test/locales/en.json');
    });

    it('should handle special characters in baseLanguageCode', async () => {
      const filePath = await collector.resolveCollectionFilePath('en-US');
      expect(filePath).toContain('/test/locales/en-US.json');
    });
  });

  describe('Edge Cases - aggregateCollection', () => {
    it('should always return baseLanguageCode regardless of input', () => {
      expect(collector.aggregateCollection('common')).toBe('en');
      expect(collector.aggregateCollection('admin')).toBe('en');
      expect(collector.aggregateCollection('')).toBe('en');
    });
  });
});

describe('NamespaceCollector', () => {
  let collector: NamespaceCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new NamespaceCollector();
    collector.config = mockConfig;
    collector.logger = mockLogger;
  });

  it('should aggregate to namespace name', () => {
    const result = collector.aggregateCollection('common');
    expect(result).toBe('common');
  });

  it('should not transform tag', () => {
    const result = collector.transformTag(mockTag);
    expect(result).toEqual(mockTag);
  });

  it('should warn on missing collection when not cleaning', async () => {
    collector['clean'] = false;
    await collector.onMissingCollection('common');
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should not warn on missing collection when cleaning', async () => {
    collector['clean'] = true;
    await collector.onMissingCollection('common');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should log success with namespace names when collections updated', async () => {
    await collector.postWrite(['common', 'admin']);
    expect(mockLogger.success).toHaveBeenCalledWith(
      'Updated namespaces {outputDir} ({namespaces})',
      expect.objectContaining({
        namespaces: expect.stringContaining('common.json'),
      })
    );
  });

  it('should log info when no collections changed', async () => {
    await collector.postWrite([]);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'No changes were made based on the current configuration and files'
    );
  });

  describe('Edge Cases - transformTag', () => {
    it('should return tag unchanged', () => {
      const result = collector.transformTag(mockTag);
      expect(result).toBe(mockTag);
    });

    it('should handle tags with missing properties', () => {
      const minimalTag = { parameterConfig: {} } as any;
      const result = collector.transformTag(minimalTag);
      expect(result).toEqual(minimalTag);
    });
  });

  describe('Edge Cases - aggregateCollection', () => {
    it('should return same name as input', () => {
      expect(collector.aggregateCollection('common')).toBe('common');
      expect(collector.aggregateCollection('admin')).toBe('admin');
      expect(collector.aggregateCollection('settings')).toBe('settings');
    });

    it('should handle special characters in namespace', () => {
      expect(collector.aggregateCollection('en-US')).toBe('en-US');
      expect(collector.aggregateCollection('ui_components')).toBe(
        'ui_components'
      );
    });

    it('should handle empty string', () => {
      expect(collector.aggregateCollection('')).toBe('');
    });
  });

  describe('Edge Cases - postWrite', () => {
    it('should format multiple collections correctly', async () => {
      await collector.postWrite(['common', 'admin', 'settings']);
      expect(mockLogger.success).toHaveBeenCalledWith(
        'Updated namespaces {outputDir} ({namespaces})',
        expect.objectContaining({
          namespaces: expect.stringContaining('"common.json"'),
        })
      );
    });

    it('should handle single collection in postWrite', async () => {
      await collector.postWrite(['common']);
      expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should handle null changedCollections', async () => {
      await expect(collector.postWrite(null as any)).resolves.not.toThrow();
    });

    it('should handle undefined changedCollections', async () => {
      await expect(
        collector.postWrite(undefined as any)
      ).resolves.not.toThrow();
    });

    it('should handle empty array', async () => {
      await collector.postWrite([]);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Edge Cases - resolveCollectionFilePath', () => {
    it('should return correct file path for collection', async () => {
      const filePath = await collector.resolveCollectionFilePath('common');
      expect(filePath).toContain('common.json');
    });

    it('should handle different collection names', async () => {
      const path1 = await collector.resolveCollectionFilePath('admin');
      const path2 = await collector.resolveCollectionFilePath('settings');
      expect(path1).toContain('admin.json');
      expect(path2).toContain('settings.json');
    });
  });

  describe('Edge Cases - onMissingCollection', () => {
    it('should include correct namespace in warning message', async () => {
      collector['clean'] = false;
      await collector.onMissingCollection('test-namespace');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          namespace: 'test-namespace',
        })
      );
    });

    it('should handle special characters in namespace', async () => {
      collector['clean'] = false;
      await collector.onMissingCollection('en-US_special');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
