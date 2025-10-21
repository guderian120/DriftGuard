from django.utils import timezone
from django.db import models

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import RoleBasedPermission
from .models import DriftEvent
from .serializers import DriftEventSerializer


class DriftEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for drift event management
    """

    serializer_class = DriftEventSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['drift_type', 'resolved_at', 'severity_score']
    ordering_fields = ['detected_at', 'severity_score', '-created_at']
    ordering = ['-detected_at']

    def get_queryset(self):
        """Filter drift events based on user organization"""
        user = self.request.user
        queryset = DriftEvent.objects.select_related('environment', 'iac_resource')

        # Admin users can see all drift events
        if user.role == 'admin' or user.is_superuser:
            return queryset

        # Regular users see only drift events in their organization's environments
        if hasattr(user, 'organization'):
            return queryset.filter(
                environment__organization=user.organization,
                environment__is_active=True
            )

        # Fallback: return empty queryset
        return queryset.none()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def analyze(self, request, pk=None):
        """Trigger AI analysis for drift event"""
        drift_event = self.get_object()

        # Check permissions
        if drift_event.environment.organization != request.user.organization and \
           not (request.user.role == 'admin' or request.user.is_superuser):
            return Response(
                {'error': 'Cannot analyze drift in another organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if already analyzed
        if hasattr(drift_event, 'cause_analysis'):
            return Response(
                {'error': 'Drift already analyzed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Trigger async analysis
            from apps.ml.tasks import analyze_drift_task

            # For now, run synchronously for simplicity
            result = analyze_drift_task(drift_event.id, request.data.get('context', {}))

            return Response({
                'status': 'completed',
                'result': result,
                'analyzed_at': timezone.now()
            })

        except Exception as e:
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def resolve(self, request, pk=None):
        """Resolve a drift event"""
        drift_event = self.get_object()

        # Check permissions
        if drift_event.environment.organization != request.user.organization and \
           not (request.user.role == 'admin' or request.user.is_superuser):
            from rest_framework import status
            return Response(
                {'error': 'Cannot resolve drift in another organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        drift_event.resolved_at = timezone.now()
        drift_event.resolution_type = request.data.get('resolution_type', 'accepted')
        drift_event.resolution_notes = request.data.get('resolution_notes', '')
        drift_event.save()

        serializer = self.get_serializer(drift_event)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        """Get drift summary for user's organization"""
        user = self.request.user
        queryset = self.get_queryset()

        # Aggregate data
        total_drifts = queryset.count()
        resolved_drifts = queryset.filter(resolved_at__isnull=False).count()
        unresolved_drifts = total_drifts - resolved_drifts
        avg_severity = queryset.aggregate(avg=models.Avg('severity_score'))['avg'] or 0

        return Response({
            'total_drifts': total_drifts,
            'resolved_drifts': resolved_drifts,
            'unresolved_drifts': unresolved_drifts,
            'average_severity': round(avg_severity, 3),
        })
