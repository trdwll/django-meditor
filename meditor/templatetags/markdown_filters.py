from django import template
from django.utils.safestring import mark_safe
import markdown
import re
from ..extensions import process_markdown_extensions

register = template.Library()

# Create markdown instance once for better performance
_md = markdown.Markdown(extensions=[
    'markdown.extensions.toc',
    'markdown.extensions.tables', 
    'markdown.extensions.fenced_code',
    'markdown.extensions.codehilite',
    'markdown.extensions.nl2br',
    'markdown.extensions.sane_lists',
])

@register.filter(name='markdown_to_html')
def markdown_to_html(value):
    """Convert markdown text to HTML with syntax highlighting and custom extensions"""
    if not value:
        return ''
    
    # First, process custom markdown extensions (if any are configured)
    try:
        processed_content = process_markdown_extensions(value)
    except Exception:
        # Fallback to original content if extensions fail
        processed_content = value
    
    # Convert markdown to HTML
    html = _md.convert(processed_content)
    
    # Add target="_blank" to external links
    html = re.sub(
        r'<a([^>]*)href="([^"]*)"([^>]*)>',
        r'<a\1href="\2"\3 target="_blank" rel="noopener noreferrer">',
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