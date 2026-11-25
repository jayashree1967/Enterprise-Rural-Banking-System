
from decimal import Decimal
from uuid import uuid4
from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient

from banking.models import User, CustomerProfile, BankAccount, Transaction
from banking.services import deposit_money

class BankingAPITests(TestCase):

    def setUp(self):

        self.client = APIClient()

        self.user1 = User.objects.create_user(
            email="api_customer1@example.com",
            password="TestPassword123!",
            role=User.Role.CUSTOMER
        )

        self.user2 = User.objects.create_user(
            email="api_customer2@example.com",
            password="TestPassword123!",
            role=User.Role.CUSTOMER
        )

        self.profile1 = CustomerProfile.objects.create(
            user=self.user1,
            date_of_birth=date(2002, 5, 15),
            address="Test Address 1",
            city="Kalaburagi",
            state="Karnataka",
            postal_code="585101"
        )

        self.profile2 = CustomerProfile.objects.create(
            user=self.user2,
            date_of_birth=date(2001, 8, 20),
            address="Test Address 2",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001"
        )

        self.account1 = BankAccount.objects.create(
            customer=self.profile1,
            account_type=BankAccount.AccountType.SAVINGS,
            balance=Decimal("20000.00")
        )

        self.account2 = BankAccount.objects.create(
            customer=self.profile2,
            account_type=BankAccount.AccountType.SAVINGS,
            balance=Decimal("5000.00")
        )

        self.client.force_authenticate(user=self.user1)


    def test_customer_can_view_own_accounts(self):

        response = self.client.get("/api/accounts/")

        self.assertEqual(response.status_code, 200)

        self.assertEqual(len(response.data), 1)

        self.assertEqual(
            response.data[0]["id"],
            self.account1.id
        )

    def test_customer_cannot_view_other_customer_account(self):

        response = self.client.get(
            f"/api/accounts/{self.account2.id}/"
        )

        self.assertEqual(response.status_code, 404)


    def test_successful_deposit(self):

        response = self.client.post(
            "/api/deposit/",
            {
                "account_id": self.account1.id,
                "amount": "1000.00",
                "idempotency_key": str(uuid4()),
                "description": "Test deposit"
            },
            format="json"
        )

        self.account1.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.account1.balance,
            Decimal("21000.00")
        )

    def test_duplicate_deposit(self):

        key = str(uuid4())

        data = {
            "account_id": self.account1.id,
            "amount": "1000.00",
            "idempotency_key": key,
            "description": "Duplicate deposit test"
        }

        response1 = self.client.post(
            "/api/deposit/", data, format="json"
        )

        response2 = self.client.post(
            "/api/deposit/", data, format="json"
        )

        self.account1.refresh_from_db()

        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        self.assertEqual(
            response1.data["transaction_reference"],
            response2.data["transaction_reference"]
        )

        self.assertEqual(
            self.account1.balance,
            Decimal("21000.00")
        )

    def test_customer_cannot_deposit_into_other_account(self):

        response = self.client.post(
            "/api/deposit/",
            {
                "account_id": self.account2.id,
                "amount": "500.00",
                "idempotency_key": str(uuid4()),
                "description": "Unauthorized deposit"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 404)

        self.account2.refresh_from_db()

        self.assertEqual(
            self.account2.balance,
            Decimal("5000.00")
        )

    def test_invalid_deposit_amount(self):

        response = self.client.post(
            "/api/deposit/",
            {
                "account_id": self.account1.id,
                "amount": "0.00",
                "idempotency_key": str(uuid4()),
                "description": "Invalid deposit"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )


    def test_successful_withdrawal(self):

        response = self.client.post(
            "/api/withdraw/",
            {
                "account_id": self.account1.id,
                "amount": "2000.00",
                "idempotency_key": str(uuid4()),
                "description": "Test withdrawal"
            },
            format="json"
        )

        self.account1.refresh_from_db()

        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            self.account1.balance,
            Decimal("18000.00")
        )

    def test_withdrawal_insufficient_balance(self):

        response = self.client.post(
            "/api/withdraw/",
            {
                "account_id": self.account1.id,
                "amount": "50000.00",
                "idempotency_key": str(uuid4()),
                "description": "Insufficient balance test"
            },
            format="json"
        )

        self.account1.refresh_from_db()

        self.assertEqual(response.status_code, 400)

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )

    def test_duplicate_withdrawal(self):

        key = str(uuid4())

        data = {
            "account_id": self.account1.id,
            "amount": "1000.00",
            "idempotency_key": key,
            "description": "Duplicate withdrawal test"
        }

        response1 = self.client.post(
            "/api/withdraw/", data, format="json"
        )

        response2 = self.client.post(
            "/api/withdraw/", data, format="json"
        )

        self.account1.refresh_from_db()

        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        self.assertEqual(
            response1.data["transaction_reference"],
            response2.data["transaction_reference"]
        )

        self.assertEqual(
            self.account1.balance,
            Decimal("19000.00")
        )

    def test_customer_cannot_withdraw_from_other_account(self):

        response = self.client.post(
            "/api/withdraw/",
            {
                "account_id": self.account2.id,
                "amount": "500.00",
                "idempotency_key": str(uuid4()),
                "description": "Unauthorized withdrawal"
            },
            format="json"
        )

        self.account2.refresh_from_db()

        self.assertEqual(response.status_code, 404)

        self.assertEqual(
            self.account2.balance,
            Decimal("5000.00")
        )


    def test_successful_transfer(self):
        response = self.client.post(
            "/api/transfer/",
            {
                "source_account_id": self.account1.id,
                "recipient_account_number": self.account2.account_number,
                "amount": "2000.00",
                "idempotency_key": str(uuid4()),
                "description": "Test transfer"
            },
            format="json"
        )

        print("SUCCESSFUL TRANSFER RESPONSE:", response.data)

        self.assertEqual(response.status_code, 200)

        self.account1.refresh_from_db()
        self.account2.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("18000.00")
        )

        self.assertEqual(
            self.account2.balance,
            Decimal("7000.00")
        )

    def test_transfer_insufficient_balance(self):
        response = self.client.post(
            "/api/transfer/",
            {
                "source_account": self.account1.id,
                "destination_account": self.account2.id,
                "amount": "50000.00",
                "idempotency_key": str(uuid4()),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_customer_cannot_transfer_from_other_account(self):
        response = self.client.post(
            "/api/transfer/",
            {
                "source_account_id": self.account2.id,
                "recipient_account_number": self.account1.account_number,
                "amount": "1000.00",
                "idempotency_key": str(uuid4())
            },
            format="json"
        )

        self.assertEqual(response.status_code, 404)

        self.account1.refresh_from_db()
        self.account2.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )

        self.assertEqual(
            self.account2.balance,
            Decimal("5000.00")
        )

    def test_transfer_to_same_account(self):
        response = self.client.post(
            "/api/transfer/",
            {
                "source_account_id": self.account1.id,
                "recipient_account_number": self.account1.account_number,
                "amount": "1000.00",
                "idempotency_key": str(uuid4())
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_duplicate_transfer(self):
        key = str(uuid4())

        data = {
            "source_account_id": self.account1.id,
            "recipient_account_number": self.account2.account_number,
            "amount": "1000.00",
            "idempotency_key": key,
            "description": "Duplicate transfer test"
        }

        first_response = self.client.post(
            "/api/transfer/",
            data,
            format="json"
        )

        second_response = self.client.post(
            "/api/transfer/",
            data,
            format="json"
        )

        print("FIRST TRANSFER RESPONSE:", first_response.data)
        print("SECOND TRANSFER RESPONSE:", second_response.data)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)

        self.assertEqual(
            first_response.data["transaction_reference"],
            second_response.data["transaction_reference"]
        )

        self.account1.refresh_from_db()
        self.account2.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("19000.00")
        )

        self.assertEqual(
            self.account2.balance,
            Decimal("6000.00")
        )
