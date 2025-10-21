from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'ml'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'models', views.MLModelViewSet, basename='ml-model')
router.register(r'predictions', views.MLPredictionViewSet, basename='ml-prediction')
router.register(r'analyses', views.DriftCauseAnalysisViewSet, basename='drift-cause-analysis')
router.register(r'metrics', views.MLPerformanceMetricViewSet, basename='ml-performance-metric')

urlpatterns = [
    path('', include(router.urls)),
]
