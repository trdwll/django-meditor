from django.urls import path
from .views import HtmlToMarkdownView, generic_preview, upload_image, snippets_list, save_snippet, delete_snippet

app_name = 'meditor'

urlpatterns = [
    path('html2md/', HtmlToMarkdownView.as_view(), name='html_to_markdown'),
    path('upload-image/', upload_image, name='upload_image'),
    path('snippets/', snippets_list, name='snippets_list'),
    path('snippets/save/', save_snippet, name='save_snippet'),
    path('snippets/<int:snippet_id>/delete/', delete_snippet, name='delete_snippet'),
    path('preview/<str:app_label>/<str:model_name>/<int:pk>/', generic_preview, name='generic_preview'),
] 