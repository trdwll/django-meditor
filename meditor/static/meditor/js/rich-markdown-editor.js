// Rich Markdown Editor JavaScript
class RichMarkdownEditor {
    constructor(fieldName) {
        this.fieldName = fieldName;
        this.textarea = document.querySelector(`textarea[name="${fieldName}"]`);
        this.toolbar = document.querySelector(`.markdown-toolbar[data-field="${fieldName}"]`);
        this.previewDiv = document.getElementById(`preview-${fieldName}`);
        this.previewContent = this.previewDiv.querySelector('.preview-content');
        this.livePreviewEnabled = false;
        this.autoSaveTimeout = null;
        

        
        this.init();
    }
    
    init() {
        this.bindToolbarEvents();
        this.bindKeyboardShortcuts();
        this.bindPasteEvents();
        this.setupLivePreview();
        this.setupImageUpload();
        this.setupAutoSave();
        this.setupSnippets();
        this.setupSmartFeatures();
        this.setupExportImport();
    }
    
    bindToolbarEvents() {
        this.toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const action = e.target.dataset.action;
                this.handleToolbarAction(action);
            }
        });
    }
    
    bindKeyboardShortcuts() {
        this.textarea.addEventListener('keydown', (e) => {
            // Tab key support
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertAtCursor('    ');
            }
            
            // Keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.wrapSelection('**', '**');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.wrapSelection('*', '*');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.showLinkModal();
                        break;
                    case 's':
                        e.preventDefault();
                        this.autoSave();
                        break;
                }
            }
            

        });
    }
    
    bindPasteEvents() {
        this.textarea.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedData = clipboardData.getData('text/html');
            const pastedText = clipboardData.getData('text/plain');
            
            // Check if auto-convert HTML is enabled
            const autoConvertHtml = this.toolbar.dataset.autoConvertHtml !== 'false';
            
            // Only auto-convert if explicitly enabled
            if (pastedData && pastedData.includes('<') && autoConvertHtml) {
                e.preventDefault();
                this.convertHtmlToMarkdown(pastedData);
            } else if (pastedText && this.isUrl(pastedText.trim())) {
                e.preventDefault();
                this.handleUrlPaste(pastedText.trim());
            }
        });
    }
    
    handleUrlPaste(url) {
        const selection = this.getSelection();
        
        if (selection.text) {
            // If text is selected, make it the link text
            this.insertAtCursor(`[${selection.text}](${url})`);
            this.showNotification('Selected text converted to link', 'success');
        } else {
            // If no text selected, convert URL to link with domain as text
            this.autoLinkUrl(url);
        }
    }
    
    isUrl(text) {
        // Enhanced URL detection - matches various URL formats
        const urlPatterns = [
            /^https?:\/\/[^\s]+$/i,  // http/https URLs
            /^www\.[^\s]+\.[^\s]+$/i,  // www URLs
            /^[^\s]+\.[^\s]+\.[^\s]+$/i,  // domain.com/path
        ];
        
        return urlPatterns.some(pattern => pattern.test(text));
    }
    
    autoLinkUrl(url) {
        // Ensure URL has protocol
        let fullUrl = url;
        if (!url.match(/^https?:\/\//i)) {
            fullUrl = 'https://' + url;
        }
        
        // Extract domain name for link text
        let linkText = url;
        try {
            const urlObj = new URL(fullUrl);
            linkText = urlObj.hostname + urlObj.pathname;
            if (urlObj.pathname === '/') {
                linkText = urlObj.hostname;
            }
        } catch (e) {
            // If URL parsing fails, use the original URL
            linkText = url;
        }
        
        // Create markdown link
        const markdownLink = `[${linkText}](${fullUrl})`;
        this.insertAtCursor(markdownLink);
        
        // Show notification
        this.showNotification('URL converted to link', 'success');
    }
    
    setupLivePreview() {
        // Add live preview toggle button
        const livePreviewBtn = document.createElement('button');
        livePreviewBtn.type = 'button';
        livePreviewBtn.className = 'toolbar-btn live-preview-btn';
        livePreviewBtn.dataset.action = 'live_preview';
        livePreviewBtn.title = 'Toggle Live Preview';
        livePreviewBtn.innerHTML = '⚡';
        
        // Insert after the preview button
        const previewBtn = this.toolbar.querySelector('[data-action="preview"]');
        if (previewBtn) {
            previewBtn.parentNode.insertBefore(livePreviewBtn, previewBtn.nextSibling);
        }
        
        // Setup live preview functionality
        this.textarea.addEventListener('input', () => {
            if (this.livePreviewEnabled) {
                this.updateLivePreview();
            }
        });
    }
    
    setupImageUpload() {
        // Add image upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'toolbar-btn upload-btn';
        uploadBtn.dataset.action = 'upload_image';
        uploadBtn.title = 'Upload Image';
        uploadBtn.innerHTML = '📤';
        
        // Insert after the image button
        const imageBtn = this.toolbar.querySelector('[data-action="image"]');
        if (imageBtn) {
            imageBtn.parentNode.insertBefore(uploadBtn, imageBtn.nextSibling);
        }
        
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.id = `image-upload-${this.fieldName}`;
        document.body.appendChild(fileInput);
        
        // Handle file upload
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadImage(file);
            }
        });
        
        // Setup drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        this.textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.textarea.classList.add('drag-over');
        });
        
        this.textarea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.textarea.classList.remove('drag-over');
        });
        
        this.textarea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.textarea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.uploadImage(file);
                }
            }
        });
    }
    
    setupAutoSave() {
        this.textarea.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.autoSave();
            }, 2000);
            
            // Update content analysis in real-time
            this.updateContentAnalysis();
        });
    }
    
    updateContentAnalysis() {
        const content = this.textarea.value;
        const analysis = this.analyzeContent(content);
        
        // Update or create analysis panel
        let analysisPanel = document.querySelector('.content-analysis-panel');
        if (!analysisPanel) {
            analysisPanel = this.createAnalysisPanel();
        }
        
        this.updateAnalysisDisplay(analysisPanel, analysis);
    }
    
    createAnalysisPanel() {
        const panel = document.createElement('div');
        panel.className = 'content-analysis-panel';
        panel.innerHTML = `
            <div class="analysis-header">
                <h4>📊 Content Analysis</h4>
                <button class="analysis-toggle" onclick="this.closest('.content-analysis-panel').classList.toggle('collapsed')">−</button>
            </div>
            <div class="analysis-content">
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">Words:</span>
                        <span class="analysis-value" id="word-count">0</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Reading Time:</span>
                        <span class="analysis-value" id="reading-time">0 min</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Characters:</span>
                        <span class="analysis-value" id="char-count">0</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Paragraphs:</span>
                        <span class="analysis-value" id="paragraph-count">0</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Headings:</span>
                        <span class="analysis-value" id="heading-count">0</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Links:</span>
                        <span class="analysis-value" id="link-count">0</span>
                    </div>
                </div>
                <div class="analysis-insights" id="content-insights"></div>
            </div>
        `;
        
        // Insert after the editor
        this.textarea.parentNode.parentNode.appendChild(panel);
        return panel;
    }
    
    analyzeContent(content) {
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const characters = content.length;
        const charactersNoSpaces = content.replace(/\s/g, '').length;
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const headings = (content.match(/^#{1,6}\s+/gm) || []).length;
        const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
        const images = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length;
        
        // Calculate reading time (average 200 words per minute)
        const readingTimeMinutes = Math.ceil(words.length / 200);
        const readingTimeSeconds = Math.ceil((words.length / 200) * 60);
        
        // Calculate readability (simple Flesch-Kincaid approximation)
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
        const avgSyllablesPerWord = this.estimateSyllables(words);
        const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        
        // Generate insights
        const insights = this.generateInsights({
            words: words.length,
            characters,
            paragraphs: paragraphs.length,
            headings,
            links,
            images,
            avgWordsPerSentence,
            fleschScore
        });
        
        return {
            words: words.length,
            characters,
            charactersNoSpaces,
            paragraphs: paragraphs.length,
            headings,
            links,
            images,
            readingTimeMinutes,
            readingTimeSeconds,
            avgWordsPerSentence,
            fleschScore,
            insights
        };
    }
    
    estimateSyllables(words) {
        // Simple syllable estimation
        let totalSyllables = 0;
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
            if (cleanWord.length <= 3) {
                totalSyllables += 1;
            } else {
                const syllables = cleanWord.match(/[aeiouy]+/g) || [];
                totalSyllables += Math.max(syllables.length, 1);
            }
        });
        return totalSyllables / Math.max(words.length, 1);
    }
    
    generateInsights(stats) {
        const insights = [];
        
        // Word count insights
        if (stats.words < 100) {
            insights.push('📝 Consider adding more content for better engagement');
        } else if (stats.words > 2000) {
            insights.push('📖 This is a comprehensive piece - consider breaking it into sections');
        }
        
        // Readability insights
        if (stats.fleschScore > 80) {
            insights.push('✅ Very easy to read - great for general audiences');
        } else if (stats.fleschScore > 60) {
            insights.push('👍 Good readability - suitable for most readers');
        } else if (stats.fleschScore > 30) {
            insights.push('⚠️ Consider simplifying language for better accessibility');
        } else {
            insights.push('🔍 Complex content - may need simplification');
        }
        
        // Structure insights
        if (stats.headings === 0 && stats.words > 300) {
            insights.push('📋 Add headings to improve content structure');
        }
        
        if (stats.links === 0 && stats.words > 500) {
            insights.push('🔗 Consider adding relevant links for better SEO');
        }
        
        if (stats.images === 0 && stats.words > 800) {
            insights.push('🖼️ Images can make your content more engaging');
        }
        
        return insights;
    }
    
    updateAnalysisDisplay(panel, analysis) {
        panel.querySelector('#word-count').textContent = analysis.words.toLocaleString();
        panel.querySelector('#reading-time').textContent = analysis.readingTimeMinutes > 0 ? 
            `${analysis.readingTimeMinutes} min` : '< 1 min';
        panel.querySelector('#char-count').textContent = analysis.characters.toLocaleString();
        panel.querySelector('#paragraph-count').textContent = analysis.paragraphs;
        panel.querySelector('#heading-count').textContent = analysis.headings;
        panel.querySelector('#link-count').textContent = analysis.links;
        
        // Update insights
        const insightsContainer = panel.querySelector('#content-insights');
        if (analysis.insights.length > 0) {
            insightsContainer.innerHTML = analysis.insights.map(insight => 
                `<div class="insight-item">${insight}</div>`
            ).join('');
        } else {
            insightsContainer.innerHTML = '<div class="insight-item">✨ Great content structure!</div>';
        }
    }
    
    setupSnippets() {
        // Add snippets button
        const snippetsBtn = document.createElement('button');
        snippetsBtn.type = 'button';
        snippetsBtn.className = 'toolbar-btn snippets-btn';
        snippetsBtn.dataset.action = 'snippets';
        snippetsBtn.title = 'Snippets Library';
        snippetsBtn.innerHTML = '📚';
        
        // Insert after the upload button
        const uploadBtn = this.toolbar.querySelector('[data-action="upload_image"]');
        if (uploadBtn) {
            uploadBtn.parentNode.insertBefore(snippetsBtn, uploadBtn.nextSibling);
        }
        
        // Add save snippet button
        const saveSnippetBtn = document.createElement('button');
        saveSnippetBtn.type = 'button';
        saveSnippetBtn.className = 'toolbar-btn save-snippet-btn';
        saveSnippetBtn.dataset.action = 'save_snippet';
        saveSnippetBtn.title = 'Save as Snippet';
        saveSnippetBtn.innerHTML = '💾';
        
        // Insert after snippets button
        snippetsBtn.parentNode.insertBefore(saveSnippetBtn, snippetsBtn.nextSibling);
    }
    
    handleToolbarAction(action) {
        switch (action) {
            case 'bold':
                this.wrapSelection('**', '**');
                break;
            case 'italic':
                this.wrapSelection('*', '*');
                break;
            case 'strikethrough':
                this.wrapSelection('~~', '~~');
                break;
            case 'h1':
                this.insertAtLineStart('# ');
                break;
            case 'h2':
                this.insertAtLineStart('## ');
                break;
            case 'h3':
                this.insertAtLineStart('### ');
                break;
            case 'link':
                this.showLinkModal();
                break;
            case 'image':
                this.showImageModal();
                break;
            case 'upload_image':
                this.triggerImageUpload();
                break;
            case 'snippets':
                this.showSnippetsLibrary();
                break;
            case 'save_snippet':
                this.showSaveSnippetModal();
                break;
            case 'code':
                this.wrapSelection('`', '`');
                break;
            case 'codeblock':
                this.wrapSelection('```\n', '\n```');
                break;
            case 'ul':
                this.insertAtLineStart('- ');
                break;
            case 'ol':
                this.insertAtLineStart('1. ');
                break;
            case 'blockquote':
                this.insertAtLineStart('> ');
                break;
            case 'table':
                this.showTableBuilder();
                break;
            case 'hr':
                this.insertAtCursor('\n---\n');
                break;
            case 'html2md':
                this.showHtmlToMarkdownModal();
                break;
            case 'preview':
                this.togglePreview();
                break;
            case 'live_preview':
                this.toggleLivePreview();
                break;
            case 'site_preview':
                this.openSitePreview();
                break;
            case 'fullscreen':
                this.showFullscreenPreview();
                break;
        }
    }
    
    toggleLivePreview() {
        this.livePreviewEnabled = !this.livePreviewEnabled;
        const btn = this.toolbar.querySelector('[data-action="live_preview"]');
        
        if (this.livePreviewEnabled) {
            btn.innerHTML = '⚡';
            btn.classList.add('active');
            this.updateLivePreview();
            this.previewDiv.style.display = 'block';
        } else {
            btn.innerHTML = '⚡';
            btn.classList.remove('active');
            this.previewDiv.style.display = 'none';
        }
    }
    
    updateLivePreview() {
        const markdownText = this.textarea.value;
        const htmlContent = this.convertMarkdownToHtml(markdownText);
        this.previewContent.innerHTML = htmlContent;
        
        // Highlight code blocks
        if (typeof hljs !== 'undefined') {
            this.previewContent.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }
    
    triggerImageUpload() {
        const fileInput = document.getElementById(`image-upload-${this.fieldName}`);
        fileInput.click();
    }
    
    async uploadImage(file) {
        try {
            // Create FormData
            const formData = new FormData();
            formData.append('image', file);
            formData.append('csrfmiddlewaretoken', this.getCsrfToken());
            
            console.log('Uploading image:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            // Show loading notification
            this.showNotification('Uploading image...', 'info');
            
            // Upload to server
            const response = await fetch('/meditor/upload-image/', {
                method: 'POST',
                body: formData
            });
            
            console.log('Upload response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Upload response data:', data);
                
                if (data.success) {
                    // Insert image markdown only on successful upload
                    const imageMarkdown = `![${file.name}](${data.url})`;
                    this.insertAtCursor(imageMarkdown);
                    
                    // Update live preview if enabled
                    if (this.livePreviewEnabled) {
                        this.updateLivePreview();
                    }
                    
                    // Show success notification
                    this.showNotification('Image uploaded successfully!', 'success');
                } else {
                    this.showNotification('Upload failed: ' + data.error, 'error');
                }
            } else {
                const errorText = await response.text();
                console.error('Upload failed with status:', response.status, 'Response:', errorText);
                this.showNotification('Upload failed: HTTP ' + response.status, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }
    
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    }
    
    autoSave() {
        // Save to localStorage as backup
        const content = this.textarea.value;
        localStorage.setItem(`meditor_autosave_${this.fieldName}`, content);
        
        // Show save indicator
        const saveIndicator = document.createElement('div');
        saveIndicator.className = 'save-indicator';
        saveIndicator.textContent = 'Saved';
        saveIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
        `;
        document.body.appendChild(saveIndicator);
        
        setTimeout(() => {
            saveIndicator.remove();
        }, 2000);
    }
    
    getSelection() {
        return {
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd,
            text: this.textarea.value.substring(this.textarea.selectionStart, this.textarea.selectionEnd)
        };
    }
    
    setSelection(start, end) {
        this.textarea.setSelectionRange(start, end);
        this.textarea.focus();
    }
    
    insertAtCursor(text) {
        const selection = this.getSelection();
        const beforeText = this.textarea.value.substring(0, selection.start);
        const afterText = this.textarea.value.substring(selection.end);
        
        this.textarea.value = beforeText + text + afterText;
        this.setSelection(selection.start + text.length, selection.start + text.length);
        
        // Trigger input event for live preview
        this.textarea.dispatchEvent(new Event('input'));
    }
    
    wrapSelection(before, after) {
        const selection = this.getSelection();
        const replacement = before + selection.text + after;
        
        this.textarea.value = this.textarea.value.substring(0, selection.start) + 
                             replacement + 
                             this.textarea.value.substring(selection.end);
        
        this.setSelection(selection.start + before.length, selection.start + replacement.length - after.length);
        this.textarea.dispatchEvent(new Event('input'));
    }
    
    insertAtLineStart(text) {
        const selection = this.getSelection();
        const lines = this.textarea.value.split('\n');
        const currentLine = this.getCurrentLineNumber();
        
        if (lines[currentLine]) {
            lines[currentLine] = text + lines[currentLine];
            this.textarea.value = lines.join('\n');
            this.setSelection(selection.start + text.length, selection.end + text.length);
        }
    }
    
    getCurrentLineNumber() {
        const value = this.textarea.value;
        const cursorPos = this.textarea.selectionStart;
        return value.substring(0, cursorPos).split('\n').length - 1;
    }
    
    insertTable() {
        this.showTableBuilder();
    }
    
    showTableBuilder() {
        // Remove any existing modal
        document.querySelectorAll('.table-builder-modal').forEach(m => m.remove());

        const modal = document.createElement('div');
        modal.className = 'table-builder-modal';
        modal.innerHTML = `
            <div class="table-builder-content" style="max-width:400px;">
                <div class="table-builder-header">
                    <h3>Insert Table</h3>
                    <button class="close-modal" onclick="this.closest('.table-builder-modal').remove()">×</button>
                </div>
                <div class="table-controls" style="margin-bottom:16px;">
                    <label>Rows: <input type="number" id="table-rows" value="3" min="2" max="20" style="width:60px;"></label>
                    <label style="margin-left:12px;">Columns: <input type="number" id="table-cols" value="3" min="2" max="10" style="width:60px;"></label>
                    <button class="btn btn-primary" id="update-table-btn" style="margin-left:12px;">Update</button>
                </div>
                <div class="table-editor">
                    <div class="table-container" id="table-container"></div>
                </div>
                <div style="text-align:right;margin-top:18px;">
                    <button class="btn btn-secondary" onclick="this.closest('.table-builder-modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="insert-table-btn">Insert Table</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Minimal table editor logic
        const container = modal.querySelector('#table-container');
        let rows = 3, cols = 3;
        let data = [];

        function renderTable() {
            let html = '<table class="editable-table"><tbody>';
            for (let i = 0; i < rows; i++) {
                html += '<tr>';
                for (let j = 0; j < cols; j++) {
                    const tag = i === 0 ? 'th' : 'td';
                    const val = (data[i] && data[i][j]) || (i === 0 ? `Header ${j+1}` : '');
                    html += `<${tag} contenteditable="true" data-row="${i}" data-col="${j}">${val}</${tag}>`;
                }
                html += '</tr>';
            }
            html += '</tbody></table>';
            container.innerHTML = html;
            // Save edits
            container.querySelectorAll('[contenteditable]').forEach(cell => {
                cell.addEventListener('input', e => {
                    const r = parseInt(cell.dataset.row);
                    const c = parseInt(cell.dataset.col);
                    if (!data[r]) data[r] = [];
                    data[r][c] = cell.textContent;
                });
            });
        }

        function getMarkdown() {
            let md = '';
            // Header row
            const header = [];
            for (let j = 0; j < cols; j++) header.push((data[0] && data[0][j]) || `Header ${j+1}`);
            md += '| ' + header.join(' | ') + ' |\n';
            // Separator
            md += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
            // Data rows
            for (let i = 1; i < rows; i++) {
                const row = [];
                for (let j = 0; j < cols; j++) row.push((data[i] && data[i][j]) || '');
                md += '| ' + row.join(' | ') + ' |\n';
            }
            return md;
        }

        // Initial render
        renderTable();

        // Update table on input
        modal.querySelector('#update-table-btn').onclick = () => {
            rows = Math.max(2, Math.min(20, parseInt(modal.querySelector('#table-rows').value)));
            cols = Math.max(2, Math.min(10, parseInt(modal.querySelector('#table-cols').value)));
            // Resize data array
            data = data.slice(0, rows);
            for (let i = 0; i < rows; i++) {
                if (!data[i]) data[i] = [];
                data[i] = data[i].slice(0, cols);
            }
            renderTable();
        };

        // Insert table
        modal.querySelector('#insert-table-btn').onclick = () => {
            const md = getMarkdown();
            this.insertAtCursor(md + '\n');
            modal.remove();
            this.showNotification('Table inserted!', 'success');
        };
    }
    
    setupSmartFeatures() {
        this.setupAutoCompletion();
        this.setupContentTemplates();
        this.setupSmartSuggestions();
    }
    
    setupAutoCompletion() {
        const textarea = this.textarea;
        let autocompleteBox = null;
        
        textarea.addEventListener('input', (e) => {
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = textarea.value.substring(0, cursorPos);
            const currentWord = this.getCurrentWord(textBeforeCursor);
            
            // Remove existing autocomplete box
            if (autocompleteBox) {
                autocompleteBox.remove();
                autocompleteBox = null;
            }
            
            // Check for autocomplete triggers
            const suggestions = this.getAutocompleteSuggestions(currentWord, textBeforeCursor);
            
            if (suggestions.length > 0) {
                autocompleteBox = this.createAutocompleteBox(suggestions, textarea, currentWord);
            }
        });
        
        // Handle keyboard navigation
        textarea.addEventListener('keydown', (e) => {
            if (autocompleteBox) {
                const activeItem = autocompleteBox.querySelector('.autocomplete-item.active');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateAutocomplete(autocompleteBox, 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateAutocomplete(autocompleteBox, -1);
                } else if (e.key === 'Enter' && activeItem) {
                    e.preventDefault();
                    this.selectAutocomplete(activeItem, textarea);
                    autocompleteBox.remove();
                    autocompleteBox = null;
                } else if (e.key === 'Escape') {
                    autocompleteBox.remove();
                    autocompleteBox = null;
                }
            }
        });
        
        // Close autocomplete on blur
        textarea.addEventListener('blur', () => {
            setTimeout(() => {
                if (autocompleteBox) {
                    autocompleteBox.remove();
                    autocompleteBox = null;
                }
            }, 200);
        });
    }
    
    getCurrentWord(text) {
        const words = text.split(/\s/);
        return words[words.length - 1] || '';
    }
    
    getAutocompleteSuggestions(word, context) {
        const suggestions = [];
        
        // Markdown syntax suggestions
        if (word.startsWith('#')) {
            suggestions.push(
                { text: '# Heading 1', replacement: '# Heading 1' },
                { text: '## Heading 2', replacement: '## Heading 2' },
                { text: '### Heading 3', replacement: '### Heading 3' }
            );
        }
        
        // Link suggestions
        if (word.startsWith('[')) {
            suggestions.push(
                { text: '[Link Text](URL)', replacement: '[Link Text](URL)' },
                { text: '[Image Alt](image.jpg)', replacement: '![Image Alt](image.jpg)' }
            );
        }
        
        // List suggestions
        if (word.startsWith('-') || word.startsWith('*')) {
            suggestions.push(
                { text: '- List item', replacement: '- List item' },
                { text: '* Another item', replacement: '* Another item' }
            );
        }
        
        // Code suggestions
        if (word.startsWith('`')) {
            suggestions.push(
                { text: '`inline code`', replacement: '`inline code`' },
                { text: '```\ncode block\n```', replacement: '```\ncode block\n```' }
            );
        }
        
        // Smart suggestions based on context
        const lines = context.split('\n');
        const currentLine = lines[lines.length - 1];
        
        
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }
    
    createAutocompleteBox(suggestions, textarea, currentWord) {
        const box = document.createElement('div');
        box.className = 'autocomplete-box';
        
        const rect = this.getCaretCoordinates(textarea, textarea.selectionStart);
        
        box.style.position = 'absolute';
        box.style.left = rect.x + 'px';
        box.style.top = (rect.y + 20) + 'px';
        box.style.zIndex = '1000';
        
        box.innerHTML = suggestions.map((suggestion, index) => `
            <div class="autocomplete-item ${index === 0 ? 'active' : ''}" data-replacement="${suggestion.replacement}">
                <span class="suggestion-text">${suggestion.text}</span>
            </div>
        `).join('');
        
        // Add click handlers
        box.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectAutocomplete(item, textarea);
                box.remove();
            });
        });
        
        textarea.parentNode.appendChild(box);
        return box;
    }
    
    navigateAutocomplete(box, direction) {
        const items = box.querySelectorAll('.autocomplete-item');
        const activeItem = box.querySelector('.autocomplete-item.active');
        const currentIndex = Array.from(items).indexOf(activeItem);
        
        activeItem.classList.remove('active');
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
        
        items[newIndex].classList.add('active');
    }
    
    selectAutocomplete(item, textarea) {
        const replacement = item.dataset.replacement;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const currentWord = this.getCurrentWord(textBeforeCursor);
        
        const newText = textBeforeCursor.replace(new RegExp(currentWord + '$'), replacement) + 
                       textarea.value.substring(cursorPos);
        
        textarea.value = newText;
        textarea.focus();
        
        const newCursorPos = cursorPos - currentWord.length + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger change event
        textarea.dispatchEvent(new Event('input'));
    }
    
    getCaretCoordinates(element, position) {
        const div = document.createElement('div');
        const styles = getComputedStyle(element);
        const properties = [
            'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
            'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
            'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing'
        ];
        
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        
        properties.forEach(prop => {
            div.style[prop] = styles[prop];
        });
        
        div.textContent = element.value.substring(0, position);
        const span = document.createElement('span');
        span.textContent = element.value.substring(position) || '.';
        div.appendChild(span);
        
        document.body.appendChild(div);
        const coordinates = {
            top: span.offsetTop + parseInt(styles.borderTopWidth) + parseInt(styles.paddingTop),
            left: span.offsetLeft + parseInt(styles.borderLeftWidth) + parseInt(styles.paddingLeft)
        };
        document.body.removeChild(div);
        
        return coordinates;
    }
    
    setupContentTemplates() {
        const templateButton = document.createElement('button');
        templateButton.className = 'toolbar-btn template-btn';
        templateButton.innerHTML = '📋';
        templateButton.title = 'Content Templates';
        templateButton.onclick = () => this.showTemplateSelector();
        
        // Insert after the table button
        const tableButton = this.toolbar.querySelector('.table-btn');
        if (tableButton) {
            tableButton.parentNode.insertBefore(templateButton, tableButton.nextSibling);
        }
    }
    
    showTemplateSelector() {
        const modal = document.createElement('div');
        modal.className = 'template-modal';
        modal.innerHTML = `
            <div class="template-content">
                <div class="template-header">
                    <h3>📋 Content Templates</h3>
                    <button class="close-modal" onclick="this.closest('.template-modal').remove()">×</button>
                </div>
                <div class="template-grid">
                    <div class="template-item" data-template="blog-post">
                        <div class="template-icon">📝</div>
                        <h4>Blog Post</h4>
                        <p>Complete blog post structure</p>
                    </div>
                    <div class="template-item" data-template="tutorial">
                        <div class="template-icon">📚</div>
                        <h4>Tutorial</h4>
                        <p>Step-by-step tutorial format</p>
                    </div>
                    <div class="template-item" data-template="review">
                        <div class="template-icon">⭐</div>
                        <h4>Review</h4>
                        <p>Product or service review</p>
                    </div>
                    <div class="template-item" data-template="newsletter">
                        <div class="template-icon">📧</div>
                        <h4>Newsletter</h4>
                        <p>Email newsletter format</p>
                    </div>
                    <div class="template-item" data-template="documentation">
                        <div class="template-icon">📖</div>
                        <h4>Documentation</h4>
                        <p>Technical documentation</p>
                    </div>
                    <div class="template-item" data-template="meeting-notes">
                        <div class="template-icon">📅</div>
                        <h4>Meeting Notes</h4>
                        <p>Meeting summary template</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click handlers
        modal.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', () => {
                const template = item.dataset.template;
                this.insertTemplate(template);
                modal.remove();
            });
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    insertTemplate(template) {
        const templates = {
            'blog-post': `# Blog Post Title

## Introduction
Start with an engaging introduction that hooks your readers...

## Main Content
Break your content into logical sections with clear headings.

### Key Points
- Point 1
- Point 2
- Point 3

## Conclusion
Wrap up your post with a strong conclusion that reinforces your main message.

---
*Published on [Date] | Tags: [tag1, tag2]*`,
            
            'tutorial': `# Tutorial: [Title]

## Prerequisites
- Requirement 1
- Requirement 2

## Step 1: [First Step]
Detailed instructions for the first step...

## Step 2: [Second Step]
Continue with the next step...

## Step 3: [Third Step]
Final step instructions...

## Summary
What we accomplished and next steps.

## Troubleshooting
Common issues and solutions:
- **Problem 1**: Solution 1
- **Problem 2**: Solution 2`,
            
            'review': `# Review: [Product/Service Name]

## Overview
Brief introduction to what you're reviewing...

## Pros
- ✅ Pro 1
- ✅ Pro 2
- ✅ Pro 3

## Cons
- ❌ Con 1
- ❌ Con 2

## Features
| Feature | Rating | Notes |
|---------|--------|-------|
| Feature 1 | ⭐⭐⭐⭐⭐ | Excellent |
| Feature 2 | ⭐⭐⭐⭐ | Good |
| Feature 3 | ⭐⭐⭐ | Average |

## Verdict
Final recommendation and summary.

**Rating: ⭐⭐⭐⭐☆ (4/5)**`,
            
            'newsletter': `# Newsletter - [Date]

## 🎉 Welcome
Welcome to our newsletter! Here's what's new this week...

## 📰 Latest News
- News item 1
- News item 2
- News item 3

## 🔗 Quick Links
- [Link 1](url1)
- [Link 2](url2)
- [Link 3](url3)

## 📅 Upcoming Events
- **Event 1**: Date and time
- **Event 2**: Date and time

---
*Subscribe | Unsubscribe | Contact Us*`,
            
            'documentation': `# [Feature/API] Documentation

## Overview
Brief description of the feature or API...

## Installation
\`\`\`bash
npm install package-name
\`\`\`

## Usage
\`\`\`javascript
const example = require('package-name');
example.doSomething();
\`\`\`

## API Reference

### Function Name
**Description**: What this function does

**Parameters**:
- \`param1\` (type): Description
- \`param2\` (type): Description

**Returns**: Return type and description

**Example**:
\`\`\`javascript
// Example code here
\`\`\`

## Examples
More detailed examples...

## Troubleshooting
Common issues and solutions.`,
            
            'meeting-notes': `# Meeting Notes - [Topic]

**Date**: [Date]  
**Time**: [Time]  
**Attendees**: [Names]  
**Facilitator**: [Name]

## Agenda
1. Item 1
2. Item 2
3. Item 3

## Discussion Points

### Topic 1
- Point discussed
- Decision made
- Action items

### Topic 2
- Point discussed
- Decision made
- Action items

## Action Items
- [ ] Task 1 - Assigned to: [Name] - Due: [Date]
- [ ] Task 2 - Assigned to: [Name] - Due: [Date]

## Next Meeting
**Date**: [Date]  
**Time**: [Time]  
**Agenda**: [Topics]`
        };
        
        const templateContent = templates[template];
        if (templateContent) {
            const textarea = this.textarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            const before = textarea.value.substring(0, start);
            const after = textarea.value.substring(end);
            
            textarea.value = before + templateContent + after;
            textarea.focus();
            textarea.setSelectionRange(start + templateContent.length, start + templateContent.length);
            
            // Trigger change event
            textarea.dispatchEvent(new Event('input'));
        }
    }
    
    setupSmartSuggestions() {
        // Add smart suggestions based on content analysis
        this.textarea.addEventListener('input', () => {
            setTimeout(() => {
                this.analyzeContentForSuggestions();
            }, 1000);
        });
    }
    
    analyzeContentForSuggestions() {
        const content = this.textarea.value;
        const suggestions = [];
        
        // Check for common issues
        if (content.length > 0) {
            const lines = content.split('\n');
            const headings = lines.filter(line => line.startsWith('#'));
            
            // Suggest table of contents for long posts
            if (headings.length > 3 && content.length > 1000) {
                suggestions.push({
                    type: 'info',
                    message: '💡 Consider adding a table of contents for better navigation',
                    action: () => this.insertTableOfContents(headings)
                });
            }
            
            // Suggest adding images
            if (content.length > 500 && !content.includes('![')) {
                suggestions.push({
                    type: 'info',
                    message: '🖼️ Consider adding images to make your content more engaging',
                    action: null
                });
            }
            
            // Suggest adding links
            if (content.length > 800 && !content.includes('[')) {
                suggestions.push({
                    type: 'info',
                    message: '🔗 Consider adding relevant links to enhance your content',
                    action: null
                });
            }
            
            // Show suggestions if any
            if (suggestions.length > 0) {
                this.showSmartSuggestions(suggestions);
            }
        }
    }
    
    showSmartSuggestions(suggestions) {
        // Remove existing suggestions
        const existing = document.querySelector('.smart-suggestions');
        if (existing) existing.remove();
        
        const container = document.createElement('div');
        container.className = 'smart-suggestions';
        
        container.innerHTML = `
            <div class="suggestions-header">
                <h4>💡 Smart Suggestions</h4>
                <button class="close-suggestions" onclick="this.closest('.smart-suggestions').remove()">×</button>
            </div>
            <div class="suggestions-list">
                ${suggestions.map(suggestion => `
                    <div class="suggestion-item">
                        <span class="suggestion-message">${suggestion.message}</span>
                        ${suggestion.action ? `<button class="suggestion-action" onclick="this.closest('.smart-suggestions').querySelector('.suggestion-action').dispatchEvent(new CustomEvent('applySuggestion', {detail: ${JSON.stringify(suggestion)}}))">Apply</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners for actions
        container.addEventListener('applySuggestion', (e) => {
            e.detail.action();
            container.remove();
        });
        
        // Insert after the editor
        this.textarea.parentNode.parentNode.appendChild(container);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (container.parentNode) {
                container.remove();
            }
        }, 10000);
    }
    
    insertTableOfContents(headings) {
        let toc = '\n## Table of Contents\n\n';
        
        headings.forEach(heading => {
            const level = heading.match(/^#+/)[0].length;
            const text = heading.replace(/^#+\s*/, '');
            const indent = '  '.repeat(level - 1);
            const link = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            toc += `${indent}- [${text}](#${link})\n`;
        });
        
        toc += '\n---\n\n';
        
        // Insert after the first heading
        const textarea = this.textarea;
        const content = textarea.value;
        const firstHeadingIndex = content.indexOf('# ');
        
        if (firstHeadingIndex !== -1) {
            const endOfFirstHeading = content.indexOf('\n', firstHeadingIndex);
            const before = content.substring(0, endOfFirstHeading + 1);
            const after = content.substring(endOfFirstHeading + 1);
            
            textarea.value = before + toc + after;
            textarea.focus();
            
            // Trigger change event
            textarea.dispatchEvent(new Event('input'));
        }
    }
    
    setupExportImport() {
        const exportButton = document.createElement('button');
        exportButton.className = 'toolbar-btn export-btn';
        exportButton.innerHTML = '📤';
        exportButton.title = 'Export/Import';
        exportButton.onclick = () => this.showExportImportMenu();
        
        // Insert after the template button
        const templateButton = this.toolbar.querySelector('.template-btn');
        if (templateButton) {
            templateButton.parentNode.insertBefore(exportButton, templateButton.nextSibling);
        }
    }
    
    showExportImportMenu() {
        const modal = document.createElement('div');
        modal.className = 'export-import-modal';
        modal.innerHTML = `
            <div class="export-import-content">
                <div class="export-import-header">
                    <h3>📤 Export / Import</h3>
                    <button class="close-modal" onclick="this.closest('.export-import-modal').remove()">×</button>
                </div>
                
                <div class="export-import-tabs">
                    <button class="tab-btn active" data-tab="export">Export</button>
                    <button class="tab-btn" data-tab="import">Import</button>
                </div>
                
                <div class="tab-content active" id="export-tab">
                    <div class="export-options">
                        <h4>Export Format</h4>
                        <div class="format-options">
                            <label class="format-option">
                                <input type="radio" name="export-format" value="markdown" checked>
                                <div class="format-card">
                                    <div class="format-icon">📝</div>
                                    <h5>Markdown</h5>
                                    <p>Plain markdown file</p>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="export-format" value="html">
                                <div class="format-card">
                                    <div class="format-icon">🌐</div>
                                    <h5>HTML</h5>
                                    <p>Rendered HTML file</p>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="export-format" value="pdf">
                                <div class="format-card">
                                    <div class="format-icon">📄</div>
                                    <h5>PDF</h5>
                                    <p>Printable PDF document</p>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="export-format" value="docx">
                                <div class="format-card">
                                    <div class="format-icon">📋</div>
                                    <h5>Word</h5>
                                    <p>Microsoft Word document</p>
                                </div>
                            </label>
                        </div>
                        
                        <div class="export-settings">
                            <label class="checkbox-label">
                                <input type="checkbox" id="include-metadata" checked> Include metadata
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="include-styles"> Include custom styles
                            </label>
                        </div>
                        
                        <button class="btn btn-primary" onclick="this.closest('.export-import-modal').querySelector('.export-options').exportContent()">Export Content</button>
                    </div>
                </div>
                
                <div class="tab-content" id="import-tab">
                    <div class="import-options">
                        <h4>Import Content</h4>
                        
                        <div class="import-methods">
                            <div class="import-method">
                                <h5>📁 Upload File</h5>
                                <input type="file" id="import-file" accept=".md,.txt,.html,.docx,.pdf" style="display: none;">
                                <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">Choose File</button>
                                <p>Supported: Markdown, HTML, Word, PDF</p>
                            </div>
                            
                            <div class="import-method">
                                <h5>📋 Paste Content</h5>
                                <textarea id="import-text" placeholder="Paste your content here..." rows="6"></textarea>
                                <button class="btn btn-secondary" onclick="this.closest('.export-import-modal').querySelector('.import-options').importFromText()">Import Text</button>
                            </div>
                            
                            <div class="import-method">
                                <h5>🔗 Import from URL</h5>
                                <input type="url" id="import-url" placeholder="https://example.com/content" class="url-input">
                                <button class="btn btn-secondary" onclick="this.closest('.export-import-modal').querySelector('.import-options').importFromURL()">Import from URL</button>
                            </div>
                        </div>
                        
                        <div class="import-settings">
                            <label class="checkbox-label">
                                <input type="checkbox" id="replace-content"> Replace current content
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="preserve-formatting" checked> Preserve formatting
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup tabs
        this.setupExportImportTabs(modal);
        
        // Setup file input
        this.setupFileImport(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    setupExportImportTabs(modal) {
        const tabs = modal.querySelectorAll('.tab-btn');
        const contents = modal.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    setupFileImport(modal) {
        const fileInput = modal.querySelector('#import-file');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileImport(file);
            }
        });
    }
    
    exportContent() {
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeMetadata = document.getElementById('include-metadata').checked;
        const includeStyles = document.getElementById('include-styles').checked;
        
        const content = this.textarea.value;
        let exportData = '';
        let filename = 'content';
        let mimeType = 'text/plain';
        
        switch (format) {
            case 'markdown':
                exportData = this.exportAsMarkdown(content, includeMetadata);
                filename += '.md';
                break;
                
            case 'html':
                exportData = this.exportAsHTML(content, includeStyles);
                filename += '.html';
                mimeType = 'text/html';
                break;
                
            case 'pdf':
                this.exportAsPDF(content, includeStyles);
                return; // PDF export is handled separately
                
            case 'docx':
                this.exportAsDOCX(content, includeStyles);
                return; // DOCX export is handled separately
        }
        
        // Create and download file
        const blob = new Blob([exportData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Content exported successfully!', 'success');
    }
    
    exportAsMarkdown(content, includeMetadata) {
        let markdown = content;
        
        if (includeMetadata) {
            const metadata = `---
title: Exported Content
date: ${new Date().toISOString()}
exported_from: Meditor
---

`;
            markdown = metadata + markdown;
        }
        
        return markdown;
    }
    
    exportAsHTML(content, includeStyles) {
        const htmlContent = this.markdownToHTML(content);
        const styles = includeStyles ? this.getCustomStyles() : '';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Content</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        ${styles}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    }
    
    getCustomStyles() {
        return `
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        h1 { font-size: 2.5em; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        p { margin-bottom: 1em; }
        code { 
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre { 
            background: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #007acc;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
        ul, ol { padding-left: 20px; }
        img { max-width: 100%; height: auto; }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        th { background: #f8f8f8; }
        `;
    }
    
    exportAsPDF(content, includeStyles) {
        // For PDF export, we'll use a simple approach with print
        const htmlContent = this.exportAsHTML(content, includeStyles);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
        
        this.showNotification('PDF export opened in print dialog', 'info');
    }
    
    exportAsDOCX(content, includeStyles) {
        // For DOCX, we'll create a simple HTML file that can be opened in Word
        const htmlContent = this.exportAsHTML(content, includeStyles);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'content.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('HTML file created - open in Word to convert to DOCX', 'info');
    }
    
    handleFileImport(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.importContent(content, file.name);
        };
        reader.readAsText(file);
    }
    
    importFromText() {
        const text = document.getElementById('import-text').value;
        if (text.trim()) {
            this.importContent(text, 'pasted content');
        }
    }
    
    importFromURL() {
        const url = document.getElementById('import-url').value;
        if (url) {
            this.showNotification('Importing from URL...', 'info');
            // This would require a backend endpoint to fetch content
            // For now, we'll show a placeholder
            this.showNotification('URL import requires backend implementation', 'warning');
        }
    }
    
    importContent(content, source) {
        const replaceContent = document.getElementById('replace-content').checked;
        const preserveFormatting = document.getElementById('preserve-formatting').checked;
        
        if (replaceContent) {
            this.textarea.value = content;
        } else {
            const currentContent = this.textarea.value;
            const separator = currentContent && currentContent.trim() ? '\n\n' : '';
            this.textarea.value = currentContent + separator + content;
        }
        
        // Trigger change event
        this.textarea.dispatchEvent(new Event('input'));
        
        this.showNotification(`Content imported from ${source}`, 'success');
        
        // Close modal
        document.querySelector('.export-import-modal').remove();
    }
    
    async showSnippetsLibrary() {
        const modal = document.createElement('div');
        modal.className = 'meditor-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📚 Snippets Library</h3>
                    <button class="close-btn" onclick="this.closest('.meditor-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="snippets-container">
                        <div class="snippets-list">
                            <div class="loading">Loading snippets...</div>
                        </div>
                        <div class="snippet-preview">
                            <h4>Preview</h4>
                            <div class="preview-content"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.meditor-modal').remove()">Cancel</button>
                    <button class="btn btn-primary insert-snippet-btn" disabled>Insert Snippet</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load snippets
        const snippetsList = modal.querySelector('.snippets-list');
        const previewContent = modal.querySelector('.preview-content');
        const insertBtn = modal.querySelector('.insert-snippet-btn');
        let selectedSnippet = null;
        
        try {
            const snippetsHtml = await this.getSnippetsList();
            snippetsList.innerHTML = snippetsHtml;
        } catch (error) {
            snippetsList.innerHTML = '<div class="error">Error loading snippets</div>';
        }
        
        // Handle snippet selection
        snippetsList.addEventListener('click', (e) => {
            const snippetItem = e.target.closest('.snippet-item');
            if (snippetItem) {
                // Remove previous selection
                snippetsList.querySelectorAll('.snippet-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select current item
                snippetItem.classList.add('selected');
                selectedSnippet = snippetItem.dataset.snippet;
                
                // Show preview
                previewContent.textContent = selectedSnippet;
                insertBtn.disabled = false;
            }
        });
        
        // Handle insert
        insertBtn.addEventListener('click', () => {
            if (selectedSnippet) {
                this.insertAtCursor(selectedSnippet);
                modal.remove();
                this.showNotification('Snippet inserted!', 'success');
            }
        });
    }
    
    async getSnippetsList() {
        try {
            // Fetch snippets from Django backend
            const response = await fetch('/meditor/snippets/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.snippets) {
                    return this.renderSnippetsList(data.snippets);
                }
            }
            
            // Fallback to default snippets if API fails
            this.showNotification('Could not load snippets from server, using defaults', 'warning');
            return this.getDefaultSnippetsList();
            
        } catch (error) {
            console.error('Error loading snippets:', error);
            this.showNotification('Could not load snippets from server, using defaults', 'warning');
            return this.getDefaultSnippetsList();
        }
    }
    
    renderSnippetsList(snippets) {
        if (snippets.length === 0) {
            return `
                <div class="no-snippets">
                    <p>No snippets found. Create your first snippet!</p>
                </div>
            `;
        }
        
        return snippets.map(snippet => `
            <div class="snippet-item" data-snippet="${snippet.content.replace(/"/g, '&quot;')}" data-id="${snippet.id}">
                <div class="snippet-header">
                    <div class="snippet-name">${snippet.name}</div>
                    <div class="snippet-category">${snippet.category || 'General'}</div>
                </div>
                <div class="snippet-preview-text">${snippet.preview}</div>
                <div class="snippet-meta">
                    <small>${snippet.is_owner ? 'Your snippet' : 'Public snippet'}</small>
                </div>
            </div>
        `).join('');
    }
    
    getDefaultSnippetsList() {
        const snippets = [
            { name: 'Code Block', content: '```\n// Your code here\n```' },
            { name: 'Link', content: '[Link Text](https://example.com)' },
            { name: 'Image', content: '![Alt Text](image-url.jpg)' },
            { name: 'Blockquote', content: '> This is a blockquote' },
            { name: 'Table', content: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |' },
            { name: 'Horizontal Rule', content: '---' },
            { name: 'Task List', content: '- [ ] Task 1\n- [x] Task 2' },
            { name: 'Footnote', content: 'Here is a sentence with a footnote[^1].\n\n[^1]: This is the footnote.' }
        ];
        
        return snippets.map(snippet => `
            <div class="snippet-item" data-snippet="${snippet.content.replace(/"/g, '&quot;')}">
                <div class="snippet-name">${snippet.name}</div>
                <div class="snippet-preview-text">${snippet.content.substring(0, 50)}${snippet.content.length > 50 ? '...' : ''}</div>
            </div>
        `).join('');
    }
    
    showSaveSnippetModal() {
        const modal = document.createElement('div');
        modal.className = 'meditor-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💾 Save as Snippet</h3>
                    <button class="close-btn" onclick="this.closest('.meditor-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="snippet-name">Snippet Name:</label>
                        <input type="text" id="snippet-name" class="form-control" placeholder="Enter snippet name">
                    </div>
                    <div class="form-group">
                        <label for="snippet-category">Category (optional):</label>
                        <input type="text" id="snippet-category" class="form-control" placeholder="e.g., Code, Templates, etc.">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="snippet-public"> Make this snippet public (available to all users)
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="snippet-content">Content:</label>
                        <textarea id="snippet-content" class="form-control" rows="6" readonly>${this.textarea.value}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.meditor-modal').remove()">Cancel</button>
                    <button class="btn btn-primary save-snippet-btn">Save Snippet</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle save
        const saveBtn = modal.querySelector('.save-snippet-btn');
        const nameInput = modal.querySelector('#snippet-name');
        const categoryInput = modal.querySelector('#snippet-category');
        const publicCheckbox = modal.querySelector('#snippet-public');
        
        saveBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const content = this.textarea.value;
            const category = categoryInput.value.trim();
            const isPublic = publicCheckbox.checked;
            
            if (name && content) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
                
                await this.saveSnippet(name, content, category, isPublic);
                
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Snippet';
                modal.remove();
            } else {
                this.showNotification('Please enter a name for the snippet', 'error');
            }
        });
    }
    
    async saveSnippet(name, content, category = '', isPublic = false) {
        try {
            const response = await fetch('/meditor/snippets/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    name: name,
                    content: content,
                    category: category,
                    is_public: isPublic
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showNotification('Snippet saved successfully!', 'success');
                    return data.snippet;
                } else {
                    this.showNotification('Failed to save snippet: ' + data.error, 'error');
                }
            } else {
                this.showNotification('Failed to save snippet: HTTP ' + response.status, 'error');
            }
        } catch (error) {
            console.error('Error saving snippet:', error);
            this.showNotification('Failed to save snippet: ' + error.message, 'error');
        }
    }
    
    showLinkModal() {
        const selection = this.getSelection();
        let linkText = '';
        
        if (selection.text) {
            // If text is selected, use it as the link text
            linkText = selection.text;
        } else {
            // Otherwise prompt for link text
            linkText = prompt('Link text:');
            if (!linkText) return;
        }
        
        const linkUrl = prompt('URL:');
        if (linkUrl) {
            this.insertAtCursor(`[${linkText}](${linkUrl})`);
            this.showNotification('Link created successfully', 'success');
        }
    }
    
    showImageModal() {
        const altText = prompt('Alt text:');
        if (altText) {
            const imageUrl = prompt('Image URL:');
            if (imageUrl) {
                this.insertAtCursor(`![${altText}](${imageUrl})`);
            }
        }
    }
    
    showHtmlToMarkdownModal() {
        const htmlContent = prompt('Paste HTML content:');
        if (htmlContent) {
            this.convertHtmlToMarkdown(htmlContent);
        }
    }
    
    async convertHtmlToMarkdown(htmlContent) {
        try {
            // Simple HTML to Markdown conversion
            let markdown = htmlContent
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
                    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
                })
                .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                    let counter = 1;
                    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
                })
                .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```')
                .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n')
                .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
                .trim();
            
            this.insertAtCursor(markdown);
            this.showNotification('HTML converted to Markdown!', 'success');
        } catch (error) {
            this.showNotification('Error converting HTML: ' + error.message, 'error');
        }
    }
    
    togglePreview() {
        if (this.previewDiv.style.display === 'none' || !this.previewDiv.style.display) {
            this.previewDiv.style.display = 'block';
            this.updatePreview();
        } else {
            this.previewDiv.style.display = 'none';
        }
    }
    
    updatePreview() {
        const markdownText = this.textarea.value;
        const htmlContent = this.convertMarkdownToHtml(markdownText);
        this.previewContent.innerHTML = htmlContent;
        
        // Highlight code blocks
        if (typeof hljs !== 'undefined') {
            this.previewContent.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }
    
    showFullscreenPreview() {
        const content = this.textarea.value;
        const htmlContent = this.convertMarkdownToHtml(content);
        
        const fullscreenWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        fullscreenWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Fullscreen Preview</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 40px;
                        background: #fff;
                    }
                    h1, h2, h3, h4, h5, h6 { 
                        margin-top: 1.5em;
                        margin-bottom: 0.5em;
                        font-weight: 600;
                    }
                    h1 { font-size: 2.5em; }
                    h2 { font-size: 2em; }
                    h3 { font-size: 1.5em; }
                    p { margin-bottom: 1em; }
                    code { 
                        background: #f4f4f4;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: 'Courier New', monospace;
                    }
                    pre { 
                        background: #f8f8f8;
                        padding: 15px;
                        border-radius: 5px;
                        overflow-x: auto;
                        border-left: 4px solid #007acc;
                    }
                    blockquote {
                        border-left: 4px solid #ddd;
                        margin: 0;
                        padding-left: 20px;
                        color: #666;
                    }
                    ul, ol { padding-left: 20px; }
                    img { max-width: 100%; height: auto; }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1em 0;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th { background: #f8f8f8; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `);
        fullscreenWindow.document.close();
    }
    
    openSitePreview() {
        // For unsaved content, create a simple HTML preview
        const content = this.textarea.value;
        const title = this.getTitleFromContent();
        const htmlContent = this.convertMarkdownToHtml(content);
        
        // Create a new window with the content styled like the site
        const previewWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - Preview</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background: #fff;
                    }
                    .preview-header {
                        background: #f8f9fa;
                        border-bottom: 1px solid #dee2e6;
                        padding: 20px;
                        text-align: center;
                    }
                    .preview-header h1 {
                        margin: 0;
                        color: #495057;
                        font-size: 1.5em;
                    }
                    .preview-content {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    h1, h2, h3, h4, h5, h6 { 
                        margin-top: 1.5em;
                        margin-bottom: 0.5em;
                        font-weight: 600;
                        color: #212529;
                    }
                    h1 { font-size: 2.5em; }
                    h2 { font-size: 2em; }
                    h3 { font-size: 1.5em; }
                    p { margin-bottom: 1em; }
                    code { 
                        background: #f4f4f4;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: 'Courier New', monospace;
                        font-size: 0.9em;
                    }
                    pre { 
                        background: #f8f8f8;
                        padding: 15px;
                        border-radius: 5px;
                        overflow-x: auto;
                        border-left: 4px solid #007acc;
                        margin: 1em 0;
                    }
                    pre code {
                        background: none;
                        padding: 0;
                        border-radius: 0;
                    }
                    blockquote {
                        border-left: 4px solid #ddd;
                        margin: 1em 0;
                        padding-left: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    ul, ol { 
                        padding-left: 20px;
                        margin: 1em 0;
                    }
                    li {
                        margin-bottom: 0.5em;
                    }
                    img { 
                        max-width: 100%; 
                        height: auto;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1em 0;
                        border: 1px solid #dee2e6;
                    }
                    th, td {
                        border: 1px solid #dee2e6;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th { 
                        background: #f8f8f8;
                        font-weight: 600;
                    }
                    a {
                        color: #007bff;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    hr {
                        border: none;
                        border-top: 1px solid #dee2e6;
                        margin: 2em 0;
                    }
                    .preview-notice {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 10px;
                        border-radius: 4px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="preview-header">
                    <h1>${title}</h1>
                    <div class="preview-notice">📝 This is a preview of unsaved content</div>
                </div>
                <div class="preview-content">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
        
        this.showNotification('Preview opened in new tab', 'success');
    }
    
    getTitleFromContent() {
        const lines = this.textarea.value.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('# ')) {
                return line.substring(2);
            }
        }
        return 'Untitled';
    }
    
    getPreviewUrl() {
        // For saved posts, we could return the actual preview URL
        // For now, we'll use the form submission approach
        return null;
    }
    
    convertMarkdownToHtml(markdownText) {
        // Simple markdown to HTML conversion
        let html = markdownText
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            
            // Strikethrough
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            
            // Code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            
            // Links (with target="_blank")
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            
            // Lists
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
            
            // Wrap lists
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            
            // Blockquotes
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            
            // Horizontal rules
            .replace(/^---$/gim, '<hr>')
            .replace(/^\*\*\*$/gim, '<hr>')
            
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1')
            .replace(/<p>(<ol>.*<\/ol>)<\/p>/g, '$1')
            .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1')
            .replace(/<p>(<hr>)<\/p>/g, '$1')
            .replace(/<p>(<pre>.*<\/pre>)<\/p>/g, '$1');
        
        return html;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `meditor-notification meditor-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

class TableEditor {
    constructor(modal) {
        this.modal = modal;
        this.container = modal.querySelector('#table-container');
        this.rows = 3;
        this.cols = 3;
        this.data = [];
        this.style = 'default';
        this.color = 'blue';
        this.features = {
            sortable: false,
            filterable: false,
            paginated: false,
            searchable: false
        };
    }
    
    init() {
        this.updateTable();
        this.updateColumnSettings();
    }
    
    updateTable() {
        this.rows = parseInt(this.modal.querySelector('#table-rows').value);
        this.cols = parseInt(this.modal.querySelector('#table-cols').value);
        
        // Initialize data if empty
        if (this.data.length === 0) {
            this.data = [];
            for (let i = 0; i < this.rows; i++) {
                this.data[i] = [];
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] = i === 0 ? `Header ${j + 1}` : `Cell ${i}-${j}`;
                }
            }
        }
        
        this.renderTable();
    }
    
    renderTable() {
        let html = '<table class="editable-table">';
        
        for (let i = 0; i < this.rows; i++) {
            html += '<tr>';
            for (let j = 0; j < this.cols; j++) {
                const isHeader = i === 0;
                const tag = isHeader ? 'th' : 'td';
                const content = this.data[i] && this.data[i][j] ? this.data[i][j] : '';
                
                html += `<${tag} contenteditable="true" data-row="${i}" data-col="${j}">${content}</${tag}>`;
            }
            html += '</tr>';
        }
        
        html += '</table>';
        this.container.innerHTML = html;
        
        // Add event listeners
        this.container.querySelectorAll('[contenteditable]').forEach(cell => {
            cell.addEventListener('input', (e) => {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                if (!this.data[row]) this.data[row] = [];
                this.data[row][col] = e.target.textContent;
            });
        });
    }
    
    updateColumnSettings() {
        const container = this.modal.querySelector('#column-settings');
        let html = '';
        
        for (let i = 0; i < this.cols; i++) {
            html += `
                <div class="column-setting">
                    <label>Column ${i + 1}:</label>
                    <select class="column-type" data-col="${i}">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                    </select>
                    <label class="checkbox-label">
                        <input type="checkbox" class="column-sortable" data-col="${i}"> Sortable
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" class="column-filterable" data-col="${i}"> Filterable
                    </label>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    importCSV() {
        const csvData = this.modal.querySelector('#csv-data').value;
        if (!csvData.trim()) return;
        
        const lines = csvData.trim().split('\n');
        this.data = lines.map(line => 
            line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        );
        
        this.rows = this.data.length;
        this.cols = this.data[0] ? this.data[0].length : 0;
        
        this.modal.querySelector('#table-rows').value = this.rows;
        this.modal.querySelector('#table-cols').value = this.cols;
        
        this.renderTable();
        this.updateColumnSettings();
    }
    
    updateTableStyle() {
        this.style = this.modal.querySelector('#table-style').value;
        this.color = this.modal.querySelector('.color-option.selected')?.dataset.color || 'blue';
        
        // Update features
        this.features.sortable = this.modal.querySelector('#table-sortable').checked;
        this.features.filterable = this.modal.querySelector('#table-filterable').checked;
        this.features.paginated = this.modal.querySelector('#table-paginated').checked;
        this.features.searchable = this.modal.querySelector('#table-searchable').checked;
    }
    
    updatePreview() {
        const container = this.modal.querySelector('#table-preview-container');
        const markdown = this.generateMarkdown();
        container.innerHTML = `<div class="markdown-preview">${markdown}</div>`;
    }
    
    generateMarkdown() {
        let markdown = '';
        
        // Add table features if enabled
        if (this.features.searchable || this.features.sortable || this.features.filterable) {
            markdown += '<!-- table-features: ' + JSON.stringify(this.features) + ' -->\n';
        }
        
        // Add table style
        if (this.style !== 'default') {
            markdown += `<!-- table-style: ${this.style} -->\n`;
        }
        
        // Add color theme
        if (this.color !== 'blue') {
            markdown += `<!-- table-color: ${this.color} -->\n`;
        }
        
        // Generate table
        for (let i = 0; i < this.rows; i++) {
            const row = this.data[i] || [];
            const cells = row.map(cell => cell || '').join(' | ');
            markdown += `| ${cells} |\n`;
            
            // Add header separator after first row
            if (i === 0) {
                const separator = row.map(() => '---').join(' | ');
                markdown += `| ${separator} |\n`;
            }
        }
        
        return markdown;
    }
    
    insertTable() {
        const markdown = this.generateMarkdown();
        const textarea = this.modal.closest('.rich-markdown-editor').querySelector('textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        
        textarea.value = before + '\n\n' + markdown + '\n\n' + after;
        textarea.focus();
        textarea.setSelectionRange(start + markdown.length + 4, start + markdown.length + 4);
        
        // Trigger change event
        textarea.dispatchEvent(new Event('input'));
        
        this.modal.remove();
    }
}

// Initialize all markdown editors
document.addEventListener('DOMContentLoaded', function() {
    const editors = document.querySelectorAll('.markdown-editor-container');
    editors.forEach(container => {
        const fieldName = container.querySelector('.markdown-toolbar').dataset.field;
        new RichMarkdownEditor(fieldName);
    });
}); 