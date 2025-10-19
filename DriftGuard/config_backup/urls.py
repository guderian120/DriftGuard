"""
URL configuration for DriftGuard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# API URL patterns
api_patterns = [
    path('auth/', include('apps.core.urls')),
    path('organizations/', include('apps.organizations.urls')),
    path('environments/', include('apps.environments.urls')),
    path('iac/', include('apps.iac.urls')),
    path('drifts/', include('apps.drifts.urls')),
    path('ml/', include('apps.ml.urls')),
    path('recommendations/', include('apps.recommendations.urls')),
    path('correlations/', include('apps.correlations.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('analytics/', include('apps.analytics.urls')),
    path('ai/', include('apps.ml.urls')),  # Gemini AI endpoints
]

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include(api_patterns)),

    # Dashboard
    path('', include('apps.dashboard.urls')),

    # Health checks
    path('health/', include('django_prometheus.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Debug toolbar (development only)
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
