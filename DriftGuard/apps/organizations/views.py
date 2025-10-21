from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import RoleBasedPermission
from .models import Organization, OrganizationSettings
from .serializers import OrganizationSerializer, OrganizationSettingsSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for organization management
    """

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter organizations based on user role"""
        user = self.request.user

        # Admin users can see all organizations
        if user.role == 'admin' or user.is_superuser:
            return Organization.objects.all()

        # Regular users see only their organization
        if hasattr(user, 'organization'):
            return Organization.objects.filter(id=user.organization.id)

        # Fallback: return empty queryset
        return Organization.objects.none()

    def perform_create(self, serializer):
        """Only admins can create organizations"""
        if self.request.user.role != 'admin' and not self.request.user.is_superuser:
            self.permission_denied(
                self.request,
                message="Only administrators can create organizations",
                code="permission_denied"
            )

        serializer.save()

    def perform_update(self, serializer):
        """Only admins can update organizations"""
        if self.request.user.role != 'admin' and not self.request.user.is_superuser:
            self.permission_denied(
                self.request,
                message="Only administrators can update organizations",
                code="permission_denied"
            )

        serializer.save()

    def perform_destroy(self, serializer):
        """Only admins can delete organizations"""
        if self.request.user.role != 'admin' and not self.request.user.is_superuser:
            self.permission_denied(
                self.request,
                message="Only administrators can delete organizations",
                code="permission_denied"
            )

        serializer.delete()

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get organization statistics"""
        organization = self.get_object()

        if not self._user_has_access(request.user, organization):
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Calculate stats (placeholder for now)
        stats = {
            'users_count': organization.users.count(),
            'active_users_count': organization.users.filter(is_active=True).count(),
            'environments_count': organization.environments.count(),
            'active_environments_count': organization.environments.filter(is_active=True).count(),
            'drift_events_count': organization.environments.filter(
                drift_events__isnull=False
            ).values('drift_events').count(),
        }

        return Response(stats)

    def _user_has_access(self, user, organization):
        """Check if user has access to organization"""
        if user.role == 'admin' or user.is_superuser:
            return True

        return hasattr(user, 'organization') and user.organization == organization


class OrganizationSettingsView(APIView):
    """
    API view for organization settings management
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Get organization settings"""
        organization = get_object_or_404(Organization, pk=pk)

        if not self._user_has_access(request.user, organization):
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings, created = OrganizationSettings.objects.get_or_create(
            organization=organization
        )

        serializer = OrganizationSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update organization settings"""
        organization = get_object_or_404(Organization, pk=pk)

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization admins can update settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings, created = OrganizationSettings.objects.get_or_create(
            organization=organization
        )

        serializer = OrganizationSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _user_has_access(self, user, organization):
        """Check if user has access to organization"""
        if user.role == 'admin' or user.is_superuser:
            return True

        return hasattr(user, 'organization') and user.organization == organization

    def _user_is_admin_for_organization(self, user, organization):
        """Check if user is admin for the organization"""
        if user.is_superuser:
            return True

        # Organization admin if they are admin role in that organization
        return (user.role == 'admin' and
                hasattr(user, 'organization') and
                user.organization == organization)
