from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Environment, CloudCredential

User = get_user_model()


class CloudCredentialSerializer(serializers.ModelSerializer):
    """Serializer for cloud credentials"""
    credential_type_display = serializers.CharField(source='get_credential_type_display', read_only=True)
    is_configured = serializers.BooleanField(read_only=True)

    class Meta:
        model = CloudCredential
        fields = [
            'id', 'environment', 'credential_type', 'credential_type_display',
            'name', 'is_active', 'last_used', 'created_at', 'updated_at', 'is_configured'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used', 'is_configured']
        # Hide sensitive fields in output, only show in write operations
        extra_kwargs = {
            'aws_access_key_id': {'write_only': True},
            'aws_secret_access_key': {'write_only': True},
            'aws_role_arn': {'write_only': True},
            'azure_client_id': {'write_only': True},
            'azure_client_secret': {'write_only': True},
            'azure_tenant_id': {'write_only': True},
            'gcp_service_account_key': {'write_only': True},
        }


class CloudCredentialCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cloud credentials with input validation"""

    class Meta:
        model = CloudCredential
        fields = [
            'environment', 'credential_type', 'name',
            'aws_access_key_id', 'aws_secret_access_key', 'aws_role_arn',
            'azure_client_id', 'azure_client_secret', 'azure_tenant_id',
            'gcp_service_account_key'
        ]

    def create(self, validated_data):
        creds = CloudCredential.objects.create(**validated_data)
        # Validate credentials by calling full_clean
        creds.full_clean()
        return creds


class EnvironmentSerializer(serializers.ModelSerializer):
    """Serializer for Environment model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    cloud_provider_display = serializers.CharField(source='get_cloud_provider_display', read_only=True)
    resource_count = serializers.IntegerField(read_only=True)
    drift_count = serializers.IntegerField(read_only=True)
    is_ready_for_scan = serializers.BooleanField(read_only=True)
    has_credentials = serializers.SerializerMethodField()

    class Meta:
        model = Environment
        fields = [
            'id', 'organization', 'organization_name', 'name', 'slug',
            'cloud_provider', 'cloud_provider_display', 'region', 'account_id',
            'tags', 'is_active', 'created_at', 'updated_at',
            'resource_count', 'drift_count', 'is_ready_for_scan', 'has_credentials'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resource_count',
            'drift_count', 'is_ready_for_scan', 'organization_name',
            'cloud_provider_display', 'has_credentials'
        ]

    def get_has_credentials(self, obj):
        """Check if environment has configured credentials"""
        return hasattr(obj, 'credentials') and obj.credentials.is_configured


class EnvironmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating environments"""

    class Meta:
        model = Environment
        fields = [
            'organization', 'name', 'slug', 'cloud_provider',
            'region', 'account_id', 'tags'
        ]

    def create(self, validated_data):
        env = Environment.objects.create(**validated_data)
        # Validate by calling full_clean
        env.full_clean()
        return env
