from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.EnvironmentViewSet, basename='environment')
router.register(r'credentials', views.CloudCredentialViewSet, basename='credential')

urlpatterns = router.urls
