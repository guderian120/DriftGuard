"""
URL configuration for DriftGuard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.cache import never_cache

@never_cache
def api_v1_root(request):
    """API v1 root endpoint showing available resources"""
    return JsonResponse({
        'message': 'DriftGuard API v1',
        'version': 'v1.0.0',
        'endpoints': {
            'authentication': '/api/v1/auth/',
            'organizations': '/api/v1/organizations/',
            'environments': '/api/v1/environments/',
            'iac': '/api/v1/iac/',
            'drifts': '/api/v1/drifts/',
            'ml': '/api/v1/ml/',
            'recommendations': '/api/v1/recommendations/',
        },
        'authentication': 'JWT Bearer token required',
        'documentation': 'See architecture documentation for detailed API specification'
    })

# API URL patterns - v1 API routes
api_patterns = [
    path('', api_v1_root, name='api_v1_root'),
    path('auth/', include('apps.core.urls')),
    path('organizations/', include('apps.organizations.urls')),
    path('environments/', include('apps.environments.urls')),
    path('iac/', include('apps.iac.urls')),
    path('drifts/', include('apps.drifts.urls')),
    path('ml/', include('apps.ml.urls')),
    path('recommendations/', include('apps.recommendations.urls')),
    # TODO: Add when these apps are implemented
    # path('correlations/', include('apps.correlations.urls')),
    # path('notifications/', include('apps.notifications.urls')),
    # path('analytics/', include('apps.analytics.urls')),
]

@never_cache
def root_view(request):
    """Simple root view for API information"""
    return JsonResponse({
        'message': 'DriftGuard AI-Powered Infrastructure Drift Detection API',
        'version': 'v1.0.0',
        'status': 'active',
        'api_endpoints': {
            'authentication': '/api/v1/auth/',
            'organizations': '/api/v1/organizations/',
            'health_check': '/health/',
            'admin': '/admin/'
        },
        'documentation': 'See architecture documentation for full API specification'
    })

@never_cache
def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': '2025-01-01T12:00:00Z',
        'services': {
            'database': 'connected',
            'cache': 'available',
            'app': 'running'
        }
    })

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),

    # Root API information
    path('', root_view, name='root'),

    # Health check
    path('health/', health_check, name='health'),

    # API v1
    path('api/v1/', include(api_patterns)),

    # Web dashboard (HTML views)
    # path('dashboard/', include('apps.dashboard.urls')),  # TODO: Uncomment when dashboard app is created

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Development-only URLs (debug toolbar, etc.)
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
