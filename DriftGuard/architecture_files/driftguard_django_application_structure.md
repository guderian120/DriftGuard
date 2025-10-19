# DriftGuard MVP Django Application Structure

## Overview
DriftGuard is built on Django 4.x with Django REST Framework, following a modular, scalable architecture that supports multi-tenancy, real-time processing, and AI-powered analysis. The application provides both REST APIs and a modern web dashboard.

## Project Structure

```
driftguard/
├── config/                          # Project configuration
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings/
│   │   ├── base.py                  # Common settings
│   │   ├── development.py           # Dev environment
│   │   ├── production.py            # Production environment
│   │   └── testing.py              # Test environment
│   ├── urls.py                      # Root URL configuration
│   └── wsgi.py
├── apps/                            # Django applications
│   ├── core/                        # Core functionality
│   ├── organizations/               # Multi-tenancy & org management
│   ├── environments/                # Cloud environment management
│   ├── iac/                         # Infrastructure as Code integration
│   ├── drifts/                      # Drift detection & management
│   ├── ml/                          # Machine learning integration
│   ├── recommendations/             # AI recommendations
│   ├── correlations/                # Cross-system correlations
│   ├── notifications/               # Alerting & notifications
│   ├── analytics/                   # Reporting & analytics
│   └── dashboard/                   # Web dashboard
├── services/                        # External service integrations
│   ├── aws/                         # AWS service integrations
│   ├── gcp/                         # GCP service integrations
│   ├── azure/                       # Azure service integrations
│   ├── terraform/                   # Terraform Cloud integration
│   ├── kubernetes/                  # K8s integration
│   └── gemini/                      # Google Gemini AI integration
├── utils/                           # Utility functions
│   ├── crypto.py                    # Encryption utilities
│   ├── async_tasks.py               # Celery task helpers
│   ├── metrics.py                   # Monitoring helpers
│   └── validation.py                # Custom validators
├── management/                      # Django management commands
│   └── commands/
├── static/                          # Static files
├── templates/                       # HTML templates
└── media/                          # User-uploaded files
```

## Core Application Architecture

### Configuration (config/)

#### Environment-Based Settings
```python
# config/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Core Django settings
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'default-insecure-key')
DEBUG = False
ALLOWED_HOSTS = ['driftguard.example.com']

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'driftguard'),
        'USER': os.environ.get('DB_USER', 'driftguard_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Application definitions
INSTALLED_APPS = [
    # Django core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'corsheaders',
    'django_celery_beat',
    'django_prometheus',

    # Local applications
    'apps.core',
    'apps.organizations',
    'apps.environments',
    'apps.iac',
    'apps.drifts',
    'apps.ml',
    'apps.recommendations',
    'apps.correlations',
    'apps.notifications',
    'apps.analytics',
    'apps.dashboard',
]
```

### Core Application (apps/core/)

#### Models (models.py)
```python
from django.db import models
from django.contrib.auth.models import AbstractUser

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

class TimestampedModel(models.Model):
    """Base model with automatic timestamps"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

#### Permissions (permissions.py)
```python
from rest_framework.permissions import BasePermission

class OrganizationPermission(BasePermission):
    """
    Permission class for organization-scoped access
    """

    def has_object_permission(self, request, view, obj):
        # Check if user has access to organization's resources
        return obj.organization == request.user.organization

class RoleBasedPermission(BasePermission):
    """
    Permission class for role-based access control
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Define permissions per action
        action_permissions = {
            'GET': ['viewer', 'editor', 'admin'],
            'POST': ['editor', 'admin'],
            'PUT': ['editor', 'admin'],
            'PATCH': ['editor', 'admin'],
            'DELETE': ['admin'],
        }

        required_roles = action_permissions.get(request.method, [])
        return request.user.role in required_roles
```

## Modular Applications

### 1. Organizations App (apps/organizations/)

#### Models
```python
class Organization(TimestampedModel):
    """Organization/tenant model"""

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    contact_email = models.EmailField()
    is_active = models.BooleanField(default=True)

class OrganizationSettings(models.Model):
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
    slack_webhook_url = models.URLField(blank=True)

    # Security settings
    audit_logging = models.BooleanField(default=True)
    session_timeout = models.PositiveIntegerField(default=3600)  # seconds
```

#### Views
```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, OrganizationAdminPermission]

    @action(detail=True, methods=['get', 'put'])
    def settings(self, request, pk=None):
        """Get/update organization settings"""
        organization = self.get_object()

        if request.method == 'GET':
            settings = get_object_or_404(OrganizationSettings, organization=organization)
            serializer = OrganizationSettingsSerializer(settings)
            return Response(serializer.data)

        elif request.method == 'PUT':
            settings, created = OrganizationSettings.objects.get_or_create(
                organization=organization,
                defaults={}
            )
            serializer = OrganizationSettingsSerializer(settings, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
```

### 2. Drifts App (apps/drifts/)

#### Models
```python
class DriftEvent(TimestampedModel):
    """Core drift event model"""

    environment = models.ForeignKey(
        'environments.Environment',
        on_delete=models.CASCADE,
        related_name='drift_events'
    )

    iac_resource = models.ForeignKey(
        'iac.IacResource',
        on_delete=models.SET_NULL,
        null=True,
        related_name='drift_events'
    )

    drift_type = models.CharField(
        max_length=50,
        choices=[
            ('modified', 'Modified'),
            ('deleted', 'Deleted'),
            ('added', 'Added'),
            ('moved', 'Moved'),
        ]
    )

    actual_state = models.JSONField()  # Current cloud state
    declared_state = models.JSONField(null=True)  # IaC declared state
    detected_at = models.DateTimeField()

    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_type = models.CharField(
        max_length=20,
        choices=[
            ('auto_revert', 'Auto Revert'),
            ('codify_iac', 'Codify in IaC'),
            ('accepted', 'Accepted as Exception'),
            ('escalated', 'Escalated for Review'),
        ],
        null=True,
        blank=True
    )

    severity_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        null=True
    )

    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        null=True
    )

    risk_assessment = models.JSONField(default=dict)
    tags = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['environment', '-detected_at']),
            models.Index(fields=['resolved_at']),
        ]

class DriftChange(TimestampedModel):
    """Individual changes within a drift event"""

    drift_event = models.ForeignKey(
        DriftEvent,
        on_delete=models.CASCADE,
        related_name='changes'
    )

    property_path = models.CharField(max_length=500)
    declared_value = models.JSONField(null=True)
    actual_value = models.JSONField(null=True)

    change_type = models.CharField(
        max_length=20,
        choices=[
            ('modified', 'Modified'),
            ('added', 'Added'),
            ('removed', 'Removed'),
        ]
    )

    is_security_critical = models.BooleanField(default=False)
```

#### Serializers
```python
class DriftChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriftChange
        fields = '__all__'

class DriftEventSerializer(serializers.ModelSerializer):
    changes = DriftChangeSerializer(many=True, read_only=True)
    environment_name = serializers.CharField(source='environment.name', read_only=True)
    resource_type = serializers.CharField(source='iac_resource.resource_type', read_only=True)
    resource_id = serializers.CharField(source='iac_resource.resource_id', read_only=True)

    class Meta:
        model = DriftEvent
        fields = [
            'id', 'drift_type', 'actual_state', 'declared_state',
            'detected_at', 'resolved_at', 'resolution_type',
            'severity_score', 'confidence_score', 'risk_assessment',
            'tags', 'metadata', 'changes', 'environment_name',
            'resource_type', 'resource_id'
        ]
        read_only_fields = ['id', 'detected_at']
```

#### Views
```python
class DriftViewSet(viewsets.ModelViewSet):
    serializer_class = DriftEventSerializer
    filterset_class = DriftFilter
    pagination_class = CursorPagination

    def get_queryset(self):
        """Filter drifts by user's organization"""
        user = self.request.user
        return DriftEvent.objects.filter(
            environment__organization=user.organization
        ).select_related('environment', 'iac_resource')

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """Trigger AI analysis for drift"""
        drift = self.get_object()

        # Queue async analysis job
        from apps.ml.tasks import analyze_drift_task

        task = analyze_drift_task.delay(drift.id, request.data.get('context', {}))

        return Response({
            'job_id': str(task.id),
            'status': 'queued',
            'estimated_completion': timezone.now() + timedelta(seconds=30)
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['put'])
    def resolve(self, request, pk=None):
        """Resolve a drift event"""
        drift = self.get_object()
        serializer = DriftResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resolution_data = serializer.validated_data
        drift.resolved_at = timezone.now()
        drift.resolution_type = resolution_data['resolution_type']
        drift.save()

        # Log resolution for audit
        AuditLog.objects.create(
            user=request.user,
            action='resolve_drift',
            resource_type='drift',
            resource_id=str(drift.id),
            new_values={'resolution_type': resolution_data['resolution_type']}
        )

        return Response({'status': 'resolved'})
```

### 3. ML App (apps/ml/)

#### Models
```python
class MLModel(TimestampedModel):
    """Machine learning model registry"""

    name = models.CharField(max_length=255, unique=True)
    version = models.CharField(max_length=50)
    model_type = models.CharField(
        max_length=50,
        choices=[
            ('classification', 'Classification'),
            ('regression', 'Regression'),
            ('clustering', 'Clustering'),
        ]
    )

    framework = models.CharField(max_length=50)  # xgboost, sklearn, tensorflow
    artifact_path = models.CharField(max_length=500)  # Path to stored model
    features = models.JSONField()  # List of input features
    target_classes = models.JSONField(null=True)  # For classification models
    metrics = models.JSONField(default=dict)
    is_active = models.BooleanField(default=False)

    trained_at = models.DateTimeField()
    deployed_at = models.DateTimeField(null=True, blank=True)

class MLPrediction(TimestampedModel):
    """Stored ML predictions for drift events"""

    drift_event = models.ForeignKey(
        'drifts.DriftEvent',
        on_delete=models.CASCADE,
        related_name='ml_predictions'
    )

    ml_model = models.ForeignKey(
        MLModel,
        on_delete=models.CASCADE,
        related_name='predictions'
    )

    prediction_result = models.JSONField()  # Model outputs
    prediction_metadata = models.JSONField(default=dict)  # Feature importance, etc.
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
```

#### ML Integration Service
```python
class MLService:
    """Service for interacting with ML models"""

    def __init__(self):
        self.models = {}  # Cache loaded models
        self.scalers = {}  # Cache fitted scalers

    def load_model(self, model_name):
        """Load ML model from storage"""
        if model_name not in self.models:
            model_file = f'/models/{model_name}.pkl'
            with open(model_file, 'rb') as f:
                self.models[model_name] = pickle.load(f)

            scaler_file = f'/models/{model_name}_scaler.pkl'
            if os.path.exists(scaler_file):
                with open(scaler_file, 'rb') as f:
                    self.scalers[model_name] = pickle.load(f)

        return self.models[model_name]

    def predict_drift_cause(self, drift_features):
        """Predict root cause of drift"""
        model = self.load_model('drift_cause_classifier_v1')
        scaler = self.scalers.get('drift_cause_classifier_v1')

        if scaler:
            features_scaled = scaler.transform([drift_features])
        else:
            features_scaled = [drift_features]

        prediction = model.predict(features_scaled)
        probabilities = model.predict_proba(features_scaled)

        return {
            'cause_category': prediction[0],
            'probabilities': dict(zip(model.classes_, probabilities[0])),
            'confidence': max(probabilities[0])
        }

    def calculate_severity(self, drift_features):
        """Calculate drift severity score"""
        model = self.load_model('severity_predictor_v1')
        scaler = self.scalers.get('severity_predictor_v1')

        if scaler:
            features_scaled = scaler.transform([drift_features])
        else:
            features_scaled = [drift_features]

        severity_scores = model.predict(features_scaled)

        return {
            'security': severity_scores[0][0],
            'performance': severity_scores[0][1],
            'cost': severity_scores[0][2],
            'compliance': severity_scores[0][3],
            'overall': max(severity_scores[0])
        }
```

### 4. Recommendations App (apps/recommendations/)

#### Models
```python
class Recommendation(TimestampedModel):
    """AI-generated recommendations for drift events"""

    drift_event = models.ForeignKey(
        'drifts.DriftEvent',
        on_delete=models.CASCADE,
        related_name='recommendations'
    )

    recommendation_type = models.CharField(
        max_length=30,
        choices=[
            ('auto_revert', 'Auto Revert'),
            ('codify_iac', 'Codify in IaC'),
            ('escalate_review', 'Escalate for Review'),
            ('accept_exception', 'Accept Exception'),
            ('manual_review', 'Manual Review'),
        ]
    )

    priority = models.CharField(
        max_length=10,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ]
    )

    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )

    rationale = models.TextField()
    implementation_steps = models.JSONField(default=list)
    risk_assessment = models.JSONField(default=dict)
    estimated_effort = models.CharField(max_length=20, null=True, blank=True)
    recommended_by = models.CharField(max_length=50)  # ml_model, ai_agent, human

    implemented_at = models.DateTimeField(null=True, blank=True)
    implementation_result = models.JSONField(null=True)

    expires_at = models.DateTimeField(null=True, blank=True)
```

#### Recommendation Engine
```python
class RecommendationEngine:
    """Generate intelligent recommendations based on ML analysis"""

    def generate_recommendations(self, drift_event, ml_analysis, context):
        """Generate recommendations for a drift event"""

        recommendations = []

        # High-confidence predictions get automated recommendations
        if ml_analysis['confidence_score'] >= 0.8:

            if ml_analysis['cause_category'] == 'configuration_error':
                recommendations.append(self._create_auto_revert_recommendation(
                    drift_event, ml_analysis
                ))

            elif ml_analysis['cause_category'] == 'emergency_fix':
                recommendations.append(self._create_codify_recommendation(
                    drift_event, ml_analysis
                ))

            elif ml_analysis['cause_category'] == 'security_response':
                recommendations.append(self._create_review_recommendation(
                    drift_event, ml_analysis, priority='critical'
                ))

        # Context-based recommendations
        if self._is_production_environment(drift_event.environment):
            if ml_analysis['severity']['security'] > 0.7:
                recommendations.append(self._create_escalate_recommendation(
                    drift_event, 'Security impact requires CISO review'
                ))

        # Default recommendation if no high-confidence predictions
        if not recommendations:
            recommendations.append(self._create_manual_review_recommendation(
                drift_event
            ))

        return recommendations

    def _create_auto_revert_recommendation(self, drift_event, ml_analysis):
        """Create auto-revert recommendation"""
        return Recommendation(
            drift_event=drift_event,
            recommendation_type='auto_revert',
            priority='medium',
            confidence_score=ml_analysis['confidence_score'],
            rationale='High-confidence classification as configuration error suggests automatic reversion',
            implementation_steps=[
                'Validate Terraform/CloudFormation has correct state',
                'Execute terraform plan to confirm changes',
                'Apply changes through automated pipeline',
                'Verify no unintended side effects'
            ],
            estimated_effort='minutes',
            recommended_by='ml_model',
            expires_at=timezone.now() + timedelta(hours=24)
        )
```

### 5. Dashboard App (apps/dashboard/)

#### Views
```python
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from rest_framework.decorators import api_view
from rest_framework.response import Response

@method_decorator(login_required, name='dispatch')
class DashboardView(TemplateView):
    """Main dashboard view"""

    template_name = 'dashboard/index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Recent drifts for the user's organization
        recent_drifts = DriftEvent.objects.filter(
            environment__organization=self.request.user.organization
        ).select_related('environment', 'iac_resource')[:10]

        # Dashboard stats
        stats = self._calculate_stats()

        context.update({
            'recent_drifts': recent_drifts,
            'stats': stats,
        })

        return context

    def _calculate_stats(self):
        """Calculate dashboard statistics"""
        org = self.request.user.organization
        thirty_days_ago = timezone.now() - timedelta(days=30)

        drifts = DriftEvent.objects.filter(
            environment__organization=org,
            detected_at__gte=thirty_days_ago
        )

        return {
            'total_drifts': drifts.count(),
            'resolved_drifts': drifts.filter(resolved_at__isnull=False).count(),
            'unresolved_drifts': drifts.filter(resolved_at__isnull=True).count(),
            'avg_resolution_time': self._calculate_avg_resolution_time(drifts),
        }

@login_required
def drift_detail_view(request, drift_id):
    """Detailed drift view with analysis and recommendations"""
    drift = get_object_or_404(
        DriftEvent,
        id=drift_id,
        environment__organization=request.user.organization
    )

    # Get analysis data via API (or from cache)
    analysis_data = get_cached_analysis(drift.id)

    return render(request, 'dashboard/drift_detail.html', {
        'drift': drift,
        'analysis': analysis_data,
    })

@api_view(['GET'])
@login_required
def dashboard_api(request):
    """API endpoint for dashboard data"""
    org = request.user.organization

    # Get metrics summary
    metrics = calculate_organization_metrics(org)

    return Response(metrics)
```

#### Templates Structure
```
templates/
├── base.html
└── dashboard/
    ├── index.html
    ├── drift_detail.html
    ├── environments.html
    ├── recommendations.html
    └── settings.html
```

## Asynchronous Task Processing

### Celery Configuration
```python
# config/celery.py
import os
from celery import Celery

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('driftguard')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

### ML Tasks (apps/ml/tasks.py)
```python
@shared_task(bind=True)
def analyze_drift_task(self, drift_id, context_data=None):
    """Async task for drift analysis"""

    # Import here to avoid circular imports
    from apps.drifts.models import DriftEvent
    from apps.ml.service import MLService

    drift = DriftEvent.objects.get(id=drift_id)
    ml_service = MLService()

    # Feature engineering
    features = extract_drift_features(drift, context_data or {})

    # ML analysis
    cause_analysis = ml_service.predict_drift_cause(features)
    severity = ml_service.calculate_severity(features)

    # Save results
    DriftCauseAnalysis.objects.create(
        drift_event=drift,
        cause_category=cause_analysis['cause_category'],
        confidence_score=cause_analysis['confidence'],
        temporal_context=context_data,
    )

    # Update drift with severity
    drift.severity_score = severity['overall']
    drift.confidence_score = cause_analysis['confidence']
    drift.save()

    # Generate recommendations
    engine = RecommendationEngine()
    recommendations = engine.generate_recommendations(drift, cause_analysis, context_data)

    for rec in recommendations:
        rec.save()

    return {
        'cause_category': cause_analysis['cause_category'],
        'severity': severity,
        'recommendation_count': len(recommendations)
    }
```

## Testing Strategy

### Test Structure
```
tests/
├── unit/
│   ├── test_models.py
│   ├── test_serializers.py
│   └── test_services.py
├── integration/
│   ├── test_api_endpoints.py
│   ├── test_ml_pipeline.py
│   └── test_async_tasks.py
├── e2e/
│   └── test_user_workflows.py
└── fixtures/
    ├── drift_events.json
    └── organizations.json
```

### Example Test Case
```python
import pytest
from django.test import TestCase
from rest_framework.test import APITestCase
from apps.drifts.models import DriftEvent

class DriftAPITestCase(APITestCase):
    fixtures = ['organizations', 'drift_events']

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass',
            organization=Organization.objects.first()
        )
        self.client.force_authenticate(user=self.user)

    def test_list_drifts(self):
        """Test drift list endpoint"""
        response = self.client.get('/api/v1/drifts/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.data)
        self.assertIn('pagination', response.data)

    def test_resolve_drift(self):
        """Test drift resolution"""
        drift = DriftEvent.objects.filter(resolved_at__isnull=True).first()
        response = self.client.put(
            f'/api/v1/drifts/{drift.id}/resolve/',
            {'resolution_type': 'codify_iac'}
        )
        self.assertEqual(response.status_code, 200)
        drift.refresh_from_db()
        self.assertIsNotNone(drift.resolved_at)
```

## Deployment Configuration

### Docker Setup
```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run the application
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Kubernetes Manifests
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: driftguard-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: driftguard-api
  template:
    metadata:
      labels:
        app: driftguard-api
    spec:
      containers:
      - name: api
        image: driftguard/api:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: driftguard-config
        - secretRef:
            name: driftguard-secrets
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health/
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 30
```

This Django application structure provides a scalable, maintainable foundation for the DriftGuard MVP with clear separation of concerns, comprehensive testing, and production-ready deployment configuration.
