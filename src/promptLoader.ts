import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Prompt {
    name: string;
    description: string;
    content: string;
    category?: string;
    filePath?: string;  // Full path to the prompt file
}

export async function loadPrompts(extensionContext: vscode.ExtensionContext): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    const promptsPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'prompts');
    
    try {
        const files = await vscode.workspace.fs.readDirectory(promptsPath);
        
        for (const [fileName, fileType] of files) {
            if (fileType === vscode.FileType.File) {
                const fileUri = vscode.Uri.joinPath(promptsPath, fileName);
                const prompt = await parsePromptFile(fileUri, fileName);
                prompts.push(prompt);
            }
        }
        
        // Sort prompts alphabetically by name
        prompts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error loading prompts:', error);
    }
    
    return prompts;
}

/**
 * Parse a markdown file into a Prompt object
 */
async function parsePromptFile(fileUri: vscode.Uri, fileName: string): Promise<Prompt> {
    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const content = Buffer.from(fileContent).toString('utf8');
    
    let description = '';
    let promptContent = content;
    let category = '';
    
    // Check if the file is markdown and has frontmatter
    if (fileName.endsWith('.md')) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            promptContent = frontmatterMatch[2].trim();
            
            // Extract description from frontmatter
            const descriptionMatch = frontmatter.match(/description:\s*(.*)/);
            if (descriptionMatch) {
                description = descriptionMatch[1].trim();
            }
            
            // Extract category from frontmatter
            const categoryMatch = frontmatter.match(/category:\s*(.*)/);
            if (categoryMatch) {
                category = categoryMatch[1].trim();
            }
        }
    }
    
    return {
        name: fileName,
        description,
        content: promptContent,
        category,
        filePath: fileUri.fsPath
    };
}

/**
 * Recursively load prompt files from a directory
 */
async function loadPromptsFromDirectory(dirUri: vscode.Uri, prompts: Prompt[] = []): Promise<Prompt[]> {
    try {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        
        for (const [name, type] of entries) {
            const entryUri = vscode.Uri.joinPath(dirUri, name);
            
            if (type === vscode.FileType.File) {
                // Parse file and add to prompts array
                const prompt = await parsePromptFile(entryUri, name);
                prompts.push(prompt);
            } else if (type === vscode.FileType.Directory) {
                // Recursively process subdirectories
                await loadPromptsFromDirectory(entryUri, prompts);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirUri.fsPath}:`, error);
    }
    
    return prompts;
}

/**
 * Load user prompts from the .promptcode/prompts directory in the workspace
 */
export async function loadUserPrompts(): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return prompts; // No workspace open
        }
        
        const workspaceRoot = workspaceFolders[0].uri;
        const userPromptsDir = vscode.Uri.joinPath(workspaceRoot, '.promptcode', 'prompts');
        
        // Check if directory exists
        try {
            await vscode.workspace.fs.stat(userPromptsDir);
        } catch {
            console.log('User prompts directory does not exist:', userPromptsDir.fsPath);
            return prompts; // Directory doesn't exist
        }
        
        // Load prompts recursively from the directory
        await loadPromptsFromDirectory(userPromptsDir, prompts);
        
        // Sort prompts alphabetically by name
        prompts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error loading user prompts:', error);
    }
    
    return prompts;
}

/**
 * Load all prompts from both extension and user directories
 */
export async function loadAllPrompts(extensionContext: vscode.ExtensionContext): Promise<Prompt[]> {
    const extensionPrompts = await loadPrompts(extensionContext);
    const userPrompts = await loadUserPrompts();
    
    // Combine both prompt sources
    const allPrompts = [...extensionPrompts, ...userPrompts];
    
    return allPrompts;
}

/**
 * Load prompts from specified directories, respecting configuration options
 */
export async function loadConfiguredPrompts(
    extensionContext: vscode.ExtensionContext,
    includeBuiltIn: boolean = true,
    promptFolderPaths: string[] = []
): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    
    // Load built-in prompts if specified
    if (includeBuiltIn) {
        const builtInPrompts = await loadPrompts(extensionContext);
        prompts.push(...builtInPrompts);
    }
    
    // No workspace folders, return just built-in prompts
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return prompts;
    }
    
    const workspaceRoot = workspaceFolders[0].uri;
    
    // Process each prompt folder from the configuration
    for (const folderPath of promptFolderPaths) {
        if (!folderPath.trim()) { continue; }
        
        try {
            // Handle both file paths and directory paths
            const isFilePath = folderPath.includes('.') && !folderPath.endsWith('/');
            const promptUri = vscode.Uri.joinPath(workspaceRoot, folderPath.trim());
            
            try {
                const stat = await vscode.workspace.fs.stat(promptUri);
                
                if (stat.type === vscode.FileType.File) {
                    // It's a direct file reference (like .github/copilot-instructions.md)
                    const fileName = path.basename(folderPath);
                    const prompt = await parsePromptFile(promptUri, fileName);
                    
                    // Don't assign a category for files directly specified in config
                    prompts.push(prompt);
                } else if (stat.type === vscode.FileType.Directory) {
                    // It's a directory, load all prompts from it recursively
                    const dirPrompts: Prompt[] = [];
                    await loadPromptsFromDirectory(promptUri, dirPrompts);
                    
                    // Set the parent directory as the category for prompts without one
                    const dirName = path.basename(folderPath);
                    for (const prompt of dirPrompts) {
                        if (!prompt.category) {
                            prompt.category = dirName;
                        }
                        prompts.push(prompt);
                    }
                }
            } catch (error) {
                console.log(`Path doesn't exist: ${promptUri.fsPath}`);
            }
        } catch (error) {
            console.error(`Error processing prompt folder ${folderPath}:`, error);
        }
    }
    
    // Sort prompts alphabetically by name
    prompts.sort((a, b) => a.name.localeCompare(b.name));
    
    return prompts;
} 