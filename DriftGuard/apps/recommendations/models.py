from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from apps.drifts.models import DriftEvent


class Recommendation(models.Model):
    """AI-generated remediation suggestions for drift events"""

    RECOMMENDATION_TYPES = [
        ('auto_revert', 'Automatic Revert'),
        ('codify_iac', 'Update IaC Definition'),
        ('escalate_review', 'Escalate for Human Review'),
        ('accept_exception', 'Accept as Exception'),
        ('manual_review', 'Manual Review Required'),
        ('security_patch', 'Security Patch Required'),
        ('compliance_update', 'Compliance Update Needed'),
    ]

    PRIORITIES = [
        ('low', 'Low Priority'),
        ('medium', 'Medium Priority'),
        ('high', 'High Priority'),
        ('critical', 'Critical Priority'),
    ]

    EFFORT_ESTIMATES = [
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
        ('days', 'Days'),
    ]

    RECOMMENDED_BY_CHOICES = [
        ('ml_model', 'ML Model'),
        ('ai_agent', 'AI Agent'),
        ('human', 'Human Expert'),
        ('rule_engine', 'Rule Engine'),
    ]

    drift_event = models.ForeignKey(
        DriftEvent,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )

    # Recommendation details
    recommendation_type = models.CharField(
        max_length=30,
        choices=RECOMMENDATION_TYPES
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITIES,
        default='medium'
    )

    # Confidence and scoring
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Confidence in this recommendation (0.0-1.0)'
    )

    # Recommendation content
    title = models.CharField(
        max_length=200,
        help_text='Short title for the recommendation'
    )
    rationale = models.TextField(
        help_text='Detailed explanation of why this recommendation is suggested'
    )
    implementation_steps = models.JSONField(
        default=list,
        blank=True,
        help_text='Ordered list of steps to implement the recommendation'
    )

    # Impact assessment
    risk_assessment = models.JSONField(
        default=dict,
        blank=True,
        help_text='Assessment of success probability and potential impacts'
    )

    # Effort and timeline
    estimated_effort = models.CharField(
        max_length=20,
        choices=EFFORT_ESTIMATES,
        null=True,
        blank=True,
        help_text='Estimated time to implement'
    )
    effort_quantity = models.IntegerField(
        null=True,
        blank=True,
        help_text='Quantity of time units (e.g., 2 hours, 3 days)'
    )

    # Metadata
    recommended_by = models.CharField(
        max_length=50,
        choices=RECOMMENDED_BY_CHOICES,
        default='ml_model'
    )
    recommended_by_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Details about who/what generated this recommendation'
    )

    # Lifecycle
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this recommendation expires'
    )
    implemented_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this recommendation was implemented'
    )
    implementation_result = models.JSONField(
        default=dict,
        blank=True,
        help_text='Results of implementation attempt'
    )

    # Status
    is_implemented = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)

    class Meta:
        ordering = ['-confidence_score', '-created_at']
        indexes = [
            models.Index(fields=['drift_event', 'created_at']),
            models.Index(fields=['recommendation_type', 'priority']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_implemented']),
        ]

    def __str__(self):
        return f"{self.recommendation_type} for {self.drift_event}"

    def is_active(self):
        """Check if this recommendation is still active"""
        return not self.is_expired and not self.is_implemented

    def mark_implemented(self, result=None):
        """Mark this recommendation as implemented"""
        from django.utils import timezone
        self.implemented_at = timezone.now()
        self.is_implemented = True
        if result:
            self.implementation_result = result
        self.save()

    def cancel(self):
        """Cancel this recommendation"""
        self.is_expired = True
        self.save()

    @property
    def implementation_status(self):
        """Get a human-readable implementation status"""
        if self.is_implemented:
            return "Implemented"
        elif self.is_expired:
            return "Expired/Cancelled"
        else:
            return "Active"

    def get_implementation_steps_text(self):
        """Get implementation steps as formatted text"""
        if not self.implementation_steps:
            return ""

        steps = []
        for i, step in enumerate(self.implementation_steps, 1):
            step_text = step.get('description', '') if isinstance(step, dict) else str(step)
            steps.append(f"{i}. {step_text}")

        return "\n".join(steps)

    @property
    def urgency_score(self):
        """Calculate urgency score based on priority and confidence"""
        priority_weights = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4,
        }
        priority_score = priority_weights.get(self.priority, 2)
        return (priority_score / 4.0) * float(self.confidence_score)


class RecommendationTemplate(models.Model):
    """Templates for common recommendations"""

    name = models.CharField(max_length=100, unique=True)
    recommendation_type = models.CharField(
        max_length=30,
        choices=Recommendation.RECOMMENDATION_TYPES
    )

    # Template content
    title_template = models.CharField(
        max_length=200,
        help_text='Template for the recommendation title'
    )
    rationale_template = models.TextField(
        help_text='Template for the rationale text'
    )
    steps_template = models.JSONField(
        default=list,
        blank=True,
        help_text='Template for implementation steps'
    )

    # Default values
    default_priority = models.CharField(
        max_length=10,
        choices=Recommendation.PRIORITIES,
        default='medium'
    )
    default_effort = models.CharField(
        max_length=20,
        choices=Recommendation.EFFORT_ESTIMATES,
        null=True,
        blank=True
    )
    default_effort_quantity = models.IntegerField(null=True, blank=True)

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def create_recommendation(self, drift_event, confidence_score=0.8, **kwargs):
        """Create a recommendation instance from this template"""
        return Recommendation.objects.create(
            drift_event=drift_event,
            recommendation_type=self.recommendation_type,
            priority=kwargs.get('priority', self.default_priority),
            confidence_score=confidence_score,
            title=kwargs.get('title', self.title_template.format(**kwargs)),
            rationale=kwargs.get('rationale', self.rationale_template.format(**kwargs)),
            implementation_steps=kwargs.get('steps', self.steps_template),
            estimated_effort=kwargs.get('effort', self.default_effort),
            effort_quantity=kwargs.get('effort_quantity', self.default_effort_quantity),
            recommended_by='rule_engine',
            recommended_by_details={'template': self.name},
            **kwargs
        )


class RecommendationFeedback(models.Model):
    """User feedback on recommendation effectiveness"""

    FEEDBACK_TYPES = [
        ('helpful', 'Helpful'),
        ('not_helpful', 'Not Helpful'),
        ('implemented_successfully', 'Implemented Successfully'),
        ('implemented_with_issues', 'Implemented with Issues'),
        ('wrong_recommendation', 'Wrong Recommendation'),
        ('too_complex', 'Too Complex to Implement'),
    ]

    recommendation = models.ForeignKey(
        Recommendation,
        on_delete=models.CASCADE,
        related_name='feedback'
    )

    feedback_type = models.CharField(max_length=30, choices=FEEDBACK_TYPES)
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Rating from 1-5 (optional)'
    )

    # Detailed feedback
    comments = models.TextField(
        blank=True,
        help_text='Additional feedback comments'
    )

    # Context
    user_id = models.IntegerField(help_text='User who provided feedback')
    user_role = models.CharField(
        max_length=50,
        blank=True,
        help_text='Role of the user (admin, editor, viewer)'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recommendation', 'created_at']),
            models.Index(fields=['feedback_type']),
        ]

    def __str__(self):
        return f"Feedback on {self.recommendation}: {self.feedback_type}"
