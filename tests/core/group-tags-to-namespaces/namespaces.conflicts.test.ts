import { beforeEach, describe, expect, it, vi } from 'vitest';

import { $LT_TagCandidateFile } from '@/core/collect/collect-tags';
import { $LT_GroupTagsToCollections } from '@/core/collect/group-tags-to-collections';
import { LANG_TAG_DEFAULT_CONFIG } from '@/core/default-config';
import { LangTagCLILogger } from '@/logger';
import { LangTagCLIConfig, LangTagCLIProcessedTag } from '@/type';

// Mock logger
const mockLogger: LangTagCLILogger = {
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  conflict: vi.fn().mockResolvedValue(undefined),
};

// Mock config
const mockConfig: LangTagCLIConfig = {
  tagName: 'lang',
  translationArgPosition: 1,
  includes: ['**/*.ts', '**/*.tsx'],
  excludes: ['node_modules/**'],
  localesDirectory: 'dist',
  baseLanguageCode: 'en',
  isLibrary: false,
  onConfigGeneration: async () => {},
  collect: {
    ...LANG_TAG_DEFAULT_CONFIG.collect,
    onCollectFinish: () => {},
  },
  import: {
    dir: 'src/lang-libraries',
    tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
    onImport: () => {},
  },
};

describe('$LT_GroupTagsToNamespaces - Conflict Detection', () => {
  let mockOnConflictResolution: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConflictResolution = vi.fn().mockResolvedValue(true);
  });

  const createMockTag = (
    overrides: Partial<LangTagCLIProcessedTag> = {}
  ): LangTagCLIProcessedTag => ({
    fullMatch:
      'lang({ text: "Hello" }, { path: "test.path", namespace: "common" })',
    parameter1Text: '{ text: "Hello" }',
    parameter2Text: '{ path: "test.path", namespace: "common" }',
    parameterTranslations: { text: 'Hello' },
    parameterConfig: {
      namespace: 'common',
      path: 'test.path',
    },
    variableName: undefined,
    index: 0,
    line: 1,
    column: 1,
    validity: 'ok',
    ...overrides,
  });

  const createMockFile = (
    relativeFilePath: string,
    tags: LangTagCLIProcessedTag[]
  ): $LT_TagCandidateFile => ({
    relativeFilePath,
    tags,
  });

  const createConfigWithConflictResolution = (): LangTagCLIConfig => ({
    ...mockConfig,
    collect: {
      ...mockConfig.collect,
      onConflictResolution: mockOnConflictResolution,
    },
  });

  it('should detect conflicts between structured objects and simple values', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ some: { structured: { foo: "Foo", bar: "Bar" } } }, { namespace: "common" })',
          parameter1Text:
            '{ some: { structured: { foo: "Foo", bar: "Bar" } } }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: {
            some: {
              structured: {
                foo: 'Foo',
                bar: 'Bar',
              },
            },
          },
          parameterConfig: {
            namespace: 'common',
            path: undefined,
          },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ foo: "Another conflict" }, { namespace: "common", path: "some.structured" })',
          parameter1Text: '{ foo: "Another conflict" }',
          parameter2Text: '{ namespace: "common", path: "some.structured" }',
          parameterTranslations: {
            foo: 'Another conflict',
          },
          parameterConfig: {
            namespace: 'common',
            path: 'some.structured',
          },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should call onConflictResolution with correct path
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'some.structured.foo',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts when trying to create object structure over existing primitive value', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ title: "Simple Title" }, { namespace: "common", path: "page.header" })',
          parameter1Text: '{ title: "Simple Title" }',
          parameter2Text: '{ namespace: "common", path: "page.header" }',
          parameterTranslations: {
            title: 'Simple Title',
          },
          parameterConfig: {
            namespace: 'common',
            path: 'page.header',
          },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ title: "New Title" }, { namespace: "common", path: "page.header" })',
          parameter1Text: '{ title: "New Title" }',
          parameter2Text: '{ namespace: "common", path: "page.header" }',
          parameterTranslations: {
            title: 'New Title',
          },
          parameterConfig: {
            namespace: 'common',
            path: 'page.header',
          },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should call onConflictResolution with correct path
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'page.header.title',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should NOT detect conflicts between different namespaces', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ abc: "XD1" })',
          parameter1Text: '{ abc: "XD1" }',
          parameter2Text: '{}',
          parameterTranslations: {
            abc: 'XD1',
          },
          parameterConfig: {
            namespace: 'common',
            path: undefined,
          },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ abc: "XD2" }, { namespace: "admin" })',
          parameter1Text: '{ abc: "XD2" }',
          parameter2Text: '{ namespace: "admin" }',
          parameterTranslations: {
            abc: 'XD2',
          },
          parameterConfig: {
            namespace: 'admin',
            path: undefined,
          },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should NOT call onConflictResolution - different namespaces
    expect(mockOnConflictResolution).not.toHaveBeenCalled();
  });

  it('should detect conflicts when trying to create object structure over existing primitive value in nested path', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ some: { structured: { foo: "Foo", bar: "Bar" } }, "abc": "XD2" }, { namespace: "admin" })',
          parameter1Text:
            '{ some: { structured: { foo: "Foo", bar: "Bar" } }, "abc": "XD2" }',
          parameter2Text: '{ namespace: "admin" }',
          parameterTranslations: {
            some: {
              structured: {
                foo: 'Foo',
                bar: 'Bar',
              },
            },
            abc: 'XD2',
          },
          parameterConfig: {
            namespace: 'admin',
            path: undefined,
          },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ structured: "XAXAXA" }, { namespace: "admin", path: "some" })',
          parameter1Text: '{ structured: "XAXAXA" }',
          parameter2Text: '{ namespace: "admin", path: "some" }',
          parameterTranslations: {
            structured: 'XAXAXA',
          },
          parameterConfig: {
            namespace: 'admin',
            path: 'some',
          },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should call onConflictResolution with correct path
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'some.structured',
          conflictType: 'type_mismatch',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts between different data types (string vs number vs boolean)', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ count: "5" }, { namespace: "common" })',
          parameter1Text: '{ count: "5" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { count: '5' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ count: 5 }, { namespace: "common" })',
          parameter1Text: '{ count: 5 }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { count: 5 },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch: 'lang({ count: true }, { namespace: "common" })',
          parameter1Text: '{ count: true }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { count: true },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should detect conflicts for each different type
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'count',
          conflictType: 'type_mismatch',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts with multiple files (3+ files)', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 1" }, { namespace: "common" })',
          parameter1Text: '{ title: "Title 1" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { title: 'Title 1' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 2" }, { namespace: "common" })',
          parameter1Text: '{ title: "Title 2" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { title: 'Title 2' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 3" }, { namespace: "common" })',
          parameter1Text: '{ title: "Title 3" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { title: 'Title 3' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component4.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 4" }, { namespace: "common" })',
          parameter1Text: '{ title: "Title 4" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { title: 'Title 4' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should detect multiple conflicts
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(3);
  });

  it('should detect conflicts with deeply nested objects (3+ levels)', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ level1: { level2: { level3: { level4: { value: "Deep Value" } } } } }, { namespace: "common" })',
          parameter1Text:
            '{ level1: { level2: { level3: { level4: { value: "Deep Value" } } } } }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 'Deep Value',
                  },
                },
              },
            },
          },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ value: "Shallow Value" }, { namespace: "common", path: "level1.level2.level3.level4" })',
          parameter1Text: '{ value: "Shallow Value" }',
          parameter2Text:
            '{ namespace: "common", path: "level1.level2.level3.level4" }',
          parameterTranslations: { value: 'Shallow Value' },
          parameterConfig: {
            namespace: 'common',
            path: 'level1.level2.level3.level4',
          },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'level1.level2.level3.level4.value',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts with empty values', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ empty: "" }, { namespace: "common" })',
          parameter1Text: '{ empty: "" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { empty: '' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ empty: null }, { namespace: "common" })',
          parameter1Text: '{ empty: null }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { empty: null },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch: 'lang({ empty: undefined }, { namespace: "common" })',
          parameter1Text: '{ empty: undefined }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { empty: undefined },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
  });

  it('should detect different types of conflicts (path_overwrite vs type_mismatch)', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ user: { name: "John", age: 25 } }, { namespace: "common" })',
          parameter1Text: '{ user: { name: "John", age: 25 } }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { user: { name: 'John', age: 25 } },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ name: "Jane" }, { namespace: "common", path: "user" })',
          parameter1Text: '{ name: "Jane" }',
          parameter2Text: '{ namespace: "common", path: "user" }',
          parameterTranslations: { name: 'Jane' },
          parameterConfig: { namespace: 'common', path: 'user' },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch: 'lang({ user: "Simple User" }, { namespace: "common" })',
          parameter1Text: '{ user: "Simple User" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { user: 'Simple User' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);

    // Check for path_overwrite conflict
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'user.name',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );

    // Check for type_mismatch conflict
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'user',
          conflictType: 'type_mismatch',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should handle complex nested conflicts with multiple overlapping paths', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ app: { header: { title: "App Title", subtitle: "Subtitle" }, footer: { copyright: "2024" } } }, { namespace: "common" })',
          parameter1Text:
            '{ app: { header: { title: "App Title", subtitle: "Subtitle" }, footer: { copyright: "2024" } } }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: {
            app: {
              header: { title: 'App Title', subtitle: 'Subtitle' },
              footer: { copyright: '2024' },
            },
          },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ title: "New Title" }, { namespace: "common", path: "app.header" })',
          parameter1Text: '{ title: "New Title" }',
          parameter2Text: '{ namespace: "common", path: "app.header" }',
          parameterTranslations: { title: 'New Title' },
          parameterConfig: { namespace: 'common', path: 'app.header' },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch:
            'lang({ header: "Simple Header" }, { namespace: "common", path: "app" })',
          parameter1Text: '{ header: "Simple Header" }',
          parameter2Text: '{ namespace: "common", path: "app" }',
          parameterTranslations: { header: 'Simple Header' },
          parameterConfig: { namespace: 'common', path: 'app' },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);

    // Should detect path_overwrite for app.header.title
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'app.header.title',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );

    // Should detect type_mismatch for app.header
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'app.header',
          conflictType: 'type_mismatch',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts with default namespace when no namespace specified in tags', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 1" })',
          parameter1Text: '{ title: "Title 1" }',
          parameter2Text: '{}',
          parameterTranslations: { title: 'Title 1' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Title 2" })',
          parameter1Text: '{ title: "Title 2" }',
          parameter2Text: '{}',
          parameterTranslations: { title: 'Title 2' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should detect conflicts even when no explicit namespace in tags
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'title',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts with default namespace and nested structures', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ user: { name: "John", age: 25 } })',
          parameter1Text: '{ user: { name: "John", age: 25 } }',
          parameter2Text: '{}',
          parameterTranslations: { user: { name: 'John', age: 25 } },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ name: "Jane" }, { path: "user" })',
          parameter1Text: '{ name: "Jane" }',
          parameter2Text: '{ path: "user" }',
          parameterTranslations: { name: 'Jane' },
          parameterConfig: { namespace: 'common', path: 'user' },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'user.name',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should detect conflicts with default namespace and mixed explicit/implicit namespace usage', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Default Title" })',
          parameter1Text: '{ title: "Default Title" }',
          parameter2Text: '{}',
          parameterTranslations: { title: 'Default Title' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch:
            'lang({ title: "Explicit Title" }, { namespace: "common" })',
          parameter1Text: '{ title: "Explicit Title" }',
          parameter2Text: '{ namespace: "common" }',
          parameterTranslations: { title: 'Explicit Title' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should detect conflicts between default and explicit namespace usage
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'title',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );
  });

  it('should NOT detect conflicts between default namespace and different explicit namespace', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Default Title" })',
          parameter1Text: '{ title: "Default Title" }',
          parameter2Text: '{}',
          parameterTranslations: { title: 'Default Title' },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "Admin Title" }, { namespace: "admin" })',
          parameter1Text: '{ title: "Admin Title" }',
          parameter2Text: '{ namespace: "admin" }',
          parameterTranslations: { title: 'Admin Title' },
          parameterConfig: { namespace: 'admin', path: undefined },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should NOT detect conflicts between different namespaces
    expect(mockOnConflictResolution).not.toHaveBeenCalled();
  });

  it('should detect conflicts with default namespace and complex nested paths', async () => {
    const files: $LT_TagCandidateFile[] = [
      createMockFile('src/Component1.tsx', [
        createMockTag({
          fullMatch:
            'lang({ app: { header: { title: "App Title" }, footer: { text: "Footer" } } })',
          parameter1Text:
            '{ app: { header: { title: "App Title" }, footer: { text: "Footer" } } }',
          parameter2Text: '{}',
          parameterTranslations: {
            app: {
              header: { title: 'App Title' },
              footer: { text: 'Footer' },
            },
          },
          parameterConfig: { namespace: 'common', path: undefined },
        }),
      ]),
      createMockFile('src/Component2.tsx', [
        createMockTag({
          fullMatch: 'lang({ title: "New Title" }, { path: "app.header" })',
          parameter1Text: '{ title: "New Title" }',
          parameter2Text: '{ path: "app.header" }',
          parameterTranslations: { title: 'New Title' },
          parameterConfig: { namespace: 'common', path: 'app.header' },
        }),
      ]),
      createMockFile('src/Component3.tsx', [
        createMockTag({
          fullMatch: 'lang({ header: "Simple Header" }, { path: "app" })',
          parameter1Text: '{ header: "Simple Header" }',
          parameter2Text: '{ path: "app" }',
          parameterTranslations: { header: 'Simple Header' },
          parameterConfig: { namespace: 'common', path: 'app' },
        }),
      ]),
    ];

    await $LT_GroupTagsToCollections({
      logger: mockLogger,
      files,
      config: createConfigWithConflictResolution(),
    });

    // Should detect both types of conflicts
    expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);

    // Check for path_overwrite conflict
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'app.header.title',
          conflictType: 'path_overwrite',
        }),
        logger: mockLogger,
      })
    );

    // Check for type_mismatch conflict
    expect(mockOnConflictResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        conflict: expect.objectContaining({
          path: 'app.header',
          conflictType: 'type_mismatch',
        }),
        logger: mockLogger,
      })
    );
  });

  // Tests where conflicts should NOT be detected
  describe('No conflicts expected', () => {
    it('should NOT detect conflicts between different namespaces', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Common Title" }, { namespace: "common" })',
            parameter1Text: '{ title: "Common Title" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { title: 'Common Title' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch: 'lang({ title: "Admin Title" }, { namespace: "admin" })',
            parameter1Text: '{ title: "Admin Title" }',
            parameter2Text: '{ namespace: "admin" }',
            parameterTranslations: { title: 'Admin Title' },
            parameterConfig: { namespace: 'admin', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between different paths in same namespace', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Header Title" }, { namespace: "common", path: "header" })',
            parameter1Text: '{ title: "Header Title" }',
            parameter2Text: '{ namespace: "common", path: "header" }',
            parameterTranslations: { title: 'Header Title' },
            parameterConfig: { namespace: 'common', path: 'header' },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Footer Title" }, { namespace: "common", path: "footer" })',
            parameter1Text: '{ title: "Footer Title" }',
            parameter2Text: '{ namespace: "common", path: "footer" }',
            parameterTranslations: { title: 'Footer Title' },
            parameterConfig: { namespace: 'common', path: 'footer' },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between different keys at same level', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Title", subtitle: "Subtitle" }, { namespace: "common" })',
            parameter1Text: '{ title: "Title", subtitle: "Subtitle" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { title: 'Title', subtitle: 'Subtitle' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ description: "Description" }, { namespace: "common" })',
            parameter1Text: '{ description: "Description" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { description: 'Description' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between nested objects at different paths', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ user: { name: "John", age: 25 } }, { namespace: "common" })',
            parameter1Text: '{ user: { name: "John", age: 25 } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { user: { name: 'John', age: 25 } },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ product: { name: "Product", price: 100 } }, { namespace: "common" })',
            parameter1Text: '{ product: { name: "Product", price: 100 } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { product: { name: 'Product', price: 100 } },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between same values in different namespaces', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch: 'lang({ title: "Same Title" }, { namespace: "common" })',
            parameter1Text: '{ title: "Same Title" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { title: 'Same Title' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch: 'lang({ title: "Same Title" }, { namespace: "admin" })',
            parameter1Text: '{ title: "Same Title" }',
            parameter2Text: '{ namespace: "admin" }',
            parameterTranslations: { title: 'Same Title' },
            parameterConfig: { namespace: 'admin', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between different data types in different namespaces', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch: 'lang({ count: "5" }, { namespace: "common" })',
            parameter1Text: '{ count: "5" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { count: '5' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch: 'lang({ count: 5 }, { namespace: "admin" })',
            parameter1Text: '{ count: 5 }',
            parameter2Text: '{ namespace: "admin" }',
            parameterTranslations: { count: 5 },
            parameterConfig: { namespace: 'admin', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between arrays and objects in different namespaces', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ items: ["item1", "item2"] }, { namespace: "common" })',
            parameter1Text: '{ items: ["item1", "item2"] }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { items: ['item1', 'item2'] },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ items: { first: "item1", second: "item2" } }, { namespace: "admin" })',
            parameter1Text: '{ items: { first: "item1", second: "item2" } }',
            parameter2Text: '{ namespace: "admin" }',
            parameterTranslations: {
              items: { first: 'item1', second: 'item2' },
            },
            parameterConfig: { namespace: 'admin', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between empty values in different namespaces', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch: 'lang({ empty: "" }, { namespace: "common" })',
            parameter1Text: '{ empty: "" }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { empty: '' },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch: 'lang({ empty: null }, { namespace: "admin" })',
            parameter1Text: '{ empty: null }',
            parameter2Text: '{ namespace: "admin" }',
            parameterTranslations: { empty: null },
            parameterConfig: { namespace: 'admin', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between deeply nested objects at different root paths', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ app: { header: { title: "App Title" } } }, { namespace: "common" })',
            parameter1Text: '{ app: { header: { title: "App Title" } } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { app: { header: { title: 'App Title' } } },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ admin: { panel: { title: "Admin Title" } } }, { namespace: "common" })',
            parameter1Text: '{ admin: { panel: { title: "Admin Title" } } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: {
              admin: { panel: { title: 'Admin Title' } },
            },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between same key at different nested paths', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Header Title" }, { namespace: "common", path: "header" })',
            parameter1Text: '{ title: "Header Title" }',
            parameter2Text: '{ namespace: "common", path: "header" }',
            parameterTranslations: { title: 'Header Title' },
            parameterConfig: { namespace: 'common', path: 'header' },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ title: "Footer Title" }, { namespace: "common", path: "footer" })',
            parameter1Text: '{ title: "Footer Title" }',
            parameter2Text: '{ namespace: "common", path: "footer" }',
            parameterTranslations: { title: 'Footer Title' },
            parameterConfig: { namespace: 'common', path: 'footer' },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });

    it('should NOT detect conflicts between different files with no overlapping keys', async () => {
      const files: $LT_TagCandidateFile[] = [
        createMockFile('src/Component1.tsx', [
          createMockTag({
            fullMatch:
              'lang({ user: { name: "John", email: "john@example.com" } }, { namespace: "common" })',
            parameter1Text:
              '{ user: { name: "John", email: "john@example.com" } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: {
              user: { name: 'John', email: 'john@example.com' },
            },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component2.tsx', [
          createMockTag({
            fullMatch:
              'lang({ product: { name: "Product", price: 100 } }, { namespace: "common" })',
            parameter1Text: '{ product: { name: "Product", price: 100 } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { product: { name: 'Product', price: 100 } },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
        createMockFile('src/Component3.tsx', [
          createMockTag({
            fullMatch:
              'lang({ order: { id: 123, status: "pending" } }, { namespace: "common" })',
            parameter1Text: '{ order: { id: 123, status: "pending" } }',
            parameter2Text: '{ namespace: "common" }',
            parameterTranslations: { order: { id: 123, status: 'pending' } },
            parameterConfig: { namespace: 'common', path: undefined },
          }),
        ]),
      ];

      await $LT_GroupTagsToCollections({
        logger: mockLogger,
        files,
        config: createConfigWithConflictResolution(),
      });

      expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });
  });
});
