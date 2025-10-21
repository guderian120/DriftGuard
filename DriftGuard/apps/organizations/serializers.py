from rest_framework import serializers

from .models import Organization, OrganizationSettings


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""

    users_count = serializers.SerializerMethodField()
    environments_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'description', 'contact_email',
            'is_active', 'created_at', 'updated_at',
            'users_count', 'environments_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'slug']

    def get_users_count(self, obj):
        """Count of users in organization"""
        return obj.users.count()

    def get_environments_count(self, obj):
        """Count of environments in organization"""
        return getattr(obj, 'environments', []).count()

    def create(self, validated_data):
        # Generate slug from name if not provided
        if 'slug' not in validated_data:
            from django.utils.text import slugify
            validated_data['slug'] = slugify(validated_data['name'])

        return super().create(validated_data)


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationSettings model"""

    organization_name = serializers.CharField(
        source='organization.name',
        read_only=True
    )

    class Meta:
        model = OrganizationSettings
        fields = [
            'organization', 'organization_name',
            # Drift detection settings
            'drift_detection_enabled', 'auto_analysis_enabled',
            # Notification settings
            'email_notifications', 'slack_integration', 'slack_webhook_url',
            # Security settings
            'audit_logging', 'session_timeout',
            # AI settings
            'gemini_ai_enabled', 'ml_retraining_enabled',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['organization', 'organization_name', 'created_at', 'updated_at']


class OrganizationRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for creating new organizations during registration"""

    class Meta:
        model = Organization
        fields = ['name', 'slug', 'description', 'contact_email']
        read_only_fields = ['slug']

    def validate_name(self, value):
        """Ensure organization name is unique"""
        if Organization.objects.filter(name=value).exists():
            raise serializers.ValidationError("An organization with this name already exists.")
        return value

    def validate_slug(self, value):
        """Ensure organization slug is unique"""
        if Organization.objects.filter(slug=value).exists():
            raise serializers.ValidationError("An organization with this slug already exists.")
        return value

    def create(self, validated_data):
        # Generate slug from name if not provided
        if 'slug' not in validated_data:
            from django.utils.text import slugify
            base_slug = slugify(validated_data['name'])
            slug = base_slug
            counter = 1

            # Ensure unique slug
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            validated_data['slug'] = slug

        return super().create(validated_data)
