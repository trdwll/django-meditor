"""
Configurable markdown extensions for django-meditor
Allows custom HTML generation for specific markdown patterns
"""
import re
from django.template.loader import render_to_string
from django.conf import settings
from typing import Dict, List, Any, Optional
from django.utils.safestring import mark_safe


class MarkdownExtension:
    """Base class for markdown extensions"""
    
    def __init__(self, pattern: str, template_name: str, name: str = None):
        self.pattern = re.compile(pattern, re.DOTALL)
        self.template_name = template_name
        self.name = name or template_name
    
    def extract_data(self, match) -> Dict[str, Any]:
        """Extract data from the markdown match. Override in subclasses."""
        return {'content': match.group(1)}
    
    def render(self, match) -> str:
        """Render the extension to HTML"""
        try:
            data = self.extract_data(match)
            return render_to_string(self.template_name, data)
        except Exception as e:
            # Fallback to simple div if template fails
            return f'<div class="markdown-extension {self.name}-extension" data-error="{str(e)}">{match.group(0)}</div>'


class GalleryExtension(MarkdownExtension):
    """Gallery extension for embedding multiple images"""
    
    def __init__(self):
        super().__init__(
            pattern=r'\{\{gallery\}\}(.*?)\{\{/gallery\}\}',
            template_name='meditor/extensions/gallery.html',
            name='gallery'
        )
    
    def extract_data(self, match) -> Dict[str, Any]:
        """Extract image URLs from gallery content"""
        content = match.group(1).strip()
        
        # Extract image URLs from markdown image syntax ![alt](url)
        image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        images = []
        
        for img_match in re.finditer(image_pattern, content):
            alt_text = img_match.group(1)
            image_url = img_match.group(2)
            images.append({
                'url': image_url,
                'alt': alt_text or 'Gallery image'
            })
        
        return {
            'images': images,
            'count': len(images),
            'raw_content': content
        }


class CodeBlockExtension(MarkdownExtension):
    """Code block extension with syntax highlighting"""
    
    def __init__(self):
        super().__init__(
            pattern=r'\{\{code:([^}]+)\}\}(.*?)\{\{/code\}\}',
            template_name='meditor/extensions/code_block.html',
            name='code_block'
        )
    
    def extract_data(self, match) -> Dict[str, Any]:
        """Extract language and code content"""
        language = match.group(1).strip()
        code_content = match.group(2).strip()
        
        return {
            'language': language,
            'code': code_content,
            'lines': len(code_content.split('\n'))
        }


class QuoteExtension(MarkdownExtension):
    """Quote extension with attribution"""
    
    def __init__(self):
        super().__init__(
            pattern=r'\{\{quote:([^}]+)\}\}(.*?)\{\{/quote\}\}',
            template_name='meditor/extensions/quote.html',
            name='quote'
        )
    
    def extract_data(self, match) -> Dict[str, Any]:
        """Extract quote content and attribution"""
        attribution = match.group(1).strip()
        quote_content = match.group(2).strip()
        
        return {
            'content': quote_content,
            'attribution': attribution
        }


class AlertExtension(MarkdownExtension):
    """Alert extension for info, warning, error messages"""
    
    def __init__(self):
        super().__init__(
            pattern=r'\{\{alert:([^}]+)\}\}(.*?)\{\{/alert\}\}',
            template_name='meditor/extensions/alert.html',
            name='alert'
        )
    
    def extract_data(self, match) -> Dict[str, Any]:
        """Extract alert type and content"""
        alert_type = match.group(1).strip().lower()
        content = match.group(2).strip()
        
        return {
            'type': alert_type,
            'content': content,
            'icon': self._get_icon(alert_type)
        }
    
    def _get_icon(self, alert_type: str) -> str:
        """Get appropriate icon for alert type"""
        icons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'tip': '💡'
        }
        return icons.get(alert_type, 'ℹ️')


class MarkdownProcessor:
    """Main processor for custom markdown extensions"""
    
    def __init__(self):
        self.extensions = self._load_extensions()
    
    def _load_extensions(self) -> List[MarkdownExtension]:
        """Load extensions from settings or use defaults"""
        custom_extensions = getattr(settings, 'MEDITOR_CUSTOM_EXTENSIONS', [])
        extensions = []
        
        # Add built-in extensions
        extensions.extend([
            GalleryExtension(),
            CodeBlockExtension(),
            QuoteExtension(),
            AlertExtension(),
        ])
        
        # Add custom extensions from settings
        for ext_config in custom_extensions:
            if isinstance(ext_config, dict):
                ext = self._create_extension_from_config(ext_config)
                if ext:
                    extensions.append(ext)
            elif isinstance(ext_config, str):
                # Import custom extension class
                from django.utils.module_loading import import_string
                try:
                    ext_class = import_string(ext_config)
                    extensions.append(ext_class())
                except (ImportError, AttributeError) as e:
                    print(f"Failed to load extension {ext_config}: {e}")
        
        return extensions
    
    def _create_extension_from_config(self, config: Dict[str, Any]) -> Optional[MarkdownExtension]:
        """Create extension from configuration dictionary"""
        try:
            pattern = config.get('pattern')
            template = config.get('template')
            name = config.get('name', template)
            
            if not pattern or not template:
                return None
            
            return MarkdownExtension(pattern, template, name)
        except Exception as e:
            print(f"Failed to create extension from config {config}: {e}")
            return None
    
    def process(self, markdown_content: str) -> str:
        """Process markdown content and replace custom extensions with HTML"""
        processed_content = markdown_content
        
        for extension in self.extensions:
            processed_content = extension.pattern.sub(extension.render, processed_content)
        
        return processed_content


# Global processor instance
markdown_processor = MarkdownProcessor()


def process_markdown_extensions(content: str) -> str:
    """Convenience function to process markdown extensions"""
    return markdown_processor.process(content) 