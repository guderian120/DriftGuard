from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


# def authenticate_user(email_or_username, password):
#     """
#     Custom authentication that supports login with either email or username
#     """
#     # First try to authenticate as username
#     user = authenticate(username=email_or_username, password=password)
   
#     if user:
#         print("auth one done", user)
#         return user

#     # If that fails, try to find user by email and authenticate
#     try:
#         custom_user = User.objects.get(email=email_or_username)
#         print("auth one failed, looking at two")
#         # Try to authenticate with the actual username found by email
#         user = authenticate(username=custom_user.username, password=password)
#         if user:
#             return user
#     except Exception as e:
#         print("exceptions: ",e)
        

#     return None

def authenticate_user(email_or_username, password):
    return authenticate(username=email_or_username, password=password)

class LoginSerializer(serializers.Serializer):
    """Serializer for user login (supports both username and email)"""
    email_or_username = serializers.CharField(required=True, help_text="Email address or username")
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        print("validating now")
        email_or_username = attrs.get('email_or_username')
        password = attrs.get('password')

        if not email_or_username or not password:
            raise serializers.ValidationError('Both email/username and password are required')

        print(f"DEBUG: Trying to authenticate user: {email_or_username}")

        user = authenticate_user(email_or_username, password)
        if not user:
            print(f"DEBUG: Authentication failed for user: {email_or_username}")
            raise serializers.ValidationError('Invalid credentials')

        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')

        print(f"DEBUG: Successfully authenticated user: {user.username}")
        attrs['user'] = user
        return attrs

    def create(self, validated_data):
        user = validated_data['user']
        refresh = RefreshToken.for_user(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'organization': {
                    'id': user.organization.id,
                    'name': user.organization.name,
                    'slug': user.organization.slug,
                } if hasattr(user, 'organization') and user.organization else None,
                'role': user.role,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
            }
        }


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    organization_name = serializers.CharField(
        source='organization.name',
        read_only=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'organization', 'organization_name', 'role',
            'is_active', 'is_staff', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    organization_slug = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'organization_slug'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError('Passwords do not match')

        # Validate organization exists and is active
        from apps.organizations.models import Organization
        try:
            organization = Organization.objects.get(
                slug=attrs['organization_slug'],
                is_active=True
            )
            attrs['organization'] = organization
        except Organization.DoesNotExist:
            raise serializers.ValidationError('Invalid organization')

        return attrs

    def create(self, validated_data):
        from apps.organizations.models import Organization

        validated_data.pop('password_confirm')
        validated_data.pop('organization_slug')

        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates"""

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name']
        read_only_fields = ['email']  # Email changes might need verification
