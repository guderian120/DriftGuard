from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from apps.environments.models import Environment
from apps.iac.models import IACResource


class DriftEvent(models.Model):
    """Core drift detection event"""

    DRIFT_TYPES = [
        ('modified', 'Configuration Modified'),
        ('deleted', 'Resource Deleted'),
        ('added', 'New Resource Added'),
        ('moved', 'Resource Moved'),
    ]

    RESOLUTION_TYPES = [
        ('auto_revert', 'Automatically Reverted'),
        ('codify_iac', 'Updated IaC'),
        ('accepted', 'Accepted Drift'),
        ('escalated', 'Escalated for Review'),
    ]

    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name='drifts'
    )
    iac_resource = models.ForeignKey(
        IACResource,
        on_delete=models.CASCADE,
        related_name='drift'
    )

    drift_type = models.CharField(max_length=20, choices=DRIFT_TYPES)
    actual_state = models.JSONField(
        null=True,
        blank=True,
        help_text='Current state of the resource in cloud provider'
    )
    declared_state = models.JSONField(
        help_text='State as defined in IaC at time of detection'
    )

    # Detection metadata
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_type = models.CharField(
        max_length=20,
        choices=RESOLUTION_TYPES,
        null=True,
        blank=True
    )
    resolution_notes = models.TextField(blank=True)

    # Severity and scoring
    severity_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Overall severity score (0.0-1.0)'
    )
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Confidence in detection accuracy (0.0-1.0)'
    )

    # Impact assessment
    risk_assessment = models.JSONField(
        default=dict,
        blank=True,
        help_text='JSON object with security, performance, cost, compliance impacts'
    )

    # Additional metadata
    tags = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional tags and metadata'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Detailed metadata about the drift event'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-detected_at', '-severity_score']
        indexes = [
            models.Index(fields=['environment', 'detected_at']),
            models.Index(fields=['iac_resource', 'resolved_at']),
            models.Index(fields=['drift_type', 'severity_score']),
            models.Index(fields=['resolved_at']),
        ]

    def __str__(self):
        return f"{self.drift_type} drift in {self.environment.name}"

    def is_resolved(self):
        """Check if this drift has been resolved"""
        return self.resolved_at is not None

    @property
    def duration(self):
        """Get drift duration if resolved"""
        if self.resolved_at:
            return self.resolved_at - self.detected_at
        return None

    @property
    def drift_changes_count(self):
        """Count of specific changes in this drift"""
        return self.changes.count()

    def get_top_changes(self, limit=5):
        """Get most significant changes"""
        return self.changes.filter(
            is_security_critical=True
        ).order_by('-is_security_critical')[:limit]


class DriftChange(models.Model):
    """Specific changes detected in a drift event"""

    CHANGE_TYPES = [
        ('modified', 'Property Modified'),
        ('added', 'Property Added'),
        ('removed', 'Property Removed'),
    ]

    drift_event = models.ForeignKey(
        DriftEvent,
        on_delete=models.CASCADE,
        related_name='changes'
    )

    property_path = models.CharField(
        max_length=500,
        help_text='JSON path to the changed property'
    )
    declared_value = models.JSONField(
        null=True,
        blank=True,
        help_text='Value in IaC declaration'
    )
    actual_value = models.JSONField(
        null=True,
        blank=True,
        help_text='Actual value in cloud provider'
    )

    change_type = models.CharField(max_length=20, choices=CHANGE_TYPES)
    is_security_critical = models.BooleanField(
        default=False,
        help_text='Whether this change poses a security risk'
    )

    # Metadata
    change_impact = models.JSONField(
        default=dict,
        blank=True,
        help_text='Impact assessment for this specific change'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_security_critical', 'property_path']
        indexes = [
            models.Index(fields=['drift_event', 'is_security_critical']),
            models.Index(fields=['property_path']),
        ]

    def __str__(self):
        return f"{self.change_type} at {self.property_path}"

    def get_value_diff(self):
        """Get a formatted diff of the values"""
        if self.declared_value is None:
            return f"Added: {self.actual_value}"
        elif self.actual_value is None:
            return f"Removed: {self.declared_value}"
        else:
            return f"Changed: {self.declared_value} → {self.actual_value}"
