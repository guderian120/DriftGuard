from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'drifts'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'', views.DriftEventViewSet, basename='drift-event')

urlpatterns = [
    path('', include(router.urls)),
]
