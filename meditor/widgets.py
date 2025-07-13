from django import forms
from django.utils.safestring import mark_safe
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.urls import path
import markdown
import re
from bs4 import BeautifulSoup
import html2text

class RichMarkdownWidget(forms.Textarea):
    """Enhanced markdown widget with toolbar, rich editing, and HTML conversion"""
    
    def __init__(self, attrs=None, auto_convert_html=True):
        default_attrs = {
            'class': 'rich-markdown-editor',
            'rows': 20,
            'style': 'width: 100%; font-family: monospace;'
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)
        self.auto_convert_html = auto_convert_html
    
    class Media:
        css = {
            'all': ('meditor/css/rich-markdown-editor.css',)
        }
        js = ('meditor/js/rich-markdown-editor.js',)
    
    def render(self, name, value, attrs=None, renderer=None):
        # Render the textarea first
        textarea_html = super().render(name, value, attrs, renderer)
        
        # Build the complete output with toolbar above textarea
        output = f'''
        <div class="markdown-editor-container">
            <div class="markdown-toolbar" data-field="{name}" data-auto-convert-html="{str(self.auto_convert_html).lower()}">
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)">B</button>
                    <button type="button" class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)">I</button>
                    <button type="button" class="toolbar-btn" data-action="strikethrough" title="Strikethrough">S</button>
                </div>
                
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="h1" title="Heading 1">H1</button>
                    <button type="button" class="toolbar-btn" data-action="h2" title="Heading 2">H2</button>
                    <button type="button" class="toolbar-btn" data-action="h3" title="Heading 3">H3</button>
                </div>
                
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="link" title="Insert Link">🔗</button>
                    <button type="button" class="toolbar-btn" data-action="image" title="Insert Image">🖼️</button>
                    <button type="button" class="toolbar-btn" data-action="code" title="Inline Code">`</button>
                    <button type="button" class="toolbar-btn" data-action="codeblock" title="Code Block">```</button>
                </div>
                
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="ul" title="Unordered List">•</button>
                    <button type="button" class="toolbar-btn" data-action="ol" title="Ordered List">1.</button>
                    <button type="button" class="toolbar-btn" data-action="blockquote" title="Blockquote">"</button>
                </div>
                
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="table" title="Insert Table">⊞</button>
                    <button type="button" class="toolbar-btn" data-action="hr" title="Horizontal Rule">—</button>
                </div>
                
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" data-action="html2md" title="Convert HTML to Markdown">⇄</button>
                    <button type="button" class="toolbar-btn preview-toggle" data-action="preview" title="Toggle Preview">👁️</button>
                    <button type="button" class="toolbar-btn" data-action="fullscreen" title="Fullscreen Preview">⛶</button>
                    <button type="button" class="toolbar-btn live-preview-btn" data-action="live_preview" title="Live Preview" style="background: #ffc107; color: #212529;">⚡</button>
                    <button type="button" class="toolbar-btn site-preview-btn" data-action="site_preview" title="Preview on Site" style="background: #28a745; color: white;">👀</button>
                </div>
            </div>
            
            {textarea_html}
        </div>
        
        <div id="preview-{name}" class="markdown-preview" style="display: none;">
            <div class="preview-content"></div>
        </div>
        
        <div id="link-modal-{name}" class="modal" style="display: none;">
            <div class="modal-content">
                <h3>Insert Link</h3>
                <div class="form-group">
                    <label>Text:</label>
                    <input type="text" id="link-text-{name}" placeholder="Link text">
                </div>
                <div class="form-group">
                    <label>URL:</label>
                    <input type="url" id="link-url-{name}" placeholder="https://example.com">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="insertLink('{name}')">Insert</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('{name}')">Cancel</button>
                </div>
            </div>
        </div>
        
        <div id="image-modal-{name}" class="modal" style="display: none;">
            <div class="modal-content">
                <h3>Insert Image</h3>
                <div class="form-group">
                    <label>Alt Text:</label>
                    <input type="text" id="image-alt-{name}" placeholder="Image description">
                </div>
                <div class="form-group">
                    <label>URL:</label>
                    <input type="url" id="image-url-{name}" placeholder="https://example.com/image.jpg">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="insertImage('{name}')">Insert</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('{name}')">Cancel</button>
                </div>
            </div>
        </div>
        '''
        return mark_safe(output) 