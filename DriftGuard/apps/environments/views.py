from rest_framework import viewsets

from apps.core.permissions import RoleBasedPermission
from .models import Environment
from .serializers import EnvironmentSerializer


class EnvironmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for environment management
    """

    serializer_class = EnvironmentSerializer
    permission_classes = [RoleBasedPermission]
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter environments based on user organization"""
        user = self.request.user

        # Admin users can see all environments
        if user.role == 'admin' or user.is_superuser:
            return Environment.objects.all()

        # Regular users see only their organization's environments
        if hasattr(user, 'organization'):
            return Environment.objects.filter(
                organization=user.organization,
                is_active=True
            )

        # Fallback: return empty queryset
        return Environment.objects.none()

    def perform_create(self, serializer):
        """Set organization to user's organization"""
        serializer.save(organization=self.request.user.organization)
