
from rest_framework import serializers
from .models import BankAccount, Transaction, User, CustomerProfile, Beneficiary, Notification, Complaint,LoanApplication,LoanDocument,LoanRepayment, CustomerAccessAudit,AccountApplication
from decimal import Decimal
from drf_spectacular.types import OpenApiTypes
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from drf_spectacular.utils import extend_schema_field
from django.contrib.auth.password_validation import validate_password
class BankAccountSerializer(serializers.ModelSerializer):

    class Meta:
        model = BankAccount
        fields = [
            'id',
            'account_number',
            'account_type',
            'balance',
            'status',
            'created_at'
        ]

        read_only_fields = fields


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            'id',
            'transaction_reference',
            'transaction_type',
            'source_account',
            'destination_account',
            'amount',
            'status',
            'description',
            'created_at'
        ]
        read_only_fields = fields


from rest_framework import serializers
class DepositSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=Decimal("0.01")
    )
    idempotency_key = serializers.UUIDField()
    description = serializers.CharField(
        required=False,
        default="Deposit",
        max_length=255
    )


class WithdrawalSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()

    amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=Decimal("0.01")
    )

    idempotency_key = serializers.UUIDField()

    description = serializers.CharField(
        required=False,
        default="Withdrawal",
        max_length=255
    )



class TransferSerializer(serializers.Serializer):
    source_account_id = serializers.IntegerField()

    recipient_account_number = serializers.CharField(
        max_length=30,
        trim_whitespace=True
    )

    amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=Decimal("0.01")
    )

    idempotency_key = serializers.UUIDField()

    description = serializers.CharField(
        required=False,
        default="Fund transfer",
        max_length=255
    )
    def validate_recipient_account_number(self, value):
        return value.strip().upper()

class CustomerProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        source="user.first_name",
        max_length=150
    )
    last_name = serializers.CharField(
        source="user.last_name",
        max_length=150
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )
    phone_number = serializers.CharField(
        source="user.phone_number",
        max_length=15,
        required=False,
        allow_blank=True
    )

    class Meta:
        model = CustomerProfile
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "date_of_birth",
            "address",
            "city",
            "state",
            "postal_code",
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        # Update User fields
        user = instance.user
        for field, value in user_data.items():
            setattr(user, field, value)
        user.save()

        # Update CustomerProfile fields
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=True
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True
    )

    def validate(self, attrs):
        user = self.context["request"].user

        # Verify current password
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({
                "current_password": "Current password is incorrect."
            })

        # Check new password confirmation
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "New passwords do not match."
            })

        # Apply Django password validation
        validate_password(attrs["new_password"], user)

        # Prevent reusing the current password
        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError({
                "new_password": "New password must be different from current password."
            })

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user   

class BeneficiarySerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(
        source="beneficiary_account.account_number",
        read_only=True
    )

    class Meta:
        model = Beneficiary
        fields = [
            "id",
            "nickname",
            "account_number",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

class NotificationSerializer(serializers.ModelSerializer):
    transaction_reference = serializers.UUIDField(
        source='transaction.transaction_reference',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'transaction_reference',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields


class ComplaintSerializer(serializers.ModelSerializer):

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    staff_email = serializers.EmailField(
        source="assigned_staff.email",
        read_only=True
    )

    class Meta:
        model = Complaint
        fields = [
            "id",
            "reference_number",
            "category",
            "category_display",
            "subject",
            "description",
            "status",
            "status_display",
            "staff_reply",
            "staff_email",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        ]

        read_only_fields = [
            "id",
            "reference_number",
            "status",
            "staff_reply",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        ]


class StaffComplaintUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Complaint
        fields = ["status", "staff_reply"]

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get("status", instance.status)
        new_reply = attrs.get("staff_reply", instance.staff_reply)

        if new_status == Complaint.Status.RESOLVED and not new_reply.strip():
            raise serializers.ValidationError({
                "staff_reply": "Add a reply before resolving a complaint."
            })

        if instance.status == Complaint.Status.CLOSED:
            raise serializers.ValidationError(
                "Closed complaints cannot be modified."
            )

        if instance.status == Complaint.Status.RESOLVED and new_status == Complaint.Status.OPEN:
            raise serializers.ValidationError(
                "A resolved complaint cannot be reopened through this endpoint."
            )

        return attrs



# ==========================================
# LOAN MANAGEMENT SERIALIZERS
# ==========================================

class LoanDocumentSerializer(serializers.ModelSerializer):
    document_file = serializers.FileField(use_url=False)
    document_type_display = serializers.CharField(
        source="get_document_type_display",
        read_only=True
    )

    class Meta:
        model = LoanDocument
        fields = [
            "id",
            "document_type",
            "document_type_display",
            "document_file",
            "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_at"]
@extend_schema_field(OpenApiTypes.BINARY)
class BinaryFileField(serializers.FileField):
    pass
class LoanDocumentUploadSerializer(serializers.Serializer):

    document_type = serializers.ChoiceField(
        choices=LoanDocument._meta.get_field("document_type").choices
    )

    document_file = BinaryFileField()


class LoanApplicationSerializer(serializers.ModelSerializer):

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    documents = LoanDocumentSerializer(many=True, read_only=True)

    customer_email = serializers.EmailField(
        source="customer.user.email",
        read_only=True
    )

    repayments = serializers.SerializerMethodField()

    class Meta:
        model = LoanApplication

        fields = [
            "id",
            "reference_number",
            "customer_email",
            "category",
            "category_display",
            "requested_amount",
            "monthly_income",
            "existing_monthly_obligations",
            "tenure_months",
            "purpose",
            "approved_amount",
            "annual_interest_rate",
            "approved_tenure_months",
            "status",
            "status_display",
            "staff_remarks",
            "rejection_reason",
            "assigned_staff",
            "reviewed_by",
            "reviewed_at",
            "documents",
            "repayments",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "reference_number",
            "customer_email",
            "approved_amount",
            "annual_interest_rate",
            "approved_tenure_months",
            "status",
            "status_display",
            "staff_remarks",
            "rejection_reason",
            "assigned_staff",
            "reviewed_by",
            "reviewed_at",
            "documents",
            "repayments",
            "created_at",
            "updated_at",
        ]

    def get_repayments(self, obj):
        return LoanRepaymentSerializer(
            obj.repayments.all(),
            many=True
        ).data

    def validate(self, attrs):
        requested_amount = attrs.get("requested_amount")
        monthly_income = attrs.get("monthly_income")

        obligations = attrs.get(
            "existing_monthly_obligations",
            Decimal("0.00")
        )

        tenure = attrs.get("tenure_months")

        if requested_amount is not None and requested_amount <= 0:
            raise serializers.ValidationError({
                "requested_amount": "Loan amount must be greater than zero."
            })

        if monthly_income is not None and monthly_income <= 0:
            raise serializers.ValidationError({
                "monthly_income": "Monthly income must be greater than zero."
            })

        if obligations is not None and obligations < 0:
            raise serializers.ValidationError({
                "existing_monthly_obligations": "Obligations cannot be negative."
            })

        if tenure is not None and tenure <= 0:
            raise serializers.ValidationError({
                "tenure_months": "Loan tenure must be at least one month."
            })

        if (
            monthly_income is not None
            and obligations is not None
            and obligations >= monthly_income
        ):
            raise serializers.ValidationError({
                "existing_monthly_obligations":
                    "Existing monthly obligations must be less than monthly income."
            })

        return attrs




class LoanRepaymentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    loan_reference = serializers.UUIDField(
        source="application.reference_number",
        read_only=True
    )

    loan_category = serializers.CharField(
        source="application.get_category_display",
        read_only=True
    )

    approved_amount = serializers.DecimalField(
        source="application.approved_amount",
        max_digits=15,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = LoanRepayment
        fields = [
            "id",
            "loan_reference",
            "loan_category",
            "approved_amount",
            "installment_number",
            "due_date",
            "principal_amount",
            "interest_amount",
            "emi_amount",
            "amount_paid",
            "status",
            "status_display",
            "paid_at",
            "created_at",
        ]
        read_only_fields = fields



class StaffLoanReviewSerializer(serializers.ModelSerializer):

    class Meta:
        model = LoanApplication
        fields = [
            "status",
            "approved_amount",
            "annual_interest_rate",
            "approved_tenure_months",
            "staff_remarks",
            "rejection_reason",
        ]

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get("status", instance.status)

        final_statuses = [
            LoanApplication.ApplicationStatus.APPROVED,
            LoanApplication.ApplicationStatus.REJECTED,
            LoanApplication.ApplicationStatus.CANCELLED,
        ]

        if instance.status in final_statuses:
            raise serializers.ValidationError(
                "This loan application has already received a final decision."
            )

        if new_status in [
            LoanApplication.ApplicationStatus.APPROVED,
            LoanApplication.ApplicationStatus.REJECTED,
        ]:
            if instance.status != LoanApplication.ApplicationStatus.UNDER_REVIEW:
                raise serializers.ValidationError(
                    "Move the application to UNDER_REVIEW before making a final decision."
                )

        if new_status == LoanApplication.ApplicationStatus.APPROVED:

            amount = attrs.get("approved_amount")
            interest = attrs.get("annual_interest_rate")
            tenure = attrs.get("approved_tenure_months")

            if amount is None or amount <= 0:
                raise serializers.ValidationError({
                    "approved_amount": "Enter a valid approved amount."
                })

            if amount > instance.requested_amount:
                raise serializers.ValidationError({
                    "approved_amount": "Approved amount cannot exceed requested amount."
                })

            if interest is None or interest < 0:
                raise serializers.ValidationError({
                    "annual_interest_rate": "Enter a valid interest rate."
                })

            if tenure is None or tenure <= 0:
                raise serializers.ValidationError({
                    "approved_tenure_months": "Enter a valid loan tenure."
                })

            if tenure > instance.tenure_months:
                raise serializers.ValidationError({
                    "approved_tenure_months": "Approved tenure cannot exceed requested tenure."
                })

            remarks = attrs.get("staff_remarks", instance.staff_remarks)

            if not remarks.strip():
                raise serializers.ValidationError({
                    "staff_remarks": "Staff remarks are required before approval."
                })

        elif new_status == LoanApplication.ApplicationStatus.REJECTED:

            reason = attrs.get("rejection_reason", instance.rejection_reason)

            if not reason.strip():
                raise serializers.ValidationError({
                    "rejection_reason": "A rejection reason is required."
                })

        elif new_status not in [
            LoanApplication.ApplicationStatus.SUBMITTED,
            LoanApplication.ApplicationStatus.UNDER_REVIEW,
        ]:
            raise serializers.ValidationError({
                "status": "Invalid loan application status transition."
            })

        return attrs


class StaffLoanRepaymentSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(
        source="application.customer.user.email",
        read_only=True
    )
    loan_reference = serializers.UUIDField(
        source="application.reference_number",
        read_only=True
    )
    loan_category = serializers.CharField(
        source="application.get_category_display",
        read_only=True
    )
    approved_amount = serializers.DecimalField(
        source="application.approved_amount",
        max_digits=15,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = LoanRepayment
        fields = [
            "id",
            "customer_email",
            "loan_reference",
            "loan_category",
            "approved_amount",
            "installment_number",
            "due_date",
            "principal_amount",
            "interest_amount",
            "emi_amount",
            "amount_paid",
            "status",
            "paid_at",
        ]
        read_only_fields = fields



class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["role"] = user.role
        token["email"] = user.email

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        data["role"] = self.user.role
        data["email"] = self.user.email

        return data


class StaffCustomerSearchSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source="id", read_only=True)

    full_name = serializers.SerializerMethodField()
    masked_phone = serializers.SerializerMethodField()
    accounts = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "customer_id",
            "full_name",
            "masked_phone",
            "accounts",
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or "Customer"

    def get_masked_phone(self, obj):
        phone = obj.user.phone_number or ""

        if len(phone) <= 4:
            return "****"

        return "*" * (len(phone) - 4) + phone[-4:]

    def get_accounts(self, obj):
        return [
            {
                "account_id": account.id,
                "account_number": (
                    "****" + account.account_number[-4:]
                ),
                "account_type": account.get_account_type_display(),
                "status": account.get_status_display(),
            }
            for account in obj.accounts.all()
        ]


class StaffCustomerDetailSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source="id", read_only=True)
    full_name = serializers.SerializerMethodField()
    masked_phone = serializers.SerializerMethodField()
    masked_email = serializers.SerializerMethodField()
    accounts = serializers.SerializerMethodField()
    open_complaints = serializers.SerializerMethodField()
    assigned_complaints = serializers.SerializerMethodField()
    assigned_loans = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "customer_id",
            "full_name",
            "masked_phone",
            "masked_email",
            "accounts",
            "open_complaints",
            "assigned_complaints",
            "assigned_loans",
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or "Customer"

    def get_masked_phone(self, obj):
        phone = obj.user.phone_number or ""
        return "*" * max(0, len(phone) - 4) + phone[-4:]

    def get_masked_email(self, obj):
        email = obj.user.email or ""
        if "@" not in email:
            return "****"
        username, domain = email.split("@", 1)
        return (username[:1] + "****@" + domain) if username else "****@" + domain

    def get_accounts(self, obj):
        return [
            {
                "account_number": "****" + account.account_number[-4:],
                "account_type": account.get_account_type_display(),
                "status": account.get_status_display(),
            }
            for account in obj.accounts.all()
        ]

    def get_open_complaints(self, obj):
        return obj.complaints.filter(
            status__in=[
                Complaint.Status.OPEN,
                Complaint.Status.IN_PROGRESS,
            ]
        ).count()

    def get_assigned_complaints(self, obj):
        user = self.context["request"].user
        return obj.complaints.filter(
            assigned_staff=user
        ).count()

    def get_assigned_loans(self, obj):
        user = self.context["request"].user
        return LoanApplication.objects.filter(
            customer=obj,
            assigned_staff=user
        ).count()


class AccountApplicationSerializer(serializers.ModelSerializer):

    account_type_display = serializers.CharField(
        source="get_account_type_display",
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    account_number = serializers.CharField(
        source="bank_account.account_number",
        read_only=True,
        allow_null=True
    )

    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(
        source="customer.user.email",
        read_only=True
    )

    class Meta:
        model = AccountApplication
        fields = [
            "id",
            "account_type",
            "account_type_display",
            "occupation",
            "monthly_income",
            "purpose",
            "status",
            "status_display",
            "staff_remarks",
            "account_number",
            "customer_name",
            "customer_email",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "staff_remarks",
            "account_number",
            "created_at",
            "reviewed_at",
        ]

    def get_customer_name(self, obj):
        user = obj.customer.user
        return f"{user.first_name} {user.last_name}".strip()


class AccountApplicationReviewSerializer(serializers.Serializer):

    status = serializers.ChoiceField(
        choices=[
            AccountApplication.ApplicationStatus.APPROVED,
            AccountApplication.ApplicationStatus.REJECTED,
        ]
    )

    staff_remarks = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate(self, attrs):
        if (
            attrs["status"] ==
            AccountApplication.ApplicationStatus.REJECTED
            and not attrs.get("staff_remarks", "").strip()
        ):
            raise serializers.ValidationError({
                "staff_remarks": "Please provide a rejection reason."
            })

        return attrs


# Public customer registration. Staff/admin roles are never accepted from clients.
from django.db import transaction as db_transaction
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class CustomerRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    phone_number = serializers.RegexField(
        regex=r"^\+?[0-9]{10,15}$",
        max_length=15,
        error_messages={"invalid": "Enter a valid phone number (10 to 15 digits)."}
    )
    date_of_birth = serializers.DateField()
    address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        candidate = User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
        )
        try:
            django_validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        if attrs["date_of_birth"] >= __import__("datetime").date.today():
            raise serializers.ValidationError({"date_of_birth": "Date of birth must be in the past."})
        return attrs

    @db_transaction.atomic
    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        profile_fields = {
            key: validated_data.pop(key)
            for key in ("date_of_birth", "address", "city", "state", "postal_code")
        }
        user = User.objects.create_user(
            email=validated_data.pop("email"),
            password=password,
            role=User.Role.CUSTOMER,
            is_active=True,
            **validated_data,
        )
        CustomerProfile.objects.create(user=user, **profile_fields)
        return user
