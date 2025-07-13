from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import html2text
import json
from django.apps import apps
from django.template.loader import select_template
from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404
from django.template.defaultfilters import mark_safe
from meditor.templatetags.markdown_filters import markdown_to_html
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.files.images import ImageFile
from django.core.exceptions import ValidationError
from django.conf import settings
import os
from datetime import datetime
from .models import MarkdownSnippet

# Create your views here.

@method_decorator(csrf_exempt, name='dispatch')
class HtmlToMarkdownView(View):
    """Convert HTML to Markdown via AJAX"""
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            html_content = data.get('html', '')
            
            # Configure html2text
            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = False
            h.body_width = 0  # No line wrapping
            
            # Convert HTML to Markdown
            markdown_content = h.handle(html_content)
            
            return JsonResponse({
                'success': True,
                'markdown': markdown_content
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)

@staff_member_required
def upload_image(request):
    """Handle image uploads for the markdown editor"""
    if request.method == 'POST' and request.FILES.get('image'):
        try:
            image_file = request.FILES['image']
            
            # Use Django's ImageField validation
            from django.forms import ImageField
            from django.core.files.uploadedfile import UploadedFile
            
            # Create a temporary ImageField to validate the file
            temp_field = ImageField()
            
            # Validate the file using Django's built-in validation
            try:
                temp_field.clean(image_file, None)
            except ValidationError as e:
                return JsonResponse({
                    'success': False,
                    'error': f'Invalid image file: {", ".join(e.messages)}'
                }, status=400)
            
            # Validate file size using configurable setting
            max_size = getattr(settings, 'EDITOR_MAX_IMAGE_SIZE', 20 * 1024 * 1024)  # Default 20MB
            if image_file.size > max_size:
                max_size_mb = max_size / (1024 * 1024)
                file_size_mb = image_file.size / (1024 * 1024)
                return JsonResponse({
                    'success': False,
                    'error': f'File too large: {file_size_mb:.1f}MB. Maximum size is {max_size_mb:.0f}MB.'
                }, status=400)
            
            # Generate unique filename with YYYY/MM/hash.png format
            from datetime import datetime
            import hashlib
            
            # Get current date for directory structure
            now = datetime.now()
            year_month = now.strftime('%Y/%m')
            
            # Generate hash from filename and timestamp
            hash_input = f"{image_file.name}_{now.isoformat()}"
            file_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
            
            # Get file extension
            import os
            name, ext = os.path.splitext(image_file.name)
            if not ext:
                ext = '.png'  # Default to .png if no extension
            
            # Create filename: YYYY/MM/hash.ext
            filename = f"{year_month}/{file_hash}{ext}"
            
            # Upload directly to CDN at root level (like ShareX)
            import boto3
            from TRDWLL.utils import get_env_variable
            
            # Initialize S3 client for direct upload
            client = boto3.client(
                "s3",
                aws_access_key_id=get_env_variable('S3_ACCESS_KEY'),
                aws_secret_access_key=get_env_variable('S3_SECRET_ACCESS_KEY'),
                endpoint_url=get_env_variable('S3_ENDPOINT_URL')
            )
            
            # Upload directly to CDN root: YYYY/MM/hash.ext
            cdn_key = f"{year_month}/{file_hash}{ext}"
            
            client.put_object(
                Bucket=get_env_variable('S3_BUCKET_NAME'),
                Key=cdn_key,
                Body=image_file.read(),
                ContentType=image_file.content_type or 'image/png',
                ACL="public-read",
                CacheControl="public, max-age=31536000, immutable"
            )
            
            # Generate direct CDN URL
            url = f"https://{get_env_variable('S3_CUSTOM_DOMAIN')}/{cdn_key}"
            
            return JsonResponse({
                'success': True,
                'url': url,
                'filename': image_file.name
            })
            
        except Exception as e:
            import traceback
            print(f"Image upload error: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({
                'success': False,
                'error': f'Upload failed: {str(e)}'
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'No image file provided'
    }, status=400)

@staff_member_required
def snippets_list(request):
    """Get list of available snippets for the current user"""
    if request.method == 'GET':
        # Get user's snippets and public snippets
        user_snippets = MarkdownSnippet.objects.filter(user=request.user)
        public_snippets = MarkdownSnippet.objects.filter(is_public=True).exclude(user=request.user)
        
        snippets = []
        
        # Add user's snippets
        for snippet in user_snippets:
            snippets.append({
                'id': snippet.id,
                'name': snippet.name,
                'content': snippet.content,
                'category': snippet.category,
                'preview': snippet.preview,
                'is_owner': True,
                'created_at': snippet.created_at.isoformat()
            })
        
        # Add public snippets
        for snippet in public_snippets:
            snippets.append({
                'id': snippet.id,
                'name': snippet.name,
                'content': snippet.content,
                'category': snippet.category,
                'preview': snippet.preview,
                'is_owner': False,
                'created_at': snippet.created_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'snippets': snippets
        })
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request method'
    }, status=405)

@staff_member_required
def save_snippet(request):
    """Save a new snippet or update existing one"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            content = data.get('content')
            category = data.get('category', '')
            is_public = data.get('is_public', False)
            snippet_id = data.get('id')  # For updates
            
            if not name or not content:
                return JsonResponse({
                    'success': False,
                    'error': 'Name and content are required'
                }, status=400)
            
            if snippet_id:
                # Update existing snippet
                try:
                    snippet = MarkdownSnippet.objects.get(id=snippet_id, user=request.user)
                    snippet.name = name
                    snippet.content = content
                    snippet.category = category
                    snippet.is_public = is_public
                    snippet.save()
                except MarkdownSnippet.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Snippet not found'
                    }, status=404)
            else:
                # Create new snippet
                snippet = MarkdownSnippet.objects.create(
                    user=request.user,
                    name=name,
                    content=content,
                    category=category,
                    is_public=is_public
                )
            
            return JsonResponse({
                'success': True,
                'snippet': {
                    'id': snippet.id,
                    'name': snippet.name,
                    'content': snippet.content,
                    'category': snippet.category,
                    'preview': snippet.preview,
                    'is_owner': True,
                    'created_at': snippet.created_at.isoformat()
                }
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request method'
    }, status=405)

@staff_member_required
def delete_snippet(request, snippet_id):
    """Delete a snippet"""
    if request.method == 'DELETE':
        try:
            snippet = MarkdownSnippet.objects.get(id=snippet_id, user=request.user)
            snippet.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Snippet deleted successfully'
            })
            
        except MarkdownSnippet.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Snippet not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid request method'
    }, status=405)

@staff_member_required
def generic_preview(request, app_label, model_name, pk):
    model = apps.get_model(app_label, model_name)
    if not model:
        raise Http404("Model not found")
    
    # Check if we have an existing object
    obj = model.objects.filter(pk=pk).first()
    
    if not obj:
        # Create a dummy object of the actual model
        obj = model()
        obj.pk = 999999  # Give it a temporary ID for template compatibility
        obj.id = 999999  # Also set id for consistency
        
        # Set attributes from form data, but skip many-to-many fields
        for key, value in request.GET.items():
            if hasattr(obj, key):
                field = obj._meta.get_field(key)
                if field.is_relation and field.many_to_many:
                    # Skip many-to-many fields - they need special handling
                    continue
                else:
                    setattr(obj, key, value)
    
    # Use the existing template for this model
    template_names = [
        f"{app_label}/{model_name}_preview.html",
        f"{app_label}/{model_name}.html",
    ]
    template = select_template(template_names)
    
    # Create context with the object (real or dummy)
    # Pass the object with the model name as the key (e.g., 'post' for Post model)
    context = {
        model_name: obj,  # Dynamic: 'post', 'article', 'product', etc.
        "object": obj,
        "is_preview": True,
        "preview_message": "This is a preview of unsaved content." if not obj.pk or obj.pk == 999999 else "This is a preview."
    }
    
    # Also add individual fields to context for the generic template fallback
    if not obj.pk or obj.pk == 999999:
        # For dummy objects, add fields to context for generic template
        for field in obj._meta.fields:
            if hasattr(obj, field.name):
                context[field.name] = getattr(obj, field.name)
    
    return render(request, template.template.name, context)
