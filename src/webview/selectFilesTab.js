/**
 * All the JavaScript for handling the "Select Files" tab:
 * - Searching files
 * - Expanding/collapsing
 * - Selecting/deselecting
 * - Respect .gitignore
 * - Etc.
 *
 * Called from webview.js via `window.initSelectFilesTab(vscode)`.
 */
console.log('Debug: Initializing selectFilesTab.js');

// Ensure we're in a browser environment
if (typeof window !== 'undefined') {
    try {
        console.log('Debug: Setting up selectFilesTab.js');
        
        // Define the initialization function
        window.initSelectFilesTab = function(vscode) {
            if (!vscode) {
                console.error('Debug: vscode API not provided to initSelectFilesTab');
                return;
            }

            try {
                // ----------------------------------------------------------
                // Grab elements related to the "Select Files" tab
                // ----------------------------------------------------------
                const searchInput = document.getElementById('file-search');
                const clearSearchBtn = document.getElementById('clear-search');
                const configHeader = document.getElementById('config-section-header');
                const configContent = document.getElementById('config-content');
                const respectGitignore = document.getElementById('respect-gitignore');
                const ignorePatterns = document.getElementById('ignore-patterns');
                const saveIgnoreBtn = document.getElementById('save-ignore-btn');

                // Add debug styles to help identify issues
                const debugStyle = document.createElement('style');
                debugStyle.textContent = `
                    /* Only add styles that modify or extend existing ones */
                    /* Fix for file view layout */
                    #selected-files-list > .directory-files {
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* Responsive grid for file view */
                        overflow-x: hidden;
                    }
                    
                    /* Ensure directory files respect container boundaries */
                    .directory-files {
                        overflow-x: hidden;
                    }
                `;
                document.head.appendChild(debugStyle);

                // For expand/collapse/select/deselect
                const expandAllBtn = document.getElementById('expand-all-btn');
                const collapseAllBtn = document.getElementById('collapse-all-btn');
                const selectAllBtn = document.getElementById('select-all-btn');
                const deselectAllBtn = document.getElementById('deselect-all-btn');

                // For refreshing the view
                const refreshViewBtn = document.getElementById('refresh-view-btn');

                // Folder vs. file view mode
                const folderViewBtn = document.getElementById('folder-view-btn');
                const fileViewBtn = document.getElementById('file-view-btn');

                // Track expanded directories and view mode
                let expandedDirectories = new Set();
                let viewMode = 'folder';  // Default to folder view
                
                // Process any pending selected files updates from previous view
                if (window._pendingSelectedFiles) {
                    console.log('Processing pending selected files update');
                    const pendingUpdate = window._pendingSelectedFiles;
                    window._pendingSelectedFiles = null;
                    setTimeout(() => {
                        onUpdateSelectedFiles(pendingUpdate);
                    }, 100);
                } else {
                    // Request a fresh update from extension
                    console.log('Requesting fresh selected files data');
                    vscode.postMessage({ command: 'getSelectedFiles' });
                }
                
                // Clear any inline transform styles that might interfere with our CSS
                document.querySelectorAll('.toggle-icon, .collapse-icon').forEach(icon => {
                    if (icon.style.transform) {
                        icon.style.transform = '';
                    }
                });

                // Log element availability for debugging
                console.log('Debug: Elements found:', {
                    searchInput: !!searchInput,
                    clearSearchBtn: !!clearSearchBtn,
                    configHeader: !!configHeader,
                    configContent: !!configContent,
                    respectGitignore: !!respectGitignore,
                    ignorePatterns: !!ignorePatterns,
                    saveIgnoreBtn: !!saveIgnoreBtn,
                    expandAllBtn: !!expandAllBtn,
                    collapseAllBtn: !!collapseAllBtn,
                    selectAllBtn: !!selectAllBtn,
                    deselectAllBtn: !!deselectAllBtn,
                    refreshViewBtn: !!refreshViewBtn,
                    folderViewBtn: !!folderViewBtn,
                    fileViewBtn: !!fileViewBtn
                });

                // Update the clear button visibility for searching
                function updateClearButtonVisibility() {
                    if (!searchInput) return;
                    if (searchInput.value) {
                        clearSearchBtn.style.display = 'block';
                    } else {
                        clearSearchBtn.style.display = 'none';
                    }
                }

                // Format token count to k format
                function formatTokenCount(count) {
                    return (count / 1000).toFixed(2) + 'k';
                }

                // Function to truncate long filenames
                function truncateFilename(filename, maxLength = 20) {
                    if (filename.length <= maxLength) {
                        return filename;
                    }
                    const start = filename.substring(0, maxLength / 2 - 2);
                    const end = filename.substring(filename.length - maxLength / 2 + 2);
                    return start + '...' + end;
                }

                // Render file items in a consistent way
                function renderFileItems(files, totalTokens) {
                    return files.map(file => {
                        // More robust filename extraction
                        let fileName = '';
                        if (file.name) {
                            // If the file object directly provides a name property
                            fileName = file.name;
                        } else if (file.path) {
                            // Extract from path - handle both slash types
                            const pathParts = file.path.split(/[/\\]/);
                            fileName = pathParts[pathParts.length - 1] || file.path;
                        } else {
                            // Fallback
                            fileName = 'Unknown file';
                        }
                        
                        const truncatedName = truncateFilename(fileName);
                        const percentage = totalTokens === 0 ? '0.0' : ((file.tokenCount / totalTokens) * 100).toFixed(1);
                        const workspaceInfo = file.workspaceFolderName ? ` (${file.workspaceFolderName})` : '';
                        const fullTooltip = file.workspaceFolderName ? `${file.workspaceFolderName}: ${file.path}` : file.path;
                        
                        // Simplified structure with cleaner action buttons using codicons
                        return `
                            <div class="selected-file-item" data-path="${file.path}" data-workspace-folder="${file.workspaceFolderName || ''}">
                                <div class="file-info">
                                    <div class="file-header">
                                        <div class="file-name-container">
                                            <span class="codicon codicon-file"></span>
                                            <span class="file-name" title="${fullTooltip}">${truncatedName}</span>
                                        </div>
                                        <div class="file-actions">
                                            <a class="action-button" onclick="window.openFile('${file.path}', '${file.workspaceFolderRootPath || ''}')" title="Open file">
                                                <span class="codicon codicon-open-preview"></span>
                                            </a>
                                            <a class="action-button" onclick="window.deselectFile('${file.path}', '${file.workspaceFolderRootPath || ''}')" title="Remove from selection">
                                                <span class="codicon codicon-trash"></span>
                                            </a>
                                        </div>
                                    </div>
                                    <span class="token-count">${formatTokenCount(file.tokenCount)} tokens (${percentage}%)</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                // Directory toggle function
                window.toggleDirectoryFiles = function(header) {
                    const directorySection = header.closest('.directory-section');
                    const dirPath = directorySection.getAttribute('data-directory');
                    const workspaceFolderName = directorySection.getAttribute('data-workspace-folder') || '';
                    const dirId = workspaceFolderName ? `${workspaceFolderName}:${dirPath}` : dirPath;
                    
                    directorySection.classList.toggle('collapsed');
                    
                    if (directorySection.classList.contains('collapsed')) {
                        expandedDirectories.delete(dirId);
                    } else {
                        expandedDirectories.add(dirId);
                    }
                };

                // Handle selected files updates
                function onUpdateSelectedFiles(message) {
                    const selectedFilesList = document.getElementById('selected-files-list');
                    if (!selectedFilesList) {
                        console.log('Selected files list element not found');
                        return;
                    }

                    console.log(`Updating selected files UI: ${message.selectedFiles ? message.selectedFiles.length : 0} files`);

                    // Handle empty selection
                    if (!message.selectedFiles || message.selectedFiles.length === 0) {
                        selectedFilesList.innerHTML = '';
                        document.getElementById('total-files').textContent = '0';
                        document.getElementById('total-tokens').textContent = '0k';
                        return;
                    }

                    document.getElementById('total-files').textContent = message.selectedFiles.length.toString();
                    document.getElementById('total-tokens').textContent = formatTokenCount(message.totalTokens);

                    let html = '';
                    if (viewMode === 'folder') {
                        // Group all files by directory regardless of workspace
                        const filesByDirectory = message.selectedFiles.reduce((acc, file) => {
                            // Create a directory key that combines path and workspace
                            let dirPath = '.';
                            if (file.path) {
                                const pathParts = file.path.split(/[/\\]/);
                                // Remove the last element (filename) and join the rest
                                if (pathParts.length > 1) {
                                    pathParts.pop(); // Remove filename
                                    dirPath = pathParts.join('/');
                                }
                            }
                            
                            const dirKey = dirPath;
                            
                            if (!acc[dirKey]) {
                                acc[dirKey] = {
                                    dirPath,
                                    workspaceFolderName: file.workspaceFolderName || '',
                                    files: []
                                };
                            }
                            acc[dirKey].files.push(file);
                            return acc;
                        }, {});
                        
                        const totalTokens = message.selectedFiles.reduce((sum, file) => sum + file.tokenCount, 0);
                        
                        // Sort directories by token count
                        const sortedDirectories = Object.values(filesByDirectory)
                            .map(dir => ({
                                ...dir,
                                totalTokens: dir.files.reduce((sum, file) => sum + file.tokenCount, 0)
                            }))
                            .sort((a, b) => b.totalTokens - a.totalTokens);
                        
                        // Render each directory with workspace info
                        html = sortedDirectories.map(({ dirPath, workspaceFolderName, files, totalTokens: dirTokens }) => {
                            const dirPercentage = totalTokens === 0 ? '0.0' : ((dirTokens / totalTokens) * 100).toFixed(1);
                            const isExpanded = expandedDirectories.has(`${workspaceFolderName}:${dirPath}`);
                            const workspaceLabel = workspaceFolderName ? ` (${workspaceFolderName})` : '';
                            
                            return `
                                <div class="directory-section ${isExpanded ? '' : 'collapsed'}" data-directory="${dirPath}" data-workspace-folder="${workspaceFolderName}">
                                    <div class="directory-header" onclick="toggleDirectoryFiles(this)">
                                        <div class="header-left">
                                            <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="9 6 15 12 9 18"></polyline>
                                            </svg>
                                            <span class="directory-name">${dirPath}${workspaceLabel}</span>
                                        </div>
                                        <div class="header-right">
                                            <span class="directory-stats">${formatTokenCount(dirTokens)} tokens (${dirPercentage}%)</span>
                                            <button class="action-button directory-remove-button" onclick="event.stopPropagation(); window.removeDirectory('${dirPath}', '${workspaceFolderName}')" title="Remove all files in this directory">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M3 6h18"/>
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="directory-files">
                                        ${renderFileItems(files.sort((a, b) => b.tokenCount - a.tokenCount), dirTokens)}
                                    </div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        // File view mode (flat list)
                        const sortedFiles = [...message.selectedFiles].sort((a, b) => b.tokenCount - a.tokenCount);
                        const totalTokens = sortedFiles.reduce((sum, file) => sum + file.tokenCount, 0);
                        html = `
                            <div class="directory-files" style="margin-top: 0;">
                                ${renderFileItems(sortedFiles, totalTokens)}
                            </div>
                        `;
                    }

                    selectedFilesList.innerHTML = html;
                }

                // ----------------------------------------------------------
                // Search input handling
                // ----------------------------------------------------------
                let searchTimeout;
                
                function handleSearchInput(value) {
                    console.log('Sending search command with term:', value);
                    
                    // Set search term first
                    vscode.postMessage({
                        command: 'search',
                        searchTerm: value
                    });
                    
                    // Add or remove active-filter class
                    const searchContainer = document.querySelector('.search-container');
                    if (value.trim()) {
                        searchContainer?.classList.add('active-filter');
                        console.log('Search term entered');
                    } else {
                        searchContainer?.classList.remove('active-filter');
                        console.log('Search term cleared, collapsing all directories');
                        vscode.postMessage({ command: 'collapseAll' });
                    }
                }
                
                if (searchInput && clearSearchBtn) {
                    searchInput.addEventListener('input', function() {
                        // Debounce search
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            handleSearchInput(searchInput.value);
                            updateClearButtonVisibility();
                        }, 300);
                    });

                    clearSearchBtn.addEventListener('click', function() {
                        searchInput.value = '';
                        handleSearchInput('');
                        updateClearButtonVisibility();
                        searchInput.focus();
                    });

                    // Initialize search button and active filter display
                    updateClearButtonVisibility();
                    if (searchInput.value.trim()) {
                        document.querySelector('.search-container')?.classList.add('active-filter');
                    }
                }

                // ----------------------------------------------------------
                // Configuration toggle
                // ----------------------------------------------------------
                if (configHeader && configContent) {
                    configContent.style.display = 'none';
                    configHeader.addEventListener('click', function () {
                        const configSection = document.getElementById('config-section');
                        configSection.classList.toggle('collapsed');
                        if (configSection.classList.contains('collapsed')) {
                            configContent.style.display = 'none';
                        } else {
                            configContent.style.display = 'block';
                        }
                    });
                }

                // ----------------------------------------------------------
                // Respect .gitignore and Show ignore info
                // ----------------------------------------------------------
                if (respectGitignore && ignorePatterns && saveIgnoreBtn) {
                    // Get the parent container and label for better click handling
                    const checkboxContainer = respectGitignore.closest('.checkbox-container');
                    const checkboxLabel = checkboxContainer ? checkboxContainer.querySelector('label') : null;
                    
                    // Function to handle the checkbox toggle and save state
                    const updateCheckboxState = function(shouldBeChecked) {
                        console.log('Setting checkbox to', shouldBeChecked ? 'checked' : 'unchecked');
                        
                        // Set the visual state
                        if (shouldBeChecked) {
                            respectGitignore.classList.add('checked');
                        } else {
                            respectGitignore.classList.remove('checked');
                        }
                        
                        // Save to VS Code settings
                        console.log('Saving checkbox state:', shouldBeChecked);
                        vscode.postMessage({
                            command: 'saveIgnoreConfig',
                            respectGitignore: shouldBeChecked
                        });
                    };
                    
                    // Add click event directly to the checkbox with simple toggle
                    respectGitignore.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const newState = !respectGitignore.classList.contains('checked');
                        updateCheckboxState(newState);
                    });
                    
                    // Add click event to the label for better UX
                    if (checkboxLabel) {
                        checkboxLabel.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const newState = !respectGitignore.classList.contains('checked');
                            updateCheckboxState(newState);
                        });
                    }

                    // Set ignorePatterns to read-only
                    ignorePatterns.setAttribute('readonly', 'readonly');
                    
                    // Add informative message if it doesn't exist yet
                    if (!document.querySelector('.info-message')) {
                        const infoMessage = document.createElement('div');
                        infoMessage.className = 'info-message';
                        infoMessage.innerHTML = 'Default ignore patterns are used unless a <code>.promptcode_ignore</code> file exists in your workspace root.';
                        ignorePatterns.parentNode.insertBefore(infoMessage, ignorePatterns);
                    }

                    // Hide the save button as it's not needed
                    saveIgnoreBtn.style.display = 'none';
                    
                    // Request current configuration
                    vscode.postMessage({ command: 'loadIgnoreConfig' });
                }

                // ----------------------------------------------------------
                // Expand/Collapse/Select/Deselect
                // ----------------------------------------------------------
                if (expandAllBtn) {
                    expandAllBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'expandAll' });
                    });
                }

                if (collapseAllBtn) {
                    collapseAllBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'collapseAll' });
                    });
                }

                if (selectAllBtn) {
                    selectAllBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'selectAll' });
                    });
                }

                if (deselectAllBtn) {
                    deselectAllBtn.addEventListener('click', function() {
                        vscode.postMessage({ command: 'deselectAll' });
                    });
                }

                // ----------------------------------------------------------
                // Refresh view button handler
                // ----------------------------------------------------------
                if (refreshViewBtn) {
                    refreshViewBtn.addEventListener('click', function() {
                        console.log('Refreshing file view');
                        // Only refresh file explorer without clearing token cache
                        vscode.postMessage({ command: 'refreshFileExplorer' });
                    });
                }

                // ----------------------------------------------------------
                // Folder vs. File View
                // ----------------------------------------------------------
                function setViewMode(mode) {
                    viewMode = mode;
                    folderViewBtn.classList.toggle('active', mode === 'folder');
                    fileViewBtn.classList.toggle('active', mode === 'file');
                    vscode.postMessage({ command: 'getSelectedFiles' });
                }

                folderViewBtn?.addEventListener('click', () => {
                    setViewMode('folder');
                });

                fileViewBtn?.addEventListener('click', () => {
                    setViewMode('file');
                });

                // ----------------------------------------------------------
                // Message handling
                // ----------------------------------------------------------
                window.selectFilesTab = {
                    onMessage: function(message) {
                        switch (message.command) {
                            case 'updateSelectedFiles':
                                onUpdateSelectedFiles(message);
                                
                                // Also notify the generatePromptTab about file changes
                                if (window.generatePromptTab && typeof window.generatePromptTab.onSelectedFilesChanged === 'function') {
                                    console.log('Notifying generatePromptTab about file selection changes from selectFilesTab');
                                    window.generatePromptTab.onSelectedFilesChanged();
                                }
                                
                                return true;
                            case 'updateIgnoreConfig':
                                // Handle the ignore configuration response
                                if (respectGitignore && typeof message.respectGitignore === 'boolean') {
                                    console.log('Received updateIgnoreConfig in selectFilesTab with respectGitignore =', message.respectGitignore);
                                    
                                    const currentState = respectGitignore.classList.contains('checked');
                                    console.log('Current checkbox state before update:', currentState);
                                    
                                    if (message.respectGitignore) {
                                        respectGitignore.classList.add('checked');
                                    } else {
                                        respectGitignore.classList.remove('checked');
                                    }
                                    
                                    const newState = respectGitignore.classList.contains('checked');
                                    console.log('New checkbox state after update:', newState);
                                    
                                    if (ignorePatterns && message.ignorePatterns) {
                                        ignorePatterns.value = message.ignorePatterns;
                                    }
                                }
                                return true;
                            default:
                                return false;
                        }
                    }
                };

                // Add removeDirectory functionality
                window.removeDirectory = function(dirPath, workspaceFolderName) {
                    vscode.postMessage({
                        command: 'removeDirectory',
                        dirPath: dirPath,
                        workspaceFolderName: workspaceFolderName
                    });
                };

                console.log('Debug: Successfully initialized selectFilesTab');
            } catch (err) {
                console.error('Debug: Error in initSelectFilesTab:', err);
            }
        };

        console.log('Debug: Successfully defined initSelectFilesTab');
    } catch (err) {
        console.error('Debug: Error setting up selectFilesTab.js:', err);
    }
} else {
    console.error('Debug: Not in a browser environment');
}

// Double-check that the function is available
console.log('Debug: Final check - initSelectFilesTab available:', typeof window.initSelectFilesTab); 