from django.contrib import admin
from .models import User, CustomerProfile, BankAccount,Transaction, Complaint

admin.site.register(User)
admin.site.register(CustomerProfile)
admin.site.register(BankAccount)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_reference',
        'transaction_type',
        'source_account',
        'destination_account',
        'amount',
        'status',
        'created_at'
    )
    list_filter = (
        'transaction_type',
        'status',
        'created_at'
    )
    search_fields = (
        'transaction_reference',
        'description'
    )
    readonly_fields = (
        'transaction_reference',
        'transaction_type',
        'source_account',
        'destination_account',
        'amount',
        'status',
        'idempotency_key',
        'description',
        'created_at'
    )


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "reference_number",
        "customer",
        "category",
        "subject",
        "status",
        "assigned_staff",
        "created_at",
    )

    list_filter = ("category", "status", "created_at")

    search_fields = (
        "subject",
        "description",
        "customer__user__email",
        "reference_number",
    )

    readonly_fields = (
        "reference_number",
        "created_at",
        "updated_at",
        "resolved_at",
        "closed_at",
    )

from .models import CustomerAccessAudit

@admin.register(CustomerAccessAudit)
class CustomerAccessAuditAdmin(admin.ModelAdmin):
    list_display = (
        "staff",
        "customer",
        "action",
        "created_at",
    )

    list_filter = ("action", "created_at")

    search_fields = (
        "staff__email",
        "customer__user__email",
    )

    readonly_fields = (
        "staff",
        "customer",
        "action",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
    