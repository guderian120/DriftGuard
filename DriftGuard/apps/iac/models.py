from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class IaCRepository(models.Model):
    """GitHub Terraform/CloudFormation repository for IaC management"""

    PLATFORM_CHOICES = [
        ('github', 'GitHub'),
        ('gitlab', 'GitLab'),
        ('bitbucket', 'Bitbucket'),
    ]

    IaC_TYPE_CHOICES = [
        ('terraform', 'Terraform'),
        ('cloudformation', 'AWS CloudFormation'),
        ('arm_template', 'Azure ARM Template'),
        ('bicep', 'Azure Bicep'),
        ('pulumi', 'Pulumi'),
        ('cdk', 'AWS CDK'),
    ]

    name = models.CharField(max_length=100, help_text="Descriptive name for this repository")
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='github')
    repository_url = models.URLField(help_text="Full URL to the repository")
    repository_owner = models.CharField(max_length=100, help_text="Repository owner/organization")
    repository_name = models.CharField(max_length=100, help_text="Repository name")
    branch = models.CharField(max_length=100, default='main', help_text="Branch to monitor")
    iac_type = models.CharField(max_length=20, choices=IaC_TYPE_CHOICES, default='terraform')

    # GitHub specific fields
    github_token = models.CharField(max_length=200, blank=True, null=True, help_text="GitHub personal access token")

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='repositories'
    )

    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        # unique_together = ['organization', 'repository_owner', 'repository_name']  # Commented out for migration
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.repository_owner}/{self.repository_name})"

    def get_full_repository_path(self):
        return f"{self.repository_owner}/{self.repository_name}"


class IaCFile(models.Model):
    """Individual IaC files within a repository"""

    repository = models.ForeignKey(IaCRepository, on_delete=models.CASCADE, related_name='files')
    file_path = models.CharField(max_length=500, help_text="Path to the IaC file within the repository")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, help_text="File extension (e.g., .tf, .json, .yaml)")
    content_hash = models.CharField(max_length=64, help_text="SHA256 hash of file content")
    last_modified = models.DateTimeField(help_text="When file was last modified in repository")
    last_scanned = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['repository', 'file_path']
        ordering = ['file_path']

    def __str__(self):
        return f"{self.repository.name}:{self.file_path}"


class IaCResource(models.Model):
    """Extracted resources from IaC files (AWS, Azure, etc.)"""

    RESOURCE_TYPES = [
        # AWS Resources
        ('aws_instance', 'AWS EC2 Instance'),
        ('aws_s3_bucket', 'AWS S3 Bucket'),
        ('aws_rds_instance', 'AWS RDS Instance'),
        ('aws_lambda_function', 'AWS Lambda Function'),
        ('aws_security_group', 'AWS Security Group'),
        ('aws_load_balancer', 'AWS Load Balancer'),

        # Azure Resources
        ('azurerm_virtual_machine', 'Azure Virtual Machine'),
        ('azurerm_storage_account', 'Azure Storage Account'),
        ('azurerm_sql_database', 'Azure SQL Database'),
        ('azurerm_app_service', 'Azure App Service'),
        ('azurerm_network_security_group', 'Azure NSG'),
        ('azurerm_load_balancer', 'Azure Load Balancer'),

        # Generic
        ('other', 'Other Resource'),
    ]

    iac_file = models.ForeignKey(IaCFile, on_delete=models.CASCADE, related_name='resources')
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES, default='other')
    resource_id = models.CharField(max_length=200, help_text="Unique identifier for the resource (e.g., resource name)")
    provider = models.CharField(max_length=20, default='aws', help_text="Cloud provider (aws, azure, gcp)")

    # Resource definition (JSON stored as text)
    resource_definition = models.TextField(help_text="JSON representation of the resource definition")
    line_number = models.IntegerField(default=0, help_text="Line number in the IaC file where resource is defined")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['iac_file', 'resource_id']
        ordering = ['resource_type', 'resource_id']

    def __str__(self):
        return f"{self.resource_type}:{self.resource_id}"
