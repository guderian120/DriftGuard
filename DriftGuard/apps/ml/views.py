from rest_framework import viewsets

from apps.core.permissions import RoleBasedPermission
from .models import MLModel, MLPrediction, DriftCauseAnalysis, MLPerformanceMetric
from .serializers import MLModelSerializer, MLPredictionSerializer, DriftCauseAnalysisSerializer, MLPerformanceMetricSerializer


class MLModelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ML model management
    """

    serializer_class = MLModelSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['model_type', 'framework', 'is_active']
    ordering_fields = ['-deployed_at', 'name']
    ordering = ['-deployed_at']

    def get_queryset(self):
        """Filter models - admin can see all, users see active models"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return MLModel.objects.all()
        else:
            # Regular users can see active models
            return MLModel.objects.filter(is_active=True)


class MLPredictionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ML predictions
    """

    serializer_class = MLPredictionSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['ml_model', 'predicted_class']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter predictions based on user's organization drifts"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return MLPrediction.objects.all().select_related('drift_event', 'ml_model')
        else:
            return MLPrediction.objects.filter(
                drift_event__environment__organization=user.organization,
                drift_event__environment__is_active=True
            ).select_related('drift_event', 'ml_model')


class DriftCauseAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drift cause analysis
    """

    serializer_class = DriftCauseAnalysisSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['cause_category']
    ordering_fields = ['-analyzed_at', 'confidence_score']
    ordering = ['-analyzed_at']

    def get_queryset(self):
        """Filter analyses based on user's organization drifts"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return DriftCauseAnalysis.objects.all().select_related('drift_event')
        else:
            return DriftCauseAnalysis.objects.filter(
                drift_event__environment__organization=user.organization,
                drift_event__environment__is_active=True
            ).select_related('drift_event')


class MLPerformanceMetricViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ML performance metrics
    """

    serializer_class = MLPerformanceMetricSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['ml_model']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter metrics - admin can see all, users see active models"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return MLPerformanceMetric.objects.all().select_related('ml_model')
        else:
            # Regular users can see metrics for active models
            return MLPerformanceMetric.objects.filter(
                ml_model__is_active=True
            ).select_related('ml_model')
