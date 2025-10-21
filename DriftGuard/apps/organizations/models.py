from django.db import models
from django.core.validators import EmailValidator
from apps.core.models import TimestampedModel


class Organization(TimestampedModel):
    """Organization/tenant model for multi-tenancy"""

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    contact_email = models.EmailField(
        validators=[EmailValidator()],
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class OrganizationSettings(TimestampedModel):
    """Organization-specific settings"""

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='settings'
    )

    # Drift detection settings
    drift_detection_enabled = models.BooleanField(default=True)
    auto_analysis_enabled = models.BooleanField(default=True)

    # Notification settings
    email_notifications = models.BooleanField(default=True)
    slack_integration = models.BooleanField(default=False)
    slack_webhook_url = models.URLField(blank=True, null=True)

    # Security settings
    audit_logging = models.BooleanField(default=True)
    session_timeout = models.PositiveIntegerField(
        default=3600,
        help_text='Session timeout in seconds'
    )

    # AI settings
    gemini_ai_enabled = models.BooleanField(default=True)
    ml_retraining_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Organization Settings'
        verbose_name_plural = 'Organization Settings'
