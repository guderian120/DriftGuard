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


class CloudCredential(models.Model):
    """Encrypted cloud provider credentials for accessing environments"""

    CREDENTIAL_TYPES = [
        ('aws_access_keys', 'AWS Access Keys'),
        ('aws_role', 'AWS IAM Role'),
        ('azure_service_principal', 'Azure Service Principal'),
        ('gcp_service_account', 'GCP Service Account'),
    ]

    environment = models.OneToOneField(
        Environment,
        on_delete=models.CASCADE,
        related_name='credentials'
    )

    credential_type = models.CharField(max_length=30, choices=CREDENTIAL_TYPES)
    name = models.CharField(max_length=100, help_text="Credential name for easy identification")

    # AWS Credentials
    aws_access_key_id = models.CharField(max_length=128, blank=True, null=True)
    aws_secret_access_key = models.CharField(max_length=128, blank=True, null=True)  # Will be encrypted
    aws_role_arn = models.CharField(max_length=200, blank=True, null=True)

    # Azure Credentials
    azure_client_id = models.CharField(max_length=128, blank=True, null=True)
    azure_client_secret = models.CharField(max_length=128, blank=True, null=True)  # Encrypted
    azure_tenant_id = models.CharField(max_length=128, blank=True, null=True)

    # GCP Credentials
    gcp_service_account_key = models.TextField(blank=True, null=True, help_text="GCP Service Account JSON key")  # Encrypted

    # Metadata
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.environment.name} ({self.get_credential_type_display()})"

    def clean(self):
        """Validate credential configuration based on type"""
        from django.core.exceptions import ValidationError

        provider = self.environment.cloud_provider

        if self.credential_type.startswith('aws_'):
            if provider != 'aws':
                raise ValidationError('AWS credentials can only be used with AWS environments')

            if self.credential_type == 'aws_access_keys':
                if not self.aws_access_key_id or not self.aws_secret_access_key:
                    raise ValidationError('AWS Access Key ID and Secret Access Key are required')
            elif self.credential_type == 'aws_role':
                if not self.aws_role_arn:
                    raise ValidationError('AWS Role ARN is required for role-based authentication')

        elif self.credential_type.startswith('azure_'):
            if provider != 'azure':
                raise ValidationError('Azure credentials can only be used with Azure environments')

            if self.credential_type == 'azure_service_principal':
                if not all([self.azure_client_id, self.azure_client_secret, self.azure_tenant_id]):
                    raise ValidationError('Azure Client ID, Secret, and Tenant ID are required')

        elif self.credential_type.startswith('gcp_'):
            if provider != 'gcp':
                raise ValidationError('GCP credentials can only be used with GCP environments')

            if self.credential_type == 'gcp_service_account':
                if not self.gcp_service_account_key:
                    raise ValidationError('GCP Service Account Key is required')

    def get_credentials_dict(self):
        """Return credentials as dictionary for API calls"""
        # Note: In production this would decrypt encrypted fields
        creds = {}

        if self.credential_type == 'aws_access_keys':
            creds = {
                'access_key_id': self.aws_access_key_id,
                'secret_access_key': self.aws_secret_access_key,
            }
        elif self.credential_type == 'aws_role':
            creds = {'role_arn': self.aws_role_arn}
        elif self.credential_type == 'azure_service_principal':
            creds = {
                'client_id': self.azure_client_id,
                'client_secret': self.azure_client_secret,
                'tenant_id': self.azure_tenant_id,
            }
        elif self.credential_type == 'gcp_service_account':
            creds = {'service_account_key': self.gcp_service_account_key}

        return creds

    @property
    def is_configured(self):
        """Check if credentials are properly configured"""
        try:
            self.full_clean()
            return True
        except:
            return False
