from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'recommendations'

# DRF Router for API endpoints
router = DefaultRouter()
router.register(r'', views.RecommendationViewSet, basename='recommendation')
router.register(r'templates', views.RecommendationTemplateViewSet, basename='recommendation-template')
router.register(r'feedback', views.RecommendationFeedbackViewSet, basename='recommendation-feedback')

urlpatterns = [
    path('', include(router.urls)),
]
