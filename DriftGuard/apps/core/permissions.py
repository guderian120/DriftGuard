from rest_framework.permissions import BasePermission


class OrganizationPermission(BasePermission):
    """
    Permission class for organization-scoped access
    Ensures users can only access resources within their organization
    """

    def has_object_permission(self, request, view, obj):
        # Check if user has access to the object's organization
        return obj.organization == request.user.organization


class RoleBasedPermission(BasePermission):
    """
    Permission class for role-based access control
    Maps HTTP methods to required user roles
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Define permissions per HTTP method
        method_permissions = {
            'GET': ['viewer', 'editor', 'admin'],        # Read operations
            'POST': ['editor', 'admin'],                 # Create operations
            'PUT': ['editor', 'admin'],                  # Full update operations
            'PATCH': ['editor', 'admin'],                # Partial update operations
            'DELETE': ['admin'],                         # Delete operations
        }

        required_roles = method_permissions.get(request.method, [])
        return request.user.role in required_roles


class AdminPermission(BasePermission):
    """Permission class that requires admin role"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'


class OrganizationAdminPermission(BasePermission):
    """
    Permission class for organization-level administration
    Requires admin role and checks organization ownership
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        return (
            request.user.role == 'admin' and
            obj.organization == request.user.organization
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows access to resource owners or admins
    """

    def has_object_permission(self, request, view, obj):
        # Allow if user owns the object or is an admin in the same organization
        return (
            obj.user == request.user or
            (request.user.role == 'admin' and
             obj.organization == request.user.organization)
        )


class ReadOnlyOrAdmin(BasePermission):
    """
    Permission class that allows read access to all authenticated users,
    but write access only to administrators
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Read operations allowed
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Write operations require admin role
        return request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        # Organization-scoped read/write permissions
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return obj.organization == request.user.organization

        return (
            request.user.role == 'admin' and
            obj.organization == request.user.organization
        )


class MLModelAccessPermission(BasePermission):
    """
    Permission class for ML model and prediction access
    Editor and admin can modify, all roles can view results
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return True  # All authenticated users can access ML endpoints

    def has_object_permission(self, request, view, obj):
        # ML models and predictions are organization-scoped
        if hasattr(obj, 'drift_event'):
            # For predictions, check the drift event's organization
            return obj.drift_event.environment.organization == request.user.organization

        # For ML models, all organization members can access
        return obj.organization == request.user.organization


class AuditLogPermission(BasePermission):
    """
    Permission class for audit log access
    Only administrators can view audit logs
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        return (
            request.user.role == 'admin' and
            obj.organization == request.user.organization
        )
