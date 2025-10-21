from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from . import views

app_name = 'core'

# DRF Router for API endpoints
router = DefaultRouter()

# Authentication URLs - directly registered under /api/v1/auth/
auth_urls = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/', views.TokenVerifyView.as_view(), name='token_verify'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('register/', views.register_user, name='register'),
]

# Combine URL patterns
urlpatterns = [
    # Authentication endpoints (directly under auth/)
    path('', include(auth_urls)),

    # API router URLs (if any future core resources)
    path('api/', include(router.urls)),
]
