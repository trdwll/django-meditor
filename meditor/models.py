from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class MarkdownSnippet(models.Model):
    """Model for storing reusable markdown snippets"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='markdown_snippets')
    name = models.CharField(max_length=100, help_text="Name for this snippet")
    content = models.TextField(help_text="The markdown content")
    category = models.CharField(max_length=50, blank=True, help_text="Category for organization")
    is_public = models.BooleanField(default=False, help_text="Make this snippet available to all users")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def preview(self):
        """Return a preview of the content (first 100 characters)"""
        return self.content[:100] + "..." if len(self.content) > 100 else self.content
