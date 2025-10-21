from rest_framework import viewsets

from apps.core.permissions import RoleBasedPermission
from .models import IACRepository, IACResource
from .serializers import IACRepositorySerializer, IACResourceSerializer


class IACRepositoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for IAC repository management
    """

    serializer_class = IACRepositorySerializer
    permission_classes = [RoleBasedPermission]
    ordering = ['-last_scanned']

    def get_queryset(self):
        """Filter repositories based on user organization"""
        user = self.request.user

        # Admin users can see all repositories
        if user.role == 'admin' or user.is_superuser:
            return IACRepository.objects.all()

        # Regular users see only repositories in their organization's environments
        if hasattr(user, 'organization'):
            return IACRepository.objects.filter(
                environment__organization=user.organization,
                environment__is_active=True
            )

        # Fallback: return empty queryset
        return IACRepository.objects.none()

    def perform_create(self, serializer):
        """Set environment from request if not provided"""
        # Environment should be provided in serializer, assuming user can specify
        serializer.save()


class IACResourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for IAC resource management
    """

    serializer_class = IACResourceSerializer
    permission_classes = [RoleBasedPermission]
    ordering = ['-last_scanned']

    def get_queryset(self):
        """Filter resources based on user organization"""
        user = self.request.user

        # Admin users can see all resources
        if user.role == 'admin' or user.is_superuser:
            return IACResource.objects.all()

        # Regular users see only resources in their organization's repositories
        if hasattr(user, 'organization'):
            return IACResource.objects.filter(
                iac_repository__environment__organization=user.organization,
                iac_repository__environment__is_active=True
            ).select_related('iac_repository', 'iac_repository__environment')

        # Fallback: return empty queryset
        return IACResource.objects.none()

    def perform_create(self, serializer):
        """Validate that iac_repository belongs to user's organization"""
        iac_repository = serializer.validated_data['iac_repository']
        if iac_repository.environment.organization != self.request.user.organization:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot create resource in repository outside your organization")

        serializer.save()
