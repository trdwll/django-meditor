# Django Meditor

A Django app providing a rich markdown editor with HTML conversion and snippet management capabilities.

## Features

- **Rich Markdown Editor**: A powerful markdown editor with real-time preview
- **HTML to Markdown Conversion**: Convert HTML content to markdown format
- **Snippet Management**: Save and organize reusable markdown snippets
- **Image Upload Support**: Drag and drop image upload functionality with customizable handlers
- **Generic Preview**: Preview markdown content for any Django model
- **Customizable**: Easy to integrate and customize for your Django projects

## Requirements

- Python 3.11+
- Django 5.1+

## Installation

Install the package via pip:

```bash
pip install django-meditor
```

## Quick Start

1. **Add to INSTALLED_APPS**:

```python
# settings.py
INSTALLED_APPS = [
    # ... other apps
    'meditor',
]
```

2. **Include URLs**:

```python
# urls.py
from django.urls import path, include

urlpatterns = [
    # ... other URL patterns
    path('meditor/', include('meditor.urls')),
]
```

3. **Run Migrations**:

```bash
python manage.py migrate
```

4. **Collect Static Files** (if needed):

```bash
python manage.py collectstatic
```

## Usage

### Basic Editor Integration

Include the editor in your templates:

```html
{% load markdown_filters %}

<form method="post">
    {% csrf_token %}
    {{ form.content|meditor_widget }}
    <button type="submit">Save</button>
</form>
```

### HTML to Markdown Conversion

Use the provided view to convert HTML to markdown:

```python
from meditor.views import HtmlToMarkdownView

# In your URLs
path('convert/', HtmlToMarkdownView.as_view(), name='html_to_markdown'),
```

### Snippet Management

The app provides views for managing markdown snippets:

- `snippets_list`: List all snippets for the current user
- `save_snippet`: Save a new snippet
- `delete_snippet`: Delete an existing snippet

### Generic Preview

Preview markdown content for any model:

```python
# URL pattern: preview/<app_label>/<model_name>/<pk>/
# Example: /meditor/preview/blog/post/1/
```

## Configuration

### Settings

You can customize the editor behavior in your Django settings:

```python
# settings.py

# Meditor Configuration
MEDITOR_CONFIG = {
    'UPLOAD_PATH': 'meditor/uploads/',  # Image upload path
    'MAX_FILE_SIZE': 5 * 1024 * 1024,  # 5MB max file size
    'ALLOWED_EXTENSIONS': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    'ENABLE_SNIPPETS': True,  # Enable snippet functionality
    'ENABLE_HTML_CONVERSION': True,  # Enable HTML to markdown conversion
}

# Image upload settings
EDITOR_MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB max file size

# Custom upload handler (optional)
MEDITOR_UPLOAD_HANDLER = 'your_app.upload_handlers.custom_upload_handler'
MEDITOR_UPLOAD_PATH = 'meditor/uploads/'  # Fallback path
```

### Custom Upload Handlers

You can create custom upload handlers for project-specific logic (e.g., S3, CDN uploads):

```python
# your_app/upload_handlers.py
from django.http import JsonResponse
from django.core.files.uploadedfile import UploadedFile

def custom_upload_handler(request, image_file: UploadedFile) -> JsonResponse:
    """
    Custom upload handler for your project
    Must return a JsonResponse with 'success', 'url', and 'filename' keys
    """
    try:
        # Your custom upload logic here
        # Example: Upload to S3, CDN, etc.
        
        uploaded_url = "https://your-cdn.com/path/to/image.jpg"
        
        return JsonResponse({
            'success': True,
            'url': uploaded_url,
            'filename': image_file.name
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

Then configure it in your settings:

```python
# settings.py
MEDITOR_UPLOAD_HANDLER = 'your_app.upload_handlers.custom_upload_handler'
```

### Custom Widget

Use the custom widget in your forms:

```python
from django import forms
from meditor.widgets import MarkdownEditorWidget

class MyModelForm(forms.ModelForm):
    content = forms.CharField(widget=MarkdownEditorWidget())
    
    class Meta:
        model = MyModel
        fields = ['title', 'content']
```

## API Reference

### Models

#### MarkdownSnippet

A model for storing reusable markdown snippets.

**Fields:**
- `user`: ForeignKey to User
- `name`: CharField (max_length=100)
- `content`: TextField
- `category`: CharField (max_length=50, optional)
- `is_public`: BooleanField (default=False)
- `created_at`: DateTimeField (auto_now_add=True)
- `updated_at`: DateTimeField (auto_now=True)

**Properties:**
- `preview`: Returns first 100 characters of content

### Views

- `HtmlToMarkdownView`: Converts HTML to markdown
- `generic_preview`: Generic preview for any model
- `upload_image`: Handles image uploads (with custom handler support)
- `snippets_list`: Lists user snippets
- `save_snippet`: Saves a new snippet
- `delete_snippet`: Deletes a snippet

### Template Tags

- `meditor_widget`: Renders the markdown editor widget
- `markdown_to_html`: Converts markdown to HTML

## Development

### Installation for Development

```bash
git clone https://github.com/yourusername/django-meditor.git
cd django-meditor
pip install -e .
pip install -e ".[dev]"
```

### Running Tests

```bash
pytest
```

### Code Quality

```bash
black .
flake8 .
isort .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### 0.1.0 (2024-01-XX)
- Initial release
- Rich markdown editor with real-time preview
- HTML to markdown conversion
- Snippet management system
- Image upload functionality with customizable handlers
- Generic preview system

## Roadmap

- [ ] Image sizing controls
- [ ] Content alignment options
- [ ] Customizable HTML styling (Tailwind, Bootstrap support)
- [ ] Revision history with local storage
- [ ] Collaborative editing features
- [ ] Advanced markdown extensions

