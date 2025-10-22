from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.IaCRepositoryViewSet, basename='repository')
router.register(r'files', views.IaCFileViewSet, basename='file')
router.register(r'resources', views.IaCResourceViewSet, basename='resource')

urlpatterns = router.urls
