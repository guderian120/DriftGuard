from django.db import models
from django.core.validators import URLValidator
from apps.environments.models import Environment


class IACRepository(models.Model):
    """Repository containing Infrastructure as Code definitions"""

    IAC_TOOLS = [
        ('terraform', 'Terraform'),
        ('cloudformation', 'AWS CloudFormation'),
        ('kubernetes', 'Kubernetes Manifests'),
    ]

    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name='iac_repositories'
    )
    name = models.CharField(max_length=255)
    repository_url = models.URLField(
        validators=[URLValidator()],
        help_text='Git repository URL containing IaC files'
    )
    branch = models.CharField(max_length=100, default='main')
    tool = models.CharField(max_length=20, choices=IAC_TOOLS)

    # Sync status
    last_sync_at = models.DateTimeField(null=True, blank=True)

    # Encrypted credentials storage
    credentials_encrypted = models.BinaryField(
        null=True,
        blank=True,
        help_text='Encrypted authentication credentials'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['environment', 'repository_url', 'branch']
        ordering = ['environment', 'name']
        indexes = [
            models.Index(fields=['environment', 'tool']),
            models.Index(fields=['last_sync_at']),
        ]

    def __str__(self):
        return f"{self.environment.name} - {self.name} ({self.tool})"


class IACResource(models.Model):
    """Individual resource defined in Infrastructure as Code"""

    iac_repository = models.ForeignKey(
        IACRepository,
        on_delete=models.CASCADE,
        related_name='resources'
    )
    resource_type = models.CharField(
        max_length=100,
        help_text='Type of resource (e.g., "aws_instance", "kubernetes_deployment")'
    )
    resource_id = models.CharField(
        max_length=255,
        help_text='Unique identifier for the resource (Terraform address, etc.)'
    )
    declared_state = models.JSONField(
        help_text='Complete resource configuration from IaC definition'
    )

    # Sync status
    last_sync_at = models.DateTimeField(auto_now=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['iac_repository', 'resource_id']
        ordering = ['iac_repository', 'resource_type', 'resource_id']
        indexes = [
            models.Index(fields=['iac_repository', 'resource_type']),
            models.Index(fields=['last_sync_at']),
        ]

    def __str__(self):
        return f"{self.resource_type}.{self.resource_id}"

    @property
    def environment(self):
        """Get the environment this resource belongs to"""
        return self.iac_repository.environment

    @property
    def has_drift(self):
        """Check if this resource has unresolved drift"""
        return hasattr(self, 'drift') and self.drift.resolved_at is None

    @property
    def drift_severity(self):
        """Get severity of current drift if any"""
        if self.has_drift:
            return self.drift.severity_score
        return None
