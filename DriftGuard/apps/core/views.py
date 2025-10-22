from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenVerifyView

from .models import User


class CurrentUserView(APIView):
    """
    Get current authenticated user information
    """

    def get(self, request):
        user = request.user
        return Response({
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
        })


class TokenVerifyView(TokenVerifyView):
    """
    Custom token verify view with additional user info
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            # Add user info to successful token verification
            user = User.objects.get(id=request.user.id)
            response.data['user'] = {
                'id': user.id,
                'username': user.username,
                'organization': {
                    'id': user.organization.id,
                    'name': user.organization.name,
                    'slug': user.organization.slug,
                } if hasattr(user, 'organization') and user.organization else None,
                'role': user.role,
            }

        return response


class LoginView(APIView):
    """
    Custom login view using LoginSerializer
    """
    
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import LoginSerializer
        print("logging in now")
        print(request.data)
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.save(), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    User registration endpoint
    """
    from .serializers import UserRegistrationSerializer

    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'User registered successfully',
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
