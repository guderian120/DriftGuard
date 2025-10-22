from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import RoleBasedPermission
from .models import Organization, OrganizationSettings
from .serializers import (
    OrganizationSerializer, OrganizationSettingsSerializer,
    OrganizationMemberSerializer, OrganizationMemberInviteSerializer,
    OrganizationMemberUpdateSerializer
)


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

    def _user_is_admin_for_organization(self, user, organization):
        """Check if user is admin for the organization"""
        if user.is_superuser:
            return True

        # Organization admin if they are admin role in that organization
        return (user.role == 'admin' and
                hasattr(user, 'organization') and
                user.organization == organization)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members of the organization"""
        organization = self.get_object()

        if not self._user_has_access(request.user, organization):
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get all users in the organization
        users = organization.users.all().order_by('username')
        serializer = OrganizationMemberSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite_member(self, request, pk=None):
        """Invite a new user to join the organization"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can invite members'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = OrganizationMemberInviteSerializer(
            data=request.data,
            context={'organization': organization}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # For now, create the user directly (in production, you'd send an email invitation)
        # Generate a temporary password or use a proper invitation flow
        from django.contrib.auth.hashers import make_password
        from django.utils.crypto import get_random_string

        # Create user with temporary password
        temp_password = get_random_string(length=12)
        user_data = {
            'username': serializer.validated_data['email'].split('@')[0],  # Simple username generation
            'email': serializer.validated_data['email'],
            'first_name': serializer.validated_data.get('first_name', ''),
            'last_name': serializer.validated_data.get('last_name', ''),
            'password': make_password(temp_password),
            'organization': organization,
            'role': serializer.validated_data['role'],
            'is_active': True
        }

        # Create the user
        from apps.core.models import User
        try:
            user = User.objects.create(**user_data)

            # In production: Send invitation email with temp password or activation link
            # For now, return the user data and note about temp password
            response_data = OrganizationMemberSerializer(user).data
            response_data['_temp_password'] = temp_password  # Remove this in production!
            response_data['note'] = 'User created with temporary password. In production, send invitation email.'

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['put'], url_path=r'members/(?P<user_id>\d+)')
    def update_member(self, request, pk=None, user_id=None):
        """Update a member's role/status"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can update members'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.core.models import User
        try:
            user = User.objects.get(id=user_id, organization=organization)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found in this organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent changing the last admin's role
        if user.role == 'admin' and request.data.get('role') != 'admin':
            admin_count = organization.users.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'error': 'Cannot change role of the last organization administrator'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = OrganizationMemberUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(OrganizationMemberSerializer(user).data)

    @action(detail=True, methods=['delete'], url_path=r'members/(?P<user_id>\d+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the organization"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.core.models import User
        try:
            user = User.objects.get(id=user_id, organization=organization)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found in this organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent removing the last admin
        if user.role == 'admin':
            admin_count = organization.users.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'error': 'Cannot remove the last organization administrator'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Prevent users from removing themselves
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot remove yourself from the organization'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response({'message': 'Member removed successfully'})


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

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members of the organization"""
        organization = self.get_object()

        if not self._user_has_access(request.user, organization):
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get all users in the organization
        users = organization.users.all().order_by('username')
        serializer = OrganizationMemberSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite_member(self, request, pk=None):
        """Invite a new user to join the organization"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can invite members'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = OrganizationMemberInviteSerializer(
            data=request.data,
            context={'organization': organization}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # For now, create the user directly (in production, you'd send an email invitation)
        # Generate a temporary password or use a proper invitation flow
        from django.contrib.auth.hashers import make_password
        from django.utils.crypto import get_random_string

        # Create user with temporary password
        temp_password = get_random_string(length=12)
        user_data = {
            'username': serializer.validated_data['email'].split('@')[0],  # Simple username generation
            'email': serializer.validated_data['email'],
            'first_name': serializer.validated_data.get('first_name', ''),
            'last_name': serializer.validated_data.get('last_name', ''),
            'password': make_password(temp_password),
            'organization': organization,
            'role': serializer.validated_data['role'],
            'is_active': True
        }

        # Create the user
        from apps.core.models import User
        try:
            user = User.objects.create(**user_data)

            # In production: Send invitation email with temp password or activation link
            # For now, return the user data and note about temp password
            response_data = OrganizationMemberSerializer(user).data
            response_data['_temp_password'] = temp_password  # Remove this in production!
            response_data['note'] = 'User created with temporary password. In production, send invitation email.'

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['put'], url_path=r'members/(?P<user_id>\d+)')
    def update_member(self, request, pk=None, user_id=None):
        """Update a member's role/status"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can update members'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.core.models import User
        try:
            user = User.objects.get(id=user_id, organization=organization)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found in this organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent changing the last admin's role
        if user.role == 'admin' and request.data.get('role') != 'admin':
            admin_count = organization.users.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'error': 'Cannot change role of the last organization administrator'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = OrganizationMemberUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(OrganizationMemberSerializer(user).data)

    @action(detail=True, methods=['delete'], url_path=r'members/(?P<user_id>\d+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the organization"""
        organization = self.get_object()

        if not self._user_is_admin_for_organization(request.user, organization):
            return Response(
                {'error': 'Only organization administrators can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.core.models import User
        try:
            user = User.objects.get(id=user_id, organization=organization)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found in this organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent removing the last admin
        if user.role == 'admin':
            admin_count = organization.users.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'error': 'Cannot remove the last organization administrator'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Prevent users from removing themselves
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot remove yourself from the organization'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response({'message': 'Member removed successfully'})
