import { readFileSync } from 'fs';
import { Project, VariableDeclarationList, VariableStatement } from 'ts-morph';

export interface HideExportsResult {
    hiddenCount: number;
    modifiedContent: string;
    originalContent: string;
}

export function $LT_HideExportsInDtsFile(
    dtsFilePath: string,
    variableNames: Set<string>
): HideExportsResult {
    const originalContent = readFileSync(dtsFilePath, 'utf-8');

    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
    });

    const sourceFile = project.addSourceFileAtPath(dtsFilePath);
    let hasChanges = false;

    const exportsToHide: string[] = [];
    const processedStatements = new Set();

    for (const declaration of sourceFile.getVariableDeclarations()) {
        const name = declaration.getName();

        if (variableNames.has(name)) {
            const parent = declaration.getParent();
            if (parent && parent.getKindName() === 'VariableDeclarationList') {
                const varList = parent as VariableDeclarationList;
                const grandParent = varList.getParent();
                if (
                    grandParent &&
                    grandParent.getKindName() === 'VariableStatement'
                ) {
                    const varStatement = grandParent as VariableStatement;

                    // Check for export keyword (handles both "export const" and "export declare const")
                    if (varStatement.hasExportKeyword()) {
                        if (!processedStatements.has(varStatement)) {
                            processedStatements.add(varStatement);
                            exportsToHide.push(name);

                            // Remove only the export modifier, keep the declaration
                            varStatement.toggleModifier('export', false);
                            hasChanges = true;
                        }
                    }
                }
            }
        }
    }

    if (!hasChanges) {
        return {
            hiddenCount: 0,
            modifiedContent: originalContent,
            originalContent,
        };
    }

    // Get modified content
    const modifiedContent = sourceFile.getFullText();

    return {
        hiddenCount: exportsToHide.length,
        modifiedContent,
        originalContent,
    };
}
