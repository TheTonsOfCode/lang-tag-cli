import {
  LangTagCLIImportManager,
  LangTagCLIImportedTag,
  LangTagCLIImportedTagsFile,
} from '@/type';

export class ImportManager implements LangTagCLIImportManager {
  private readonly importedFiles: LangTagCLIImportedTagsFile[] = [];

  constructor() {
    this.importedFiles = [];
  }

  importTag(pathRelativeToImportDir: string, tag: LangTagCLIImportedTag): void {
    if (!pathRelativeToImportDir) {
      throw new Error(
        `pathRelativeToImportDir required, got: ${pathRelativeToImportDir}`
      );
    }
    if (!tag?.variableName) {
      throw new Error(`tag.variableName required, got: ${tag?.variableName}`);
    }

    if (!this.isValidJavaScriptIdentifier(tag.variableName)) {
      throw new Error(
        `Invalid JavaScript identifier: "${tag.variableName}". Variable names must start with a letter, underscore, or dollar sign, and contain only letters, digits, underscores, and dollar signs.`
      );
    }

    if (tag.translations == null) {
      throw new Error(`tag.translations required`);
    }

    let importedFile = this.importedFiles.find(
      (file) => file.pathRelativeToImportDir === pathRelativeToImportDir
    );

    if (importedFile) {
      const duplicateTag = importedFile.tags.find(
        (existingTag) => existingTag.variableName === tag.variableName
      );
      if (duplicateTag) {
        throw new Error(
          `Duplicate variable name "${tag.variableName}" in file "${pathRelativeToImportDir}". Variable names must be unique within the same file.`
        );
      }
    }

    if (!importedFile) {
      importedFile = { pathRelativeToImportDir, tags: [] };
      this.importedFiles.push(importedFile);
    }

    importedFile.tags.push(tag);
  }

  getImportedFiles(): LangTagCLIImportedTagsFile[] {
    return [...this.importedFiles];
  }

  getImportedFilesCount(): number {
    return this.importedFiles.length;
  }

  hasImportedFiles(): boolean {
    return this.importedFiles.length > 0;
  }

  private isValidJavaScriptIdentifier(name: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }
}
