from rest_framework import serializers

from .models import IACRepository, IACResource


class IACRepositorySerializer(serializers.ModelSerializer):
    """Serializer for IACRepository model"""

    environment_name = serializers.CharField(
        source='environment.name',
        read_only=True
    )
    resource_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IACRepository
        fields = [
            'id', 'environment', 'environment_name', 'name', 'repository_url',
            'branch', 'tool', 'last_sync_at', 'resource_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'resource_count']

    def get_resource_count(self, obj):
        """Get count of resources in repository"""
        return obj.resources.count()


class IACResourceSerializer(serializers.ModelSerializer):
    """Serializer for IACResource model"""

    iac_repository_name = serializers.CharField(
        source='iac_repository.name',
        read_only=True
    )
    environment_name = serializers.CharField(
        source='environment.name',
        read_only=True
    )
    has_drift = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IACResource
        fields = [
            'id', 'iac_repository', 'iac_repository_name', 'environment_name',
            'resource_type', 'resource_id', 'declared_state',
            'has_drift', 'last_sync_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'has_drift',
            'environment_name', 'iac_repository_name'
        ]

    def get_has_drift(self, obj):
        """Check if resource has drift"""
        return obj.has_drift
