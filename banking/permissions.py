from rest_framework.permissions import BasePermission

class IsBankStaff(BasePermission):
    """Allow bank staff/admin accounts; never trust the frontend role alone."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and (
            user.is_superuser or (user.is_staff and user.role in ('STAFF', 'ADMIN'))
        ))

class IsBankAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and (
            user.is_superuser or (user.is_staff and user.role == 'ADMIN')
        ))
