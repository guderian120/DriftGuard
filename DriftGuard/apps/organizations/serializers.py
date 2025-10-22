from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Organization, OrganizationSettings

User = get_user_model()


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


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Serializer for organization members (users)"""

    organization_name = serializers.CharField(source='organization.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    is_active_display = serializers.CharField(source='is_active', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'is_active_display', 'organization_name',
            'last_login', 'date_joined'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active_display', 'organization_name', 'last_login', 'date_joined'
        ]

    def get_full_name(self, obj):
        """Return user's full name"""
        full_name = obj.get_full_name()
        return full_name if full_name else obj.username


class OrganizationMemberUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating organization member roles/status"""

    class Meta:
        model = User
        fields = ['role', 'is_active']
        read_only_fields = []

    def validate_role(self, value):
        """Ensure valid role values"""
        valid_roles = [choice[0] for choice in User._meta.get_field('role').choices]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Valid choices are: {valid_roles}")
        return value


class OrganizationMemberInviteSerializer(serializers.Serializer):
    """Serializer for inviting new members to organization"""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=User._meta.get_field('role').choices, default='viewer')
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)

    def validate_email(self, value):
        """Ensure email is not already in use in this organization"""
        organization = self.context.get('organization')
        if organization and User.objects.filter(email=value, organization=organization).exists():
            raise serializers.ValidationError("A user with this email already exists in this organization.")
        return value


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
