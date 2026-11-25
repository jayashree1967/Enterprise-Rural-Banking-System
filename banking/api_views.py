
from rest_framework import generics,status
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .permissions import IsBankStaff, IsBankAdmin
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import BankAccount, Transaction, CustomerProfile, Beneficiary, Notification, Complaint, LoanApplication,LoanDocument,LoanRepayment, CustomerAccessAudit,User,AccountApplication
from .serializers import BankAccountSerializer, TransactionSerializer,DepositSerializer,WithdrawalSerializer,TransferSerializer, CustomerProfileSerializer,ChangePasswordSerializer, BeneficiarySerializer, NotificationSerializer, ComplaintSerializer,StaffComplaintUpdateSerializer,LoanApplicationSerializer,LoanDocumentSerializer,LoanRepaymentSerializer,StaffLoanReviewSerializer,LoanDocumentUploadSerializer,StaffLoanRepaymentSerializer,StaffCustomerSearchSerializer,StaffCustomerDetailSerializer,AccountApplicationSerializer,AccountApplicationReviewSerializer
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError
from .services import (
    deposit_money,
    withdraw_money,
    transfer_money,
    create_transaction_notifications
)
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from decimal import Decimal, ROUND_HALF_UP
from calendar import monthrange
class MyBankAccountsView(generics.ListAPIView):
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return BankAccount.objects.filter(
            customer__user=self.request.user
        ).order_by('-created_at')


class MyBankAccountDetailView(generics.RetrieveAPIView):
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return BankAccount.objects.filter(
            customer__user=self.request.user
        )

class MyTransactionHistoryView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Transaction.objects.filter(
            source_account__customer__user=self.request.user
        ).union(
            Transaction.objects.filter(
                destination_account__customer__user=self.request.user
            )
        ).order_by('-created_at')


class DepositAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "financial"
    throttle_classes = [ScopedRateThrottle]
    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_id = serializer.validated_data['account_id']
        amount = serializer.validated_data['amount']
        idempotency_key = serializer.validated_data['idempotency_key']
        description = serializer.validated_data['description']
        try:
            account = BankAccount.objects.get(
                id=account_id,
                customer__user=request.user
            )
        except BankAccount.DoesNotExist:
            raise NotFound("Bank account not found.")
        try:
            transaction = deposit_money(
                account_id=account.id,
                amount=amount,
                idempotency_key=idempotency_key,
                description=description
            )
            create_transaction_notifications(transaction)
        except DRFValidationError as exc:
            raise DRFValidationError(exc.messages)

        return Response(
            {
                "message": "Deposit successful",
                "transaction_reference": str(
                    transaction.transaction_reference
                ),
                "amount": str(transaction.amount),
                "status": transaction.status,
                "account_balance": str(
                    BankAccount.objects.get(id=account.id).balance
                )
            },
            status=status.HTTP_200_OK
        )

class WithdrawalAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "financial"
    throttle_classes = [ScopedRateThrottle]
    def post(self, request):
        serializer = WithdrawalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_id = serializer.validated_data['account_id']
        amount = serializer.validated_data['amount']
        idempotency_key = serializer.validated_data['idempotency_key']
        description = serializer.validated_data['description']
        try:
            account = BankAccount.objects.get(
                id=account_id,
                customer__user=request.user
            )
        except BankAccount.DoesNotExist:
            raise NotFound("Bank account not found.")
        try:
            transaction = withdraw_money(
                account_id=account.id,
                amount=amount,
                idempotency_key=idempotency_key,
                description=description
            )
            create_transaction_notifications(transaction)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages)

        account.refresh_from_db()

        return Response(
            {
                "message": "Withdrawal successful",
                "transaction_reference": str(
                    transaction.transaction_reference
                ),
                "amount": str(transaction.amount),
                "status": transaction.status,
                "account_balance": str(account.balance)
            },
            status=status.HTTP_200_OK
        )



class TransferAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "financial"
    throttle_classes = [ScopedRateThrottle]
    def post(self, request):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        source_account_id = serializer.validated_data[
            "source_account_id"
        ]
        recipient_account_number = serializer.validated_data[
            "recipient_account_number"
        ]
        amount = serializer.validated_data["amount"]
        idempotency_key = serializer.validated_data[
            "idempotency_key"
        ]
        description = serializer.validated_data["description"]
        # 1. Verify sender's account belongs to logged-in customer
        try:
            source_account = BankAccount.objects.get(
                id=source_account_id,
                customer__user=request.user
            )
        except BankAccount.DoesNotExist:
            raise NotFound("Source bank account not found.")

        # 2. Find recipient using their bank account number
        try:
            destination_account = BankAccount.objects.get(
                account_number=recipient_account_number
            )
        except BankAccount.DoesNotExist:
            raise NotFound("Recipient bank account not found.")

        # 3. Prevent transferring to the same account
        if source_account.id == destination_account.id:
            raise DRFValidationError(
                "You cannot transfer money to the same account."
            )

        # 4. Process transfer
        try:
            transaction = transfer_money(
                source_account_id=source_account.id,
                destination_account_id=destination_account.id,
                amount=amount,
                idempotency_key=idempotency_key,
                description=description
            )
            create_transaction_notifications(transaction)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages)

        # 5. Refresh account balances
        source_account.refresh_from_db()
        destination_account.refresh_from_db()

        return Response(
            {
                "message": "Transfer successful",
                "transaction_reference": str(
                    transaction.transaction_reference
                ),
                "source_account": source_account.account_number,
                "destination_account": destination_account.account_number,
                "amount": str(transaction.amount),
                "status": transaction.status,
                "remaining_balance": str(source_account.balance)
            },
            status=status.HTTP_200_OK
        )



class MyProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_object(self):
        try:
            return CustomerProfile.objects.select_related("user").get(
                user=self.request.user
            )
        except CustomerProfile.DoesNotExist:
            raise NotFound("Customer profile not found.")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                "message": "Profile updated successfully.",
                "profile": serializer.data
            },
            status=status.HTTP_200_OK
        )



class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password"

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": "Password changed successfully. Please log in again."
            },
            status=status.HTTP_200_OK
        )


class BeneficiaryListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_customer(self, request):
        return CustomerProfile.objects.filter(
            user=request.user
        ).first()

    def get(self, request):
        customer = self.get_customer(request)

        if customer is None:
            return Response(
                {"error": "Only customers with a customer profile can access beneficiaries."},
                status=status.HTTP_403_FORBIDDEN
            )

        beneficiaries = Beneficiary.objects.filter(
            customer=customer
        ).select_related("beneficiary_account")

        serializer = BeneficiarySerializer(
            beneficiaries,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):
        customer = self.get_customer(request)

        if customer is None:
            return Response(
                {"error": "Only customers with a customer profile can add beneficiaries."},
                status=status.HTTP_403_FORBIDDEN
            )

        account_number = request.data.get("account_number", "").strip().upper()
        nickname = request.data.get("nickname", "").strip()

        if not account_number or not nickname:
            return Response(
                {"error": "Account number and nickname are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        beneficiary_account = BankAccount.objects.filter(
            account_number=account_number,
            status="ACTIVE"
        ).first()

        if beneficiary_account is None:
            return Response(
                {"error": "Active beneficiary account not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if beneficiary_account.customer_id == customer.id:
            return Response(
                {"error": "You cannot add your own account as a beneficiary."},
                status=status.HTTP_400_BAD_REQUEST
            )

        beneficiary, created = Beneficiary.objects.get_or_create(
            customer=customer,
            beneficiary_account=beneficiary_account,
            defaults={"nickname": nickname}
        )

        if not created:
            return Response(
                {"error": "This beneficiary is already saved."},
                status=status.HTTP_409_CONFLICT
            )

        serializer = BeneficiarySerializer(beneficiary)

        return Response(
            {
                "message": "Beneficiary added successfully.",
                "beneficiary": serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class BeneficiaryDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            customer = CustomerProfile.objects.filter(
                user=request.user
            ).first()

            if customer is None:
                return Response(
                    {"error": "Customer profile not found."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except CustomerProfile.DoesNotExist:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        beneficiary = Beneficiary.objects.filter(
            id=pk,
            customer=customer
        ).first()

        if not beneficiary:
            return Response(
                {"error": "Beneficiary not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        beneficiary.delete()

        return Response(
            {"message": "Beneficiary deleted successfully."},
            status=status.HTTP_200_OK
        )


class NotificationListAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            customer__user=self.request.user
        ).select_related('transaction')


class NotificationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            customer__user=request.user
        )

        notification.is_read = True
        notification.save(update_fields=['is_read'])

        return Response({
            "message": "Notification marked as read."
        }, status=status.HTTP_200_OK)



class CustomerComplaintListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_customer(self):
        customer = CustomerProfile.objects.filter(
            user=self.request.user
        ).first()

        if customer is None:
            raise NotFound("Customer profile not found.")

        return customer

    def get_queryset(self):
        return Complaint.objects.filter(
            customer__user=self.request.user
        )

    def perform_create(self, serializer):
        customer = self.get_customer()
        serializer.save(customer=customer)


class CustomerComplaintDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Complaint.objects.filter(
            customer__user=self.request.user
        )


class CustomerCloseComplaintAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        complaint = get_object_or_404(
            Complaint,
            pk=pk,
            customer__user=request.user
        )

        if complaint.status != Complaint.Status.RESOLVED:
            return Response(
                {
                    "error": (
                        "Only resolved complaints can be closed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        complaint.status = Complaint.Status.CLOSED
        complaint.closed_at = timezone.now()

        complaint.save(
            update_fields=[
                "status",
                "closed_at",
                "updated_at"
            ]
        )

        return Response(
            {
                "message": "Complaint closed successfully.",
                "complaint": ComplaintSerializer(complaint).data
            },
            status=status.HTTP_200_OK
        )


class StaffComplaintListAPIView(generics.ListAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [IsBankStaff]

    def get_queryset(self):
        queryset = Complaint.objects.select_related(
            "customer__user", "assigned_staff"
        )
        if self.request.user.role == "ADMIN" or self.request.user.is_superuser:
            return queryset.all()
        return queryset.filter(assigned_staff=self.request.user)


class StaffComplaintUpdateAPIView(generics.UpdateAPIView):
    serializer_class = StaffComplaintUpdateSerializer
    permission_classes = [IsBankStaff]
    http_method_names = ["patch", "head", "options"]

    def get_queryset(self):
        queryset = Complaint.objects.all()
        if self.request.user.role == "ADMIN" or self.request.user.is_superuser:
            return queryset
        return queryset.filter(assigned_staff=self.request.user)

    def perform_update(self, serializer):
        complaint = self.get_object()
        new_status = serializer.validated_data.get(
            "status",
            complaint.status
        )

        extra_fields = {
            "assigned_staff": self.request.user
        }

        if new_status == Complaint.Status.RESOLVED:
            extra_fields["resolved_at"] = timezone.now()

        serializer.save(**extra_fields)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        complaint = self.get_object()

        return Response(
            {
                "message": "Complaint updated successfully.",
                "complaint": ComplaintSerializer(complaint).data
            },
            status=status.HTTP_200_OK
        )


class CustomerLoanApplicationListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_customer(self):
        customer = CustomerProfile.objects.filter(
            user=self.request.user
        ).first()

        if customer is None:
            raise NotFound("Customer profile not found.")

        return customer

    def get_queryset(self):
        return LoanApplication.objects.filter(
            customer__user=self.request.user
        ).prefetch_related("documents")

    def perform_create(self, serializer):
        customer = self.get_customer()
        serializer.save(customer=customer)

class CustomerLoanApplicationDetailAPIView(generics.RetrieveAPIView):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LoanApplication.objects.filter(
            customer__user=self.request.user
        ).prefetch_related("documents", "repayments")

class CustomerLoanDocumentUploadAPIView(generics.GenericAPIView):
    serializer_class = LoanDocumentUploadSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=LoanDocumentUploadSerializer,
        responses={201: LoanDocumentSerializer}
    )
    def post(self, request, pk):
        application = get_object_or_404(
            LoanApplication,
            pk=pk,
            customer__user=request.user
        )

        if application.status != LoanApplication.ApplicationStatus.SUBMITTED:
            return Response(
                {
                    "error": "Documents can only be uploaded while the application is submitted."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = LoanDocument.objects.create(
            application=application,
            **serializer.validated_data
        )

        return Response(
            {
                "message": "Loan document uploaded successfully.",
                "document": LoanDocumentSerializer(document).data
            },
            status=status.HTTP_201_CREATED
        )
    
class StaffLoanApplicationListAPIView(generics.ListAPIView):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsBankStaff]

    def get_queryset(self):
        queryset = LoanApplication.objects.select_related(
            "customer__user", "assigned_staff", "reviewed_by"
        ).prefetch_related("documents")
        if self.request.user.role == "ADMIN" or self.request.user.is_superuser:
            return queryset.all()
        return queryset.filter(assigned_staff=self.request.user)

def calculate_emi(principal, annual_interest_rate, tenure_months):
    principal = Decimal(str(principal))
    annual_rate = Decimal(str(annual_interest_rate))

    monthly_rate = annual_rate / Decimal("1200")

    if monthly_rate == 0:
        return (
            principal / Decimal(tenure_months)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    factor = (Decimal("1") + monthly_rate) ** tenure_months

    emi = (
        principal * monthly_rate * factor
    ) / (factor - Decimal("1"))

    return emi.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )
def generate_repayment_schedule(loan):
    principal = Decimal(str(loan.approved_amount))
    annual_rate = Decimal(str(loan.annual_interest_rate))
    tenure = loan.approved_tenure_months

    monthly_rate = annual_rate / Decimal("1200")

    emi = calculate_emi(
        principal,
        annual_rate,
        tenure
    )

    remaining_balance = principal
    today = timezone.localdate()

    repayments = []

    for installment in range(1, tenure + 1):

        # Calculate next month's due date
        month = today.month + installment
        year = today.year + (month - 1) // 12
        month = (month - 1) % 12 + 1

        day = min(
            today.day,
            monthrange(year, month)[1]
        )

        due_date = timezone.datetime(
            year, month, day
        ).date()

        interest = (
            remaining_balance * monthly_rate
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        if installment == tenure:
            principal_component = remaining_balance
            installment_amount = principal_component + interest
        else:
            installment_amount = emi
            principal_component = installment_amount - interest

            # Avoid a negative or excessive principal component
            principal_component = min(
                principal_component,
                remaining_balance
            )

        remaining_balance -= principal_component

        repayments.append(
            LoanRepayment(
                application=loan,
                installment_number=installment,
                due_date=due_date,
                principal_amount=principal_component,
                interest_amount=interest,
                emi_amount=installment_amount
            )
        )

    LoanRepayment.objects.bulk_create(repayments)

    return emi
class StaffLoanReviewAPIView(generics.UpdateAPIView):
    serializer_class = StaffLoanReviewSerializer
    permission_classes = [IsBankStaff]
    http_method_names = ["patch", "head", "options"]

    def get_queryset(self):
        queryset = LoanApplication.objects.all()
        if self.request.user.role == "ADMIN" or self.request.user.is_superuser:
            return queryset
        return queryset.filter(assigned_staff=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        loan = serializer.save(
            reviewed_by=self.request.user,
            reviewed_at=timezone.now(),
            assigned_staff=self.request.user
        )

        if (
            loan.status == LoanApplication.ApplicationStatus.APPROVED
            and not loan.repayments.exists()
        ):
            generate_repayment_schedule(loan)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        return Response(
            {
                "message": "Loan application reviewed successfully.",
                "application": LoanApplicationSerializer(
                    self.get_object()
                ).data
            },
            status=status.HTTP_200_OK
        )


class StaffLoanRepaymentListAPIView(generics.ListAPIView):
    serializer_class = StaffLoanRepaymentSerializer
    permission_classes = [IsBankStaff]

    def get_queryset(self):
        today = timezone.localdate()

        # Update pending installments whose due dates have passed.
        LoanRepayment.objects.filter(
            status=LoanRepayment.RepaymentStatus.PENDING,
            due_date__lt=today,
            application__status=LoanApplication.ApplicationStatus.APPROVED
        ).update(
            status=LoanRepayment.RepaymentStatus.OVERDUE
        )

        queryset = LoanRepayment.objects.filter(
            application__status=LoanApplication.ApplicationStatus.APPROVED
        ).select_related(
            "application__customer__user"
        ).order_by(
            "due_date",
            "installment_number"
        )
        if self.request.user.role != "ADMIN" and not self.request.user.is_superuser:
            queryset = queryset.filter(application__assigned_staff=self.request.user)

        repayment_status = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if repayment_status and repayment_status != "ALL":
            queryset = queryset.filter(status=repayment_status)

        if category and category != "ALL":
            queryset = queryset.filter(
                application__category=category
            )

        if search:
            queryset = queryset.filter(
                Q(application__customer__user__email__icontains=search)
                | Q(application__reference_number__icontains=search)
            )

        return queryset


class StaffMarkRepaymentPaidAPIView(APIView):
    permission_classes = [IsBankStaff]

    @transaction.atomic
    def post(self, request, pk):
        repayment_queryset = LoanRepayment.objects.select_for_update().select_related(
            "application__customer__user"
        ).filter(application__status=LoanApplication.ApplicationStatus.APPROVED)
        if request.user.role != "ADMIN" and not request.user.is_superuser:
            repayment_queryset = repayment_queryset.filter(
                application__assigned_staff=request.user
            )
        repayment = get_object_or_404(repayment_queryset, pk=pk)

        if repayment.status == LoanRepayment.RepaymentStatus.PAID:
            return Response(
                {"error": "This installment has already been marked as paid."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if repayment.status == LoanRepayment.RepaymentStatus.PARTIAL:
            return Response(
                {
                    "error": "This installment has a partial payment. Reconcile the outstanding balance first."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        repayment.amount_paid = repayment.emi_amount
        repayment.status = LoanRepayment.RepaymentStatus.PAID
        repayment.paid_at = timezone.now()

        repayment.save(
            update_fields=[
                "amount_paid",
                "status",
                "paid_at"
            ]
        )

        return Response(
            {
                "message": "EMI installment marked as paid successfully.",
                "repayment": StaffLoanRepaymentSerializer(repayment).data
            },
            status=status.HTTP_200_OK
        )



class CustomerLoanRepaymentListAPIView(generics.ListAPIView):
    """
    Display repayment installments belonging only
    to the authenticated customer.
    """

    serializer_class = LoanRepaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        today = timezone.localdate()

        # Mark past-due pending installments as overdue.
        LoanRepayment.objects.filter(
            application__customer__user=self.request.user,
            application__status=LoanApplication.ApplicationStatus.APPROVED,
            status=LoanRepayment.RepaymentStatus.PENDING,
            due_date__lt=today,
        ).update(
            status=LoanRepayment.RepaymentStatus.OVERDUE
        )

        return LoanRepayment.objects.filter(
            application__customer__user=self.request.user,
            application__status=LoanApplication.ApplicationStatus.APPROVED,
        ).select_related(
            "application"
        ).order_by(
            "due_date",
            "installment_number"
        )


class CustomerPayLoanEMIAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "financial"

    @transaction.atomic
    def post(self, request, pk):
        import uuid

        account_id = request.data.get("account_id")
        idempotency_key = request.data.get("idempotency_key")

        # Validate required fields.
        if not account_id or not idempotency_key:
            return Response(
                {"error": "Account ID and payment reference are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate payment reference.
        try:
            payment_key = uuid.UUID(str(idempotency_key))
        except (ValueError, TypeError, AttributeError):
            return Response(
                {"error": "Invalid payment reference."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Retrieve and lock the customer's own approved loan installment.
        repayment = get_object_or_404(
            LoanRepayment.objects.select_for_update().select_related(
                "application",
                "application__customer"
            ),
            pk=pk,
            application__customer__user=request.user,
            application__status=LoanApplication.ApplicationStatus.APPROVED
        )

        # 2. Retrieve and lock the customer's own active bank account.
        account = get_object_or_404(
            BankAccount.objects.select_for_update(),
            pk=account_id,
            customer__user=request.user,
            status=BankAccount.AccountStatus.ACTIVE
        )

        # 3. Check whether this payment reference was already used.
        existing = Transaction.objects.filter(
            idempotency_key=payment_key
        ).first()

        if existing:
            if (
                existing.transaction_type
                == Transaction.TransactionType.LOAN_REPAYMENT
                and existing.source_account_id == account.id
                and repayment.payment_transaction_id == existing.id
            ):
                account.refresh_from_db()

                return Response(
                    {
                        "message": "EMI payment already completed.",
                        "transaction_reference": str(
                            existing.transaction_reference
                        ),
                        "amount": str(existing.amount),
                        "status": "PAID",
                        "account_balance": str(account.balance)
                    },
                    status=status.HTTP_200_OK
                )

            return Response(
                {"error": "This payment reference has already been used."},
                status=status.HTTP_409_CONFLICT
            )

        # 4. Prevent paying an already-paid installment.
        if repayment.status == LoanRepayment.RepaymentStatus.PAID:
            return Response(
                {"error": "This EMI has already been paid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if repayment.status == LoanRepayment.RepaymentStatus.PARTIAL:
            return Response(
                {"error": "Partial EMI payments are not supported."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Check available account balance.
        amount = repayment.emi_amount

        if amount <= 0:
            return Response(
                {"error": "Invalid EMI amount."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if account.balance < amount:
            return Response(
                {
                    "error": "Insufficient account balance.",
                    "required_amount": str(amount),
                    "available_balance": str(account.balance)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. Debit the customer's account.
        account.balance -= amount
        account.save(update_fields=["balance"])

        # 7. Create the bank transaction.
        bank_transaction = Transaction.objects.create(
            transaction_type=Transaction.TransactionType.LOAN_REPAYMENT,
            source_account=account,
            destination_account=None,
            amount=amount,
            status=Transaction.TransactionStatus.COMPLETED,
            idempotency_key=payment_key,
            description=(
                f"Loan EMI payment - "
                f"{repayment.application.reference_number} - "
                f"Installment {repayment.installment_number}"
            )
        )

        # 8. Update the EMI installment.
        repayment.amount_paid = amount
        repayment.status = LoanRepayment.RepaymentStatus.PAID
        repayment.paid_at = timezone.now()
        repayment.payment_transaction = bank_transaction

        repayment.save(
            update_fields=[
                "amount_paid",
                "status",
                "paid_at",
                "payment_transaction"
            ]
        )

        # 9. Notify the customer.
        Notification.objects.create(
            customer=repayment.application.customer,
            transaction=bank_transaction,
            title="Loan EMI Payment Successful",
            message=(
                f"Your EMI of ₹{amount} for installment "
                f"{repayment.installment_number} was paid successfully."
            ),
            notification_type=Notification.NotificationType.GENERAL
        )

        # 10. Return confirmation.
        account.refresh_from_db()

        return Response(
            {
                "message": "Loan EMI paid successfully.",
                "transaction_reference": str(
                    bank_transaction.transaction_reference
                ),
                "amount": str(amount),
                "status": repayment.status,
                "account_balance": str(account.balance),
                "paid_at": repayment.paid_at
            },
            status=status.HTTP_200_OK
        )


from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password"

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"error": "Refresh token is required."}, status=400)
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response({"error": "Invalid or expired refresh token."}, status=400)
        return Response({"message": "Logged out successfully."}, status=200)


    
class StaffCustomerPermission(IsBankStaff):
    """
    Allows authorized bank staff and admins to access
    the customer service workspace.
    """
    pass


class StaffCustomerSearchAPIView(generics.ListAPIView):
    serializer_class = StaffCustomerSearchSerializer
    permission_classes = [StaffCustomerPermission]

    def get_queryset(self):
        queryset = (
            CustomerProfile.objects
            .select_related("user")
            .prefetch_related("accounts")
            .filter(
                user__role=User.Role.CUSTOMER,
                user__is_active=True,
            )
        )

        search = self.request.query_params.get("search", "").strip()

        if search:
            filters = (
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
                | Q(user__email__icontains=search)
                | Q(accounts__account_number__icontains=search)
            )

            if search.isdigit():
                filters |= Q(id=int(search))

            queryset = queryset.filter(filters).distinct()

        # Record staff customer searches for auditing.
        CustomerAccessAudit.objects.create(
            staff=self.request.user,
            action=CustomerAccessAudit.Action.SEARCH,
        )

        return queryset.order_by(
            "user__first_name",
            "id"
        )[:50]


class StaffCustomerDetailAPIView(generics.RetrieveAPIView):
    serializer_class = StaffCustomerDetailSerializer
    permission_classes = [StaffCustomerPermission]

    queryset = (
        CustomerProfile.objects
        .select_related("user")
        .prefetch_related("accounts")
    )

    def retrieve(self, request, *args, **kwargs):
        customer = self.get_object()

        # Record which staff member viewed the customer.
        CustomerAccessAudit.objects.create(
            staff=request.user,
            customer=customer,
            action=CustomerAccessAudit.Action.VIEW,
        )

        serializer = self.get_serializer(customer)

        return Response(serializer.data)


class CustomerAccountApplicationListCreateAPIView(
    generics.ListCreateAPIView
):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountApplicationSerializer

    def get_queryset(self):
        return AccountApplication.objects.filter(
            customer__user=self.request.user
        ).select_related(
            "customer__user",
            "bank_account"
        )

    def create(self, request, *args, **kwargs):
        customer = CustomerProfile.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application = serializer.save(customer=customer)

        return Response(
            {
                "message": "Account application submitted successfully.",
                "application": self.get_serializer(application).data
            },
            status=status.HTTP_201_CREATED
        )

    def perform_create(self, serializer):
        customer = CustomerProfile.objects.get(
            user=self.request.user
        )
        serializer.save(customer=customer)


class StaffAccountApplicationListAPIView(generics.ListAPIView):
    permission_classes = [IsBankStaff]
    serializer_class = AccountApplicationSerializer

    def get_queryset(self):
        queryset = AccountApplication.objects.select_related(
            "customer__user",
            "reviewed_by",
            "bank_account"
        )

        application_status = self.request.query_params.get("status")

        if application_status and application_status != "ALL":
            queryset = queryset.filter(status=application_status)

        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(customer__user__email__icontains=search)
                | Q(customer__user__first_name__icontains=search)
                | Q(customer__user__last_name__icontains=search)
            )

        return queryset


class StaffAccountApplicationReviewAPIView(APIView):
    permission_classes = [IsBankStaff]

    @transaction.atomic
    def patch(self, request, pk):
        application = get_object_or_404(
            AccountApplication.objects.select_for_update(),
            pk=pk
        )

        if application.status != AccountApplication.ApplicationStatus.PENDING:
            return Response(
                {"error": "This application has already been reviewed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AccountApplicationReviewSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["status"]
        remarks = serializer.validated_data.get("staff_remarks", "")

        application.status = decision
        application.staff_remarks = remarks
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()

        if decision == AccountApplication.ApplicationStatus.APPROVED:
            bank_account = BankAccount.objects.create(
                customer=application.customer,
                account_type=application.account_type,
                balance=Decimal("0.00"),
                status=BankAccount.AccountStatus.ACTIVE
            )

            application.bank_account = bank_account

            notification_title = "New Bank Account Approved"
            notification_message = (
                f"Your {bank_account.get_account_type_display()} "
                f"has been approved. Your new account number is "
                f"{bank_account.account_number}."
            )

        else:
            notification_title = "Bank Account Application Rejected"
            notification_message = (
                f"Your {application.get_account_type_display()} "
                f"application was rejected. Reason: {remarks}"
            )

        application.save()

        Notification.objects.create(
            customer=application.customer,
            title=notification_title,
            message=notification_message,
            notification_type=Notification.NotificationType.GENERAL
        )

        return Response(
            {
                "message": (
                    "Account application approved successfully."
                    if decision == AccountApplication.ApplicationStatus.APPROVED
                    else "Account application rejected."
                ),
                "application": AccountApplicationSerializer(
                    application
                ).data
            },
            status=status.HTTP_200_OK
        )
