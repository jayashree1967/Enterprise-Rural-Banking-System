
from django.urls import path
from .api_views import (MyBankAccountsView,MyBankAccountDetailView,MyTransactionHistoryView,DepositAPIView,WithdrawalAPIView,TransferAPIView, MyProfileAPIView,ChangePasswordAPIView,BeneficiaryListCreateAPIView,BeneficiaryDeleteAPIView, NotificationListAPIView, NotificationMarkReadAPIView,CustomerComplaintListCreateAPIView,
CustomerComplaintDetailAPIView,
CustomerCloseComplaintAPIView,
StaffComplaintListAPIView,
StaffComplaintUpdateAPIView,
CustomerLoanApplicationListCreateAPIView,
CustomerLoanApplicationDetailAPIView,
CustomerLoanDocumentUploadAPIView,StaffLoanApplicationListAPIView,
StaffLoanReviewAPIView,StaffLoanRepaymentListAPIView,
StaffMarkRepaymentPaidAPIView,
CustomerLoanRepaymentListAPIView,
StaffCustomerSearchAPIView,
StaffCustomerDetailAPIView,
CustomerPayLoanEMIAPIView,
CustomerAccountApplicationListCreateAPIView,
StaffAccountApplicationListAPIView,
StaffAccountApplicationReviewAPIView,
)
from banking.statement_views import download_bank_statement

urlpatterns = [
    path(
        'accounts/',
        MyBankAccountsView.as_view(),
        name='my-bank-accounts'
    ),
    path('accounts/<int:pk>/',MyBankAccountDetailView.as_view(),name='my-bank-account-detail'),
    path(
        'transactions/',
        MyTransactionHistoryView.as_view(),
        name='my-transactions'
    ),
    path(
        'deposit/',
        DepositAPIView.as_view(),
        name='deposit'
    ),
    path(
        'withdraw/',
        WithdrawalAPIView.as_view(),
        name='withdraw'
    ),
    path(
        'transfer/',
        TransferAPIView.as_view(),
        name='transfer'
    ),
    path(
        "transactions/statement/pdf/",
        download_bank_statement,
        name="download_bank_statement",
    ),
    path(
        "profile/",
        MyProfileAPIView.as_view(),
        name="my-profile"
    ),
    path(
        "change-password/",
        ChangePasswordAPIView.as_view(),
        name="change-password"
    ),
    path(
        "beneficiaries/",
        BeneficiaryListCreateAPIView.as_view(),
        name="beneficiary-list-create"
    ),
    path(
        "beneficiaries/<int:pk>/",
        BeneficiaryDeleteAPIView.as_view(),
        name="beneficiary-delete"
    ),
    path(
        'notifications/',
        NotificationListAPIView.as_view(),
        name='notification-list'
    ),
    path(
        'notifications/<int:pk>/read/',
        NotificationMarkReadAPIView.as_view(),
        name='notification-mark-read'
    ),
    # Customer complaint management
    path(
        "complaints/",
        CustomerComplaintListCreateAPIView.as_view(),
        name="complaint-list-create"
    ),
    path(
        "complaints/<int:pk>/",
        CustomerComplaintDetailAPIView.as_view(),
        name="complaint-detail"
    ),
    path(
        "complaints/<int:pk>/close/",
        CustomerCloseComplaintAPIView.as_view(),
        name="complaint-close"
    ),

    # Staff complaint management
    path(
        "staff/complaints/",
        StaffComplaintListAPIView.as_view(),
        name="staff-complaint-list"
    ),
    path(
        "staff/complaints/<int:pk>/",
        StaffComplaintUpdateAPIView.as_view(),
        name="staff-complaint-update"
    ),
        # Customer Loan Management
    path(
        "loans/",
        CustomerLoanApplicationListCreateAPIView.as_view(),
        name="loan-application-list-create"
    ),
    path(
        "loans/<int:pk>/",
        CustomerLoanApplicationDetailAPIView.as_view(),
        name="loan-application-detail"
    ),
    path(
        "loans/<int:pk>/documents/",
        CustomerLoanDocumentUploadAPIView.as_view(),
        name="loan-document-upload"
    ),
    # Customer account applications
    path(
        "account-applications/",
        CustomerAccountApplicationListCreateAPIView.as_view(),
        name="customer-account-applications"
    ),

    # Staff account application management
    path(
        "staff/account-applications/",
        StaffAccountApplicationListAPIView.as_view(),
        name="staff-account-applications"
    ),

    path(
        "staff/account-applications/<int:pk>/review/",
        StaffAccountApplicationReviewAPIView.as_view(),
        name="staff-account-application-review"
    ),


        # Staff Loan Management
    path(
        "staff/loans/",
        StaffLoanApplicationListAPIView.as_view(),
        name="staff-loan-list"
    ),
    path(
        "staff/loans/<int:pk>/review/",
        StaffLoanReviewAPIView.as_view(),
        name="loan-review"
    ),
    # Staff Loan Repayment Management
    path(
        "staff/repayments/",
        StaffLoanRepaymentListAPIView.as_view(),
        name="staff-repayment-list"
    ),
    path(
        "staff/repayments/<int:pk>/mark-paid/",
        StaffMarkRepaymentPaidAPIView.as_view(),
        name="staff-mark-repayment-paid"
    ),
    path(
        "loan-repayments/",
        CustomerLoanRepaymentListAPIView.as_view(),
        name="customer-loan-repayments"
    ),
    path(
        "loan-repayments/<int:pk>/pay/",
        CustomerPayLoanEMIAPIView.as_view(),
        name="customer-pay-loan-emi"
    ),

    path(
        "staff/customers/",
        StaffCustomerSearchAPIView.as_view(),
        name="staff-customer-search",
    ),

    path(
        "staff/customers/<int:pk>/",
        StaffCustomerDetailAPIView.as_view(),
        name="staff-customer-detail",
    ),

]


