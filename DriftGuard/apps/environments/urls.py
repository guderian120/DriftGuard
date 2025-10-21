from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'environments'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'', views.EnvironmentViewSet, basename='environment')

urlpatterns = [
    path('', include(router.urls)),
]
