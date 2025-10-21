from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'iac'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'repositories', views.IACRepositoryViewSet, basename='iac-repository')
router.register(r'resources', views.IACResourceViewSet, basename='iac-resource')

urlpatterns = [
    path('', include(router.urls)),
]
