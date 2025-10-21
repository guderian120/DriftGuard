from rest_framework import serializers

from .models import Environment


class EnvironmentSerializer(serializers.ModelSerializer):
    """Serializer for Environment model"""

    organization_name = serializers.CharField(
        source='organization.name',
        read_only=True
    )
    cloud_provider_display = serializers.CharField(
        source='get_cloud_provider_display',
        read_only=True
    )
    resource_count = serializers.SerializerMethodField(read_only=True)
    drift_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Environment
        fields = [
            'id', 'organization', 'organization_name', 'name', 'slug',
            'cloud_provider', 'cloud_provider_display', 'region', 'account_id',
            'tags', 'is_active', 'is_ready_for_scan', 'resource_count', 'drift_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_ready_for_scan',
            'resource_count', 'drift_count', 'cloud_provider_display'
        ]

    def get_resource_count(self, obj):
        """Get count of IaC resources"""
        return obj.resource_count

    def get_drift_count(self, obj):
        """Get count of unresolved drifts"""
        return obj.drift_count

    def validate(self, attrs):
        # Add any cross-field validation if needed
        return attrs
