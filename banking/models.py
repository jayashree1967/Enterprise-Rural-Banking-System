
from django.db import models
from django.db.models import Q
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator, MinValueValidator,FileExtensionValidator
from django.core.exceptions import ValidationError
from pathlib import Path
from decimal import Decimal


# 1. Custom User Manager
class UserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required")
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ADMIN')
        if extra_fields.get('is_staff') is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get('is_superuser') is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self.create_user(
            email,
            password,
            **extra_fields
        )


# 2. Custom User Model
class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        STAFF = 'STAFF', 'Staff'
        ADMIN = 'ADMIN', 'Admin'
    username = None
    email = models.EmailField(unique=True,max_length=254)
    phone_number = models.CharField(max_length=15,blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?[0-9]{10,15}$',
                message='Enter a valid phone number.'
            )
        ]
    )
    role = models.CharField(max_length=10,choices=Role.choices,default=Role.CUSTOMER)
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email




class CustomerProfile(models.Model):
    user = models.OneToOneField(User,on_delete=models.CASCADE,related_name='profile')
    date_of_birth = models.DateField()
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.user.email

import uuid
class BankAccount(models.Model):
    class AccountType(models.TextChoices):
        SAVINGS = 'SAVINGS', 'Savings'
        CURRENT = 'CURRENT', 'Current'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        FROZEN = 'FROZEN', 'Frozen'

    customer = models.ForeignKey(CustomerProfile,on_delete=models.PROTECT,related_name='accounts')
    account_number = models.CharField(max_length=20,unique=True,editable=False)
    account_type = models.CharField(max_length=10,choices=AccountType.choices,default=AccountType.SAVINGS)
    balance = models.DecimalField(max_digits=15,decimal_places=2,default=0.00)
    status = models.CharField(max_length=10,choices=AccountStatus.choices,default=AccountStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.account_number:
            self.account_number = uuid.uuid4().hex[:16].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.account_number


class AccountApplication(models.Model):

    class ApplicationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="account_applications"
    )

    account_type = models.CharField(
        max_length=10,
        choices=BankAccount.AccountType.choices
    )

    occupation = models.CharField(max_length=100)

    monthly_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    purpose = models.TextField()

    status = models.CharField(
        max_length=10,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING
    )

    staff_remarks = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_account_applications"
    )

    reviewed_at = models.DateTimeField(null=True, blank=True)

    bank_account = models.OneToOneField(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opening_application"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer.user.email} - {self.account_type}"


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'Deposit'
        WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
        TRANSFER = 'TRANSFER', 'Transfer'
        LOAN_REPAYMENT = 'LOAN_REPAYMENT', 'Loan Repayment'

    class TransactionStatus(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
    transaction_reference = models.UUIDField(default=uuid.uuid4,unique=True,editable=False)
    transaction_type = models.CharField(max_length=15,choices=TransactionType.choices)
    source_account = models.ForeignKey(BankAccount,on_delete=models.PROTECT,related_name='outgoing_transactions',null=True,blank=True)
    destination_account = models.ForeignKey(BankAccount,on_delete=models.PROTECT,related_name='incoming_transactions',null=True,blank=True)
    amount = models.DecimalField(max_digits=15,decimal_places=2)
    status = models.CharField(max_length=10,choices=TransactionStatus.choices,default=TransactionStatus.COMPLETED)
    idempotency_key = models.UUIDField(null=True, blank=True,unique=True)
    description = models.CharField(max_length=255,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0),name='transaction_amount_positive')
        ]

    def __str__(self):
        return f"{self.transaction_type} - {self.transaction_reference}"




class Beneficiary(models.Model):
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="beneficiaries"
    )

    beneficiary_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        related_name="saved_by_customers"
    )

    nickname = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "beneficiary_account"],
                name="unique_customer_beneficiary"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nickname} - {self.beneficiary_account.account_number}"



class Notification(models.Model):
    class NotificationType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'Deposit'
        WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
        TRANSFER = 'TRANSFER', 'Transfer'
        GENERAL = 'GENERAL', 'General'

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )

    title = models.CharField(max_length=150)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=15,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.customer.user.email}"



class Complaint(models.Model):

    class Category(models.TextChoices):
        ACCOUNT = "ACCOUNT", "Account Related"
        TRANSACTION = "TRANSACTION", "Transaction Issue"
        DEPOSIT = "DEPOSIT", "Deposit Issue"
        WITHDRAWAL = "WITHDRAWAL", "Withdrawal Issue"
        TRANSFER = "TRANSFER", "Fund Transfer Issue"
        CARD = "CARD", "Card Related"
        SECURITY = "SECURITY", "Security Concern"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="complaints"
    )

    reference_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    category = models.CharField(
        max_length=20,
        choices=Category.choices
    )

    subject = models.CharField(max_length=150)

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN
    )

    staff_reply = models.TextField(blank=True)

    assigned_staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    resolved_at = models.DateTimeField(null=True, blank=True)

    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference_number} - {self.subject}"




# ==========================================
# LOAN APPLICATION AND APPROVAL MANAGEMENT
# ==========================================


# Validate uploaded document size (maximum 5 MB)
def validate_loan_document_size(value):
    max_size = 5 * 1024 * 1024

    if value.size > max_size:
        raise ValidationError(
            "Document size cannot exceed 5 MB."
        )


def validate_loan_document_content(value):
    """Reject files whose content does not match an allowed document type."""
    name = (getattr(value, "name", "") or "").lower()
    try:
        position = value.tell()
        header = value.read(16)
        value.seek(position)
    except (AttributeError, OSError):
        raise ValidationError("Unable to inspect uploaded document.")

    if name.endswith(".pdf"):
        valid = header.startswith(b"%PDF-")
    elif name.endswith(('.jpg', '.jpeg')):
        valid = header.startswith(b"\xff\xd8\xff")
    elif name.endswith('.png'):
        valid = header.startswith(b"\x89PNG\r\n\x1a\n")
    else:
        valid = False
    if not valid:
        raise ValidationError("File content does not match the permitted PDF/JPG/PNG format.")


# Generate secure, unique document filenames
def loan_document_upload_path(instance, filename):
    extension = Path(filename).suffix.lower()

    return (
        f"loans/{instance.application.reference_number}/"
        f"{uuid.uuid4().hex}{extension}"
    )


class LoanApplication(models.Model):

    class LoanCategory(models.TextChoices):
        PERSONAL = "PERSONAL", "Personal Loan"
        HOME = "HOME", "Home Loan"
        EDUCATION = "EDUCATION", "Education Loan"
        AGRICULTURE = "AGRICULTURE", "Agriculture Loan"
        BUSINESS = "BUSINESS", "Business Loan"

    class ApplicationStatus(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    # Customer who submitted the application
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="loan_applications"
    )

    # Unique application reference
    reference_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    # Loan information
    category = models.CharField(
        max_length=20,
        choices=LoanCategory.choices
    )

    requested_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("1.00"))]
    )

    # Customer-provided eligibility information
    monthly_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("1.00"))]
    )

    existing_monthly_obligations = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    tenure_months = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    purpose = models.TextField()

    # Bank-assigned approval information
    approved_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("1.00"))]
    )

    annual_interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    approved_tenure_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )

    # Application status
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.SUBMITTED
    )

    # Staff review information
    assigned_staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_loan_applications"
    )

    staff_remarks = models.TextField(
        blank=True
    )

    rejection_reason = models.TextField(
        blank=True
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_loan_applications"
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.CheckConstraint(
                condition=Q(requested_amount__gt=0),
                name="loan_requested_amount_positive"
            ),
            models.CheckConstraint(
                condition=Q(
                    approved_amount__isnull=True
                ) | Q(approved_amount__gt=0),
                name="loan_approved_amount_positive"
            ),
            models.CheckConstraint(
                condition=Q(monthly_income__gt=0),
                name="loan_monthly_income_positive"
            ),
            models.CheckConstraint(
                condition=Q(existing_monthly_obligations__gte=0),
                name="loan_obligations_nonnegative"
            ),
            models.CheckConstraint(
                condition=Q(annual_interest_rate__isnull=True)
                | Q(annual_interest_rate__gte=0),
                name="loan_interest_nonnegative"
            ),
        ]

    def __str__(self):
        return (
            f"{self.reference_number} - "
            f"{self.customer.user.email}"
        )


class LoanDocument(models.Model):

    class DocumentType(models.TextChoices):
        IDENTITY = "IDENTITY", "Identity Proof"
        ADDRESS = "ADDRESS", "Address Proof"
        INCOME = "INCOME", "Income Proof"
        BANK_STATEMENT = "BANK_STATEMENT", "Bank Statement"
        PROPERTY = "PROPERTY", "Property Document"
        EDUCATION = "EDUCATION", "Education Document"
        AGRICULTURE = "AGRICULTURE", "Agriculture Document"
        BUSINESS = "BUSINESS", "Business Document"
        OTHER = "OTHER", "Other"

    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name="documents"
    )

    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices
    )

    document_file = models.FileField(
        upload_to=loan_document_upload_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["pdf", "jpg", "jpeg", "png"]
            ),
            validate_loan_document_size,
            validate_loan_document_content
        ]
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return (
            f"{self.application.reference_number} - "
            f"{self.get_document_type_display()}"
        )


class LoanRepayment(models.Model):

    class RepaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        PARTIAL = "PARTIAL", "Partially Paid"
        OVERDUE = "OVERDUE", "Overdue"

    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.PROTECT,
        related_name="repayments"
    )
    payment_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="loan_repayment"
    )
    installment_number = models.PositiveIntegerField()

    due_date = models.DateField()

    principal_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    interest_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    emi_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))]
    )

    amount_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    status = models.CharField(
        max_length=10,
        choices=RepaymentStatus.choices,
        default=RepaymentStatus.PENDING
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )


    class Meta:
        ordering = ["installment_number"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "application",
                    "installment_number"
                ],
                name="unique_loan_installment"
            ),
            models.CheckConstraint(
                condition=Q(emi_amount__gt=0),
                name="loan_emi_positive"
            ),
            models.CheckConstraint(
                condition=Q(amount_paid__gte=0),
                name="loan_paid_amount_nonnegative"
            ),
        ]

    def __str__(self):
        return (
            f"Loan {self.application.reference_number} - "
            f"EMI {self.installment_number}"
        )


class CustomerAccessAudit(models.Model):
    class Action(models.TextChoices):
        SEARCH = "SEARCH", "Customer Search"
        VIEW = "VIEW", "Customer Record Viewed"

    staff = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="customer_access_logs"
    )

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="access_audit_logs"
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.staff.email} - {self.action}"

