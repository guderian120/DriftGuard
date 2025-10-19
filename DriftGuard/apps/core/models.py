from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class TimestampedModel(models.Model):
    """Base model with automatic timestamps"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class User(AbstractUser):
    """Custom user model with organization and role support"""

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='users'
    )

    role = models.CharField(
        max_length=20,
        choices=[
            ('admin', 'Administrator'),
            ('editor', 'Editor'),
            ('viewer', 'Viewer'),
        ],
        default='viewer'
    )

    class Meta:
        unique_together = ['organization', 'username']

    def __str__(self):
        return f"{self.username} ({self.organization.name})"


class UserSession(models.Model):
    """Track user sessions for security and auditing"""

    session_id = models.CharField(max_length=255, primary_key=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE
    )

    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    last_activity = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', '-last_activity']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Session {self.session_id} for {self.user.username}"


class AuditLog(models.Model):
    """Comprehensive audit logging for compliance"""

    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('VIEW', 'View'),
        ('EXPORT', 'Export'),
        ('ANALYZE', 'Analyze'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
    ]

    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE
    )

    action = models.CharField(max_length=100, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)  # e.g., 'drift', 'environment', 'user'
    resource_id = models.CharField(max_length=255)

    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=255, blank=True)

    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        user_name = self.user.username if self.user else 'System'
        return f"{user_name} {self.action} {self.resource_type}:{self.resource_id} at {self.timestamp}"
