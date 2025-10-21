from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import RoleBasedPermission
from .models import Recommendation, RecommendationTemplate, RecommendationFeedback
from .serializers import RecommendationSerializer, RecommendationTemplateSerializer, RecommendationFeedbackSerializer


class RecommendationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recommendation management
    """

    serializer_class = RecommendationSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['recommendation_type', 'priority', 'is_implemented', 'is_expired']
    ordering_fields = ['-confidence_score', '-created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter recommendations based on user's organization drifts"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return Recommendation.objects.all().select_related('drift_event')
        else:
            return Recommendation.objects.filter(
                drift_event__environment__organization=user.organization,
                drift_event__environment__is_active=True
            ).select_related('drift_event')

    @action(detail=True, methods=['post'], permission_classes=[RoleBasedPermission])
    def implement(self, request, pk=None):
        """Mark recommendation as implemented"""
        recommendation = self.get_object()
        result = request.data.get('result', {})
        recommendation.mark_implemented(result)
        serializer = self.get_serializer(recommendation)
        return Response(serializer.data)


class RecommendationTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recommendation template management (admin only)
    """

    serializer_class = RecommendationTemplateSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['recommendation_type', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        """Admin only access"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return RecommendationTemplate.objects.all()
        else:
            # Regular users can see active templates
            return RecommendationTemplate.objects.filter(is_active=True)


class RecommendationFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recommendation feedback
    """

    serializer_class = RecommendationFeedbackSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['feedback_type', 'user_id']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter feedback based on user's organization recommendations"""
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return RecommendationFeedback.objects.all().select_related('recommendation', 'recommendation__drift_event')
        else:
            return RecommendationFeedback.objects.filter(
                recommendation__drift_event__environment__organization=user.organization,
                recommendation__drift_event__environment__is_active=True
            ).select_related('recommendation', 'recommendation__drift_event')

    def perform_create(self, serializer):
        """Set user_id and role automatically"""
        serializer.save(
            user_id=self.request.user.id,
            user_role=self.request.user.role
        )
