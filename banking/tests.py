
from decimal import Decimal
from uuid import uuid4
from unittest.mock import patch

from django.test import TestCase
from django.core.exceptions import ValidationError

from banking.models import (
    User,
    CustomerProfile,
    BankAccount,
    Transaction
)

from banking.services import (
    deposit_money,
    withdraw_money,
    transfer_money,
    get_account_transactions
)


class BankingTransactionTests(TestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(
            email="test1@example.com",
            password="TestPass123!"
        )
        self.user2 = User.objects.create_user(
            email="test2@example.com",
            password="TestPass123!"
        )
        self.profile1 = CustomerProfile.objects.create(
            user=self.user1,
            date_of_birth="2002-05-15",
            address="Bangalore",
            city="Bangalore",
            state="Karnataka",
            postal_code="560001"
        )
        self.profile2 = CustomerProfile.objects.create(
            user=self.user2,
            date_of_birth="2001-08-20",
            address="Mysore",
            city="Mysore",
            state="Karnataka",
            postal_code="570001"
        )
        self.account1 = BankAccount.objects.create(
            customer=self.profile1,
            account_type="SAVINGS",
            balance=Decimal("20000.00")
        )

        self.account2 = BankAccount.objects.create(
            customer=self.profile2,
            account_type="SAVINGS",
            balance=Decimal("5000.00")
        )

    def test_deposit_success(self):

        deposit_money(
            self.account1.id,
            "2000.00",
            uuid4()
        )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("22000.00")
        )

    def test_withdrawal_success(self):

        withdraw_money(
            self.account1.id,
            "3000.00",
            uuid4()
        )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("17000.00")
        )

    def test_transfer_success(self):

        transfer_money(
            self.account1.id,
            self.account2.id,
            "4000.00",
            uuid4()
        )

        self.account1.refresh_from_db()
        self.account2.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("16000.00")
        )

        self.assertEqual(
            self.account2.balance,
            Decimal("9000.00")
        )

    def test_insufficient_balance(self):

        with self.assertRaises(ValidationError):

            withdraw_money(
                self.account1.id,
                "50000.00",
                uuid4()
            )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )

    def test_duplicate_deposit(self):

        key = uuid4()

        first = deposit_money(
            self.account1.id,
            "1000.00",
            key
        )

        second = deposit_money(
            self.account1.id,
            "1000.00",
            key
        )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("21000.00")
        )

        self.assertEqual(first.pk, second.pk)

        self.assertEqual(
            Transaction.objects.filter(
                idempotency_key=key
            ).count(),
            1
        )

    def test_transaction_history(self):

        deposit_money(
            self.account1.id,
            "1000.00",
            uuid4()
        )

        withdraw_money(
            self.account1.id,
            "500.00",
            uuid4()
        )

        history = get_account_transactions(
            self.account1.id
        )

        self.assertEqual(history.count(), 2)

    def test_inactive_account_cannot_receive_deposit(self):

        self.account1.status = BankAccount.AccountStatus.INACTIVE
        self.account1.save(update_fields=['status'])

        with self.assertRaises(ValidationError):

            deposit_money(
                self.account1.id,
                "1000.00",
                uuid4()
            )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )

    @patch(
        "banking.services.Transaction.objects.create",
        side_effect=RuntimeError("Simulated database failure")
    )
    def test_deposit_rollback(self, mock_create):

        with self.assertRaises(RuntimeError):

            deposit_money(
                self.account1.id,
                "1000.00",
                uuid4()
            )

        self.account1.refresh_from_db()

        self.assertEqual(
            self.account1.balance,
            Decimal("20000.00")
        )