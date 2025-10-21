from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'organizations'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'', views.OrganizationViewSet, basename='organization')

# Add organization-specific routes
urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/settings/', views.OrganizationSettingsView.as_view(), name='organization-settings'),
]
