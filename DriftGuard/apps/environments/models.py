from django.db import models
from django.core.validators import RegexValidator
from apps.organizations.models import Organization


class Environment(models.Model):
    """Environment model representing cloud environments (AWS, GCP, Azure)"""

    CLOUD_PROVIDERS = [
        ('aws', 'Amazon Web Services'),
        ('gcp', 'Google Cloud Platform'),
        ('azure', 'Microsoft Azure'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='environments'
    )
    name = models.CharField(max_length=255)
    slug = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[a-z0-9-]+$',
                message='Slug can only contain lowercase letters, numbers, and hyphens.'
            )
        ]
    )
    cloud_provider = models.CharField(
        max_length=20,
        choices=CLOUD_PROVIDERS
    )
    region = models.CharField(max_length=50, blank=True)
    account_id = models.CharField(
        max_length=50,
        help_text='AWS Account ID, GCP Project ID, or Azure Subscription ID',
        blank=True
    )
    tags = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata in JSON format'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'slug']
        ordering = ['organization', 'name']
        indexes = [
            models.Index(fields=['organization', 'cloud_provider']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.name} ({self.cloud_provider.upper()})"

    def clean(self):
        """Custom validation"""
        from django.core.exceptions import ValidationError

        # Validate region based on cloud provider
        if self.cloud_provider == 'aws' and not self.region.startswith('us-'):
            # Basic AWS region validation
            if not any(region in self.region.lower() for region in [
                'us-east-', 'us-west-', 'eu-', 'ap-', 'ca-', 'sa-east-1'
            ]):
                raise ValidationError('Invalid AWS region format')

    def get_cloud_provider_display(self):
        """Get human-readable cloud provider name"""
        return dict(self.CLOUD_PROVIDERS)[self.cloud_provider]

    @property
    def is_ready_for_scan(self):
        """Check if environment is properly configured for drift detection"""
        return (
            self.is_active and
            bool(self.account_id) and
            bool(self.region)
        )

    @property
    def resource_count(self):
        """Get count of IaC resources in this environment"""
        return self.iac_repositories.aggregate(
            total_resources=models.Count('resources')
        )['total_resources'] or 0

    @property
    def drift_count(self):
        """Get count of unresolved drifts in this environment"""
        return self.drifts.filter(resolved_at__isnull=True).count()
