from rest_framework import serializers
from .models import IaCRepository, IaCFile, IaCResource


class IaCRepositorySerializer(serializers.ModelSerializer):
    """Serializer for IaC Repository model"""

    repository_full_name = serializers.SerializerMethodField()
    total_files = serializers.SerializerMethodField()
    total_resources = serializers.SerializerMethodField()

    class Meta:
        model = IaCRepository
        fields = [
            'id', 'name', 'platform', 'repository_url', 'repository_owner',
            'repository_name', 'branch', 'iac_type', 'github_token',
            'organization', 'created_by', 'created_at', 'updated_at',
            'is_active', 'repository_full_name', 'total_files', 'total_resources'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'total_files', 'total_resources']
        extra_kwargs = {
            'github_token': {'write_only': True}  # Hide token in responses
        }

    def get_repository_full_name(self, obj):
        return obj.get_full_repository_path()

    def get_total_files(self, obj):
        return obj.files.count()

    def get_total_resources(self, obj):
        return IaCResource.objects.filter(iac_file__repository=obj).count()

    def create(self, validated_data):
        # Set the user from request context
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IaCRepositoryCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating repositories"""

    class Meta:
        model = IaCRepository
        fields = [
            'name', 'platform', 'repository_url', 'repository_owner',
            'repository_name', 'branch', 'iac_type', 'github_token',
            'organization'
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IaCFileSerializer(serializers.ModelSerializer):
    """Serializer for IaC File model"""

    class Meta:
        model = IaCFile
        fields = '__all__'


class IaCResourceSerializer(serializers.ModelSerializer):
    """Serializer for IaC Resource model"""

    repository_name = serializers.CharField(source='iac_file.repository.name', read_only=True)
    file_name = serializers.CharField(source='iac_file.file_name', read_only=True)

    class Meta:
        model = IaCResource
        fields = [
            'id', 'iac_file', 'resource_type', 'resource_id', 'provider',
            'resource_definition', 'line_number', 'created_at', 'updated_at',
            'repository_name', 'file_name'
        ]
