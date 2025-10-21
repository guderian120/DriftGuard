from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from apps.drifts.models import DriftEvent


class MLModel(models.Model):
    """Machine learning models for drift detection and analysis"""

    MODEL_TYPES = [
        ('classification', 'Classification'),
        ('regression', 'Regression'),
        ('clustering', 'Clustering'),
    ]

    FRAMEWORKS = [
        ('scikit-learn', 'Scikit-learn'),
        ('xgboost', 'XGBoost'),
        ('tensorflow', 'TensorFlow'),
        ('pytorch', 'PyTorch'),
    ]

    name = models.CharField(max_length=255, unique=True)
    version = models.CharField(max_length=50)
    model_type = models.CharField(max_length=20, choices=MODEL_TYPES)
    framework = models.CharField(max_length=20, choices=FRAMEWORKS)

    # Model artifacts and configuration
    artifact_path = models.CharField(
        max_length=500,
        help_text='Path to stored model artifacts'
    )
    features = models.JSONField(
        help_text='List of input features used by the model'
    )
    target_classes = models.JSONField(
        null=True,
        blank=True,
        help_text='Target classes for classification models'
    )

    # Performance metrics
    metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text='Performance metrics (accuracy, precision, recall, etc.)'
    )
    accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    training_data_size = models.IntegerField(null=True, blank=True)

    # Status and lifecycle
    is_active = models.BooleanField(default=False)
    trained_at = models.DateTimeField()
    deployed_at = models.DateTimeField(null=True, blank=True)

    # Additional metadata
    hyperparameters = models.JSONField(
        default=dict,
        blank=True,
        help_text='Model hyperparameters'
    )
    feature_importance = models.JSONField(
        default=dict,
        blank=True,
        help_text='Feature importance scores'
    )
    cross_validation_scores = models.JSONField(
        default=dict,
        blank=True,
        help_text='Cross-validation results'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'version']
        ordering = ['-deployed_at', '-trained_at']
        indexes = [
            models.Index(fields=['model_type', 'is_active']),
            models.Index(fields=['framework', 'deployed_at']),
        ]

    def __str__(self):
        return f"{self.name} v{self.version} ({self.framework})"

    def activate(self):
        """Activate this model (deactivate others of same type)"""
        MLModel.objects.filter(
            model_type=self.model_type,
            is_active=True
        ).exclude(pk=self.pk).update(is_active=False)
        self.is_active = True
        self.deployed_at = models.functions.Now()
        self.save()

    def get_active_model(self, model_type):
        """Get the currently active model for a given type"""
        return MLModel.objects.filter(
            model_type=model_type,
            is_active=True
        ).first()


class MLPrediction(models.Model):
    """Predictions made by ML models for drift events"""

    drift_event = models.ForeignKey(
        DriftEvent,
        on_delete=models.CASCADE,
        related_name='ml_predictions'
    )
    ml_model = models.ForeignKey(
        MLModel,
        on_delete=models.CASCADE,
        related_name='predictions'
    )

    # Prediction results
    prediction_result = models.JSONField(
        help_text='Raw prediction results from the model'
    )
    predicted_class = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Predicted classification result'
    )
    confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Confidence score of the prediction'
    )

    # Prediction metadata
    prediction_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata about the prediction'
    )
    processing_time = models.DurationField(
        null=True,
        blank=True,
        help_text='Time taken to generate prediction'
    )

    # Timestamps
    predicted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-predicted_at']
        indexes = [
            models.Index(fields=['drift_event', 'predicted_at']),
            models.Index(fields=['ml_model', 'predicted_at']),
            models.Index(fields=['confidence_score']),
        ]

    def __str__(self):
        return f"Prediction for {self.drift_event} by {self.ml_model.name}"


class DriftCauseAnalysis(models.Model):
    """Root cause analysis for drift events using ML/AI"""

    CAUSE_CATEGORIES = [
        ('emergency_fix', 'Emergency Fix'),
        ('manual_troubleshooting', 'Manual Troubleshooting'),
        ('security_response', 'Security Response'),
        ('configuration_error', 'Configuration Error'),
        ('automated_response', 'Automated Response'),
        ('unknown', 'Unknown Cause'),
    ]

    drift_event = models.OneToOneField(
        DriftEvent,
        on_delete=models.CASCADE,
        related_name='cause_analysis'
    )

    # Analysis results
    cause_category = models.CharField(
        max_length=50,
        choices=CAUSE_CATEGORIES
    )
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Confidence in the cause analysis (0.0-1.0)'
    )

    # Detailed analysis
    contributing_factors = models.JSONField(
        default=list,
        blank=True,
        help_text='Array of factor objects with evidence and weights'
    )
    temporal_context = models.JSONField(
        default=dict,
        blank=True,
        help_text='Time-based analysis (patterns, correlations)'
    )
    user_attribution = models.JSONField(
        default=dict,
        blank=True,
        help_text='Git commits, audit logs, user correlations'
    )

    # AI analysis (if applicable)
    ai_analysis_result = models.JSONField(
        default=dict,
        blank=True,
        help_text='Results from AI analysis (Gemini, etc.)'
    )
    natural_language_explanation = models.TextField(
        blank=True,
        help_text='Human-readable explanation of the cause'
    )

    # Metadata
    analyzed_by = models.CharField(
        max_length=50,
        default='ml_model',
        help_text='Analysis method used (ml_model, ai_agent, human)'
    )

    # Timestamps
    analyzed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-analyzed_at']
        indexes = [
            models.Index(fields=['drift_event']),
            models.Index(fields=['cause_category', 'confidence_score']),
            models.Index(fields=['analyzed_at']),
        ]

    def __str__(self):
        return f"Cause analysis for {self.drift_event}: {self.cause_category}"

    def get_primary_factors(self, limit=3):
        """Get the most important contributing factors"""
        if not self.contributing_factors:
            return []

        # Sort by weight/importance (assuming factors have weight field)
        sorted_factors = sorted(
            self.contributing_factors,
            key=lambda x: x.get('weight', 0),
            reverse=True
        )
        return sorted_factors[:limit]

    def get_evidence_summary(self):
        """Generate a summary of evidence supporting this analysis"""
        factors = self.get_primary_factors()
        evidence = []

        for factor in factors:
            evidence_type = factor.get('type', 'unknown')
            confidence = factor.get('confidence', 0)
            evidence.append(f"{evidence_type} ({confidence:.2f})")

        return "; ".join(evidence) if evidence else "No specific evidence"


class MLPerformanceMetric(models.Model):
    """Performance tracking for ML models over time"""

    ml_model = models.ForeignKey(
        MLModel,
        on_delete=models.CASCADE,
        related_name='performance_metrics'
    )

    # Evaluation period
    evaluation_date = models.DateField()

    # Training data info
    training_data_size = models.IntegerField()
    training_time = models.DurationField(null=True, blank=True)

    # Performance metrics
    accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    precision_macro = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    recall_macro = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    f1_score_macro = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    # Detailed metrics
    confusion_matrix = models.JSONField(
        default=dict,
        blank=True,
        help_text='Confusion matrix data'
    )
    feature_importance = models.JSONField(
        default=dict,
        blank=True,
        help_text='Updated feature importance scores'
    )
    cross_validation_scores = models.JSONField(
        default=dict,
        blank=True,
        help_text='Cross-validation results'
    )

    # Model drift detection
    model_drift_score = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Measure of model performance degradation'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['ml_model', 'evaluation_date']
        ordering = ['-evaluation_date']
        indexes = [
            models.Index(fields=['ml_model', 'evaluation_date']),
            models.Index(fields=['accuracy']),
        ]

    def __str__(self):
        return f"{self.ml_model.name} performance on {self.evaluation_date}"

    def has_performance_degraded(self, threshold=0.05):
        """Check if model performance has degraded compared to previous evaluation"""
        previous = MLPerformanceMetric.objects.filter(
            ml_model=self.ml_model,
            evaluation_date__lt=self.evaluation_date
        ).order_by('-evaluation_date').first()

        if not previous or not (self.accuracy and previous.accuracy):
            return False

        return (previous.accuracy - self.accuracy) > threshold
