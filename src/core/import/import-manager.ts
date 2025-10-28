import {LangTagCLIImportedTag, LangTagCLIImportedTagsFile, LangTagCLIImportManager} from "@/config.ts";

export class ImportManager implements LangTagCLIImportManager {
    private readonly importedFiles: LangTagCLIImportedTagsFile[] = [];

    constructor() {
        this.importedFiles = [];
    }

    importTag(pathRelativeToImportDir: string, tag: LangTagCLIImportedTag): void {
        if (!pathRelativeToImportDir) {
            throw new Error(`pathRelativeToImportDir required, got: ${pathRelativeToImportDir}`);
        }
        if (!tag?.variableName) {
            throw new Error(`tag.variableName required, got: ${tag?.variableName}`);
        }
        if (tag.translations == null) {
            throw new Error(`tag.translations required`);
        }

        let importedFile = this.importedFiles.find(file => 
            file.pathRelativeToImportDir === pathRelativeToImportDir
        );
        
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
}
