// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Vue Smart Importer extension is now active!');

    // Register the import command
    const importCommand = vscode.commands.registerCommand('vue-smart-importer.importFile', async (uri: vscode.Uri) => {
        try {
            await importFileToActiveEditor(uri);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import file: ${error}`);
        }
    });

    // Register the hello world command (keeping your original)
    const helloWorldCommand = vscode.commands.registerCommand('vue-smart-importer.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Vue Smart Importer!');
    });

    context.subscriptions.push(importCommand, helloWorldCommand);
}

async function importFileToActiveEditor(fileUri: vscode.Uri) {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const activeFileUri = activeEditor.document.uri;
    const targetFilePath = fileUri.fsPath;
    const activeFilePath = activeFileUri.fsPath;

    // Check if the active file is a Vue, TypeScript, or JavaScript file
    const validExtensions = ['.vue', '.ts', '.js', '.tsx', '.jsx'];
    const activeFileExtension = path.extname(activeFilePath);
    
    if (!validExtensions.includes(activeFileExtension)) {
        vscode.window.showErrorMessage('Active file must be a Vue, TypeScript, or JavaScript file');
        return;
    }

    // Generate the import statement
    const importStatement = generateImportStatement(targetFilePath, activeFilePath);
    
    if (!importStatement) {
        vscode.window.showErrorMessage('Could not generate import statement');
        return;
    }

    // Insert the import statement
    await insertImportStatement(activeEditor, importStatement);
    
    vscode.window.showInformationMessage(`Imported: ${path.basename(targetFilePath)}`);
}

function generateImportStatement(targetFilePath: string, activeFilePath: string): string | null {
    const targetDir = path.dirname(targetFilePath);
    const activeDir = path.dirname(activeFilePath);
    const targetBasename = path.basename(targetFilePath);
    const targetExtension = path.extname(targetFilePath);
    
    // Calculate relative path
    let relativePath = path.relative(activeDir, targetFilePath);
    
    // Convert Windows paths to Unix-style for imports
    relativePath = relativePath.replace(/\\/g, '/');
    
    // Add ./ if the path doesn't start with . or /
    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
        relativePath = './' + relativePath;
    }

    // Remove file extension for imports (except for .vue files in some cases)
    if (targetExtension === '.ts' || targetExtension === '.js' || targetExtension === '.tsx' || targetExtension === '.jsx') {
        relativePath = relativePath.replace(/\.(ts|js|tsx|jsx)$/, '');
    }

    // Generate component name for Vue files
    const componentName = generateComponentName(targetBasename);
    
    // Determine import type based on file extension
    if (targetExtension === '.vue') {
        return `import ${componentName} from '${relativePath}';`;
    } else if (targetExtension === '.ts' || targetExtension === '.js' || targetExtension === '.tsx' || targetExtension === '.jsx') {
        // For JS/TS files, try to detect if it's a default export or named export
        // For now, we'll assume default export, but this could be enhanced
        const moduleName = generateModuleName(targetBasename);
        return `import ${moduleName} from '${relativePath}';`;
    }
    
    return null;
}

function generateComponentName(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(vue|ts|js|tsx|jsx)$/, '');
    
    // Convert kebab-case or snake_case to PascalCase
    return nameWithoutExt
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function generateModuleName(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(ts|js|tsx|jsx)$/, '');
    
    // Convert to camelCase for modules
    const words = nameWithoutExt.split(/[-_]/);
    return words[0].toLowerCase() + words.slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

async function insertImportStatement(editor: vscode.TextEditor, importStatement: string) {
    const document = editor.document;
    const text = document.getText();
    
    // Find the position to insert the import statement
    let insertPosition: vscode.Position;
    
    // Look for existing imports to insert after them
    const lines = text.split('\n');
    let lastImportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import ') || line.startsWith('const ') && line.includes('require(')) {
            lastImportLine = i;
        } else if (line && !line.startsWith('//') && !line.startsWith('/*') && lastImportLine >= 0) {
            // Found a non-comment, non-empty line after imports
            break;
        }
    }
    
    if (lastImportLine >= 0) {
        // Insert after the last import
        insertPosition = new vscode.Position(lastImportLine + 1, 0);
    } else {
        // Insert at the beginning of the file
        insertPosition = new vscode.Position(0, 0);
    }
    
    // Check if import already exists
    const importAlreadyExists = text.includes(importStatement.trim());
    if (importAlreadyExists) {
        vscode.window.showInformationMessage('Import statement already exists');
        return;
    }
    
    // Insert the import statement
    await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, importStatement + '\n');
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}