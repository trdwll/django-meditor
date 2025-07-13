from django import template
from django.utils.safestring import mark_safe
import markdown
from markdown.extensions import codehilite, toc, tables, fenced_code
import re

register = template.Library()

class HighlightExtension(markdown.Extension):
    """Custom extension to add highlight.js classes to code blocks"""
    
    def extendMarkdown(self, md):
        # Override the fenced_code processor to add highlight.js classes
        md.registerExtension(self)
        
        # Find and replace the fenced_code processor
        for i, processor in enumerate(md.parser.blockprocessors):
            if hasattr(processor, 'FENCED_BLOCK_RE'):
                # This is the fenced code processor
                old_processor = processor
                break
        else:
            return
        
        # Create a new processor that adds highlight.js classes
        class HighlightFencedCodeProcessor(old_processor.__class__):
            def run(self, parent, blocks):
                # Call the original processor
                result = old_processor.run(parent, blocks)
                
                # Add highlight.js classes to code blocks
                for element in parent.findall('.//code'):
                    if element.get('class'):
                        # Add hljs class to existing classes
                        classes = element.get('class').split()
                        if 'hljs' not in classes:
                            classes.append('hljs')
                        element.set('class', ' '.join(classes))
                    else:
                        # Set hljs class if no class exists
                        element.set('class', 'hljs')
                
                return result
        
        # Replace the processor
        for i, processor in enumerate(md.parser.blockprocessors):
            if processor == old_processor:
                md.parser.blockprocessors[i] = HighlightFencedCodeProcessor(md.parser)
                break

@register.filter(name='markdown_to_html')
def markdown_to_html(value):
    """Convert markdown text to HTML with syntax highlighting"""
    if not value:
        return ''
    
    # Configure markdown with extensions
    md = markdown.Markdown(extensions=[
        'markdown.extensions.toc',
        'markdown.extensions.tables',
        'markdown.extensions.fenced_code',
        'markdown.extensions.codehilite',
        'markdown.extensions.nl2br',
        'markdown.extensions.sane_lists',
        HighlightExtension()
    ])
    
    # Convert markdown to HTML
    html = md.convert(value)
    
    # Add target="_blank" to all links
    html = re.sub(
        r'<a([^>]*)href="([^"]*)"([^>]*)>',
        r'<a\1href="\2"\3 target="_blank" rel="noopener noreferrer">',
        html
    )
    
    # Add highlight.js classes to code blocks
    html = re.sub(
        r'<pre><code(?: class="([^"]*)")?>',
        r'<pre><code class="hljs \1"',
        html
    )
    
    return mark_safe(html) 


@register.filter(name='markdown_reading_time')
def markdown_reading_time(value):
    """Calculate reading time for markdown content"""
    if not value:
        return "0 min read"
    
    # Count words in markdown content
    words = len(value.split())
    
    # Average reading speed of 200 words per minute
    minutes = words / 200
    
    # Round to nearest minute, minimum 1 minute
    minutes = max(1, round(minutes))
    
    if minutes == 1:
        return "1 min read"
    else:
        return f"{minutes} min read"