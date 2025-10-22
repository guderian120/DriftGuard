from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import OrganizationPermission
from .models import Environment, CloudCredential
from .serializers import (
    EnvironmentSerializer,
    EnvironmentCreateSerializer,
    CloudCredentialSerializer,
    CloudCredentialCreateSerializer
)


class EnvironmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cloud environments
    """
    serializer_class = EnvironmentSerializer
    permission_classes = [IsAuthenticated, OrganizationPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'cloud_provider', 'is_active', 'region']

    def get_serializer_class(self):
        if self.action == 'create':
            return EnvironmentCreateSerializer
        return EnvironmentSerializer

    def get_queryset(self):
        """Filter environments by user's organization"""
        return Environment.objects.filter(organization=self.request.user.organization).select_related('organization')

    def perform_create(self, serializer):
        """Set organization to user's organization"""
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=['post'])
    def credentials(self, request, pk=None):
        """Set credentials for an environment"""
        environment = self.get_object()

        # Check if credentials already exist
        existing_creds = CloudCredential.objects.filter(environment=environment).first()
        if existing_creds:
            serializer = CloudCredentialCreateSerializer(existing_creds, data=request.data, partial=True)
        else:
            request.data['environment'] = environment.id
            serializer = CloudCredentialCreateSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED if not existing_creds else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def get_credentials(self, request, pk=None):
        """Get credentials for an environment"""
        environment = self.get_object()
        try:
            credentials = CloudCredential.objects.get(environment=environment)
            serializer = CloudCredentialSerializer(credentials)
            return Response(serializer.data)
        except CloudCredential.DoesNotExist:
            return Response({'message': 'No credentials configured'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def scan(self, request, pk=None):
        """Trigger a drift scan for this environment"""
        environment = self.get_object()

        # Check if environment has credentials
        if not hasattr(environment, 'credentials') or not environment.credentials.is_configured:
            return Response({
                'error': 'Environment has no valid credentials configured'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # TODO: Implement actual cloud API scanning
            # For now, return success with mock message
            return Response({
                'message': f'Drift scan initiated for {environment.name}',
                'status': 'success'
            })
        except Exception as e:
            return Response({
                'error': f'Failed to scan environment: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CloudCredentialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cloud credentials
    """
    serializer_class = CloudCredentialSerializer
    permission_classes = [IsAuthenticated, OrganizationPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['credential_type', 'is_active']

    def get_serializer_class(self):
        if self.action == 'create':
            return CloudCredentialCreateSerializer
        return CloudCredentialSerializer

    def get_queryset(self):
        """Filter credentials by user's organization through environment relationship"""
        return CloudCredential.objects.filter(
            environment__organization=self.request.user.organization
        ).select_related('environment', 'environment__organization')
