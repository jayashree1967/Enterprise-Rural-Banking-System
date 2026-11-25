from decimal import Decimal, InvalidOperation
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import BankAccount, Transaction, Notification
from django.db import models

def validate_amount(amount):
    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError("Invalid transaction amount.")
    if not amount.is_finite() or amount <= 0:
        raise ValidationError(
            "Transaction amount must be greater than zero."
        )
    if amount.as_tuple().exponent < -2:
        raise ValidationError(
            "Transaction amount cannot have more than two decimal places."
        )
    if amount > Decimal('9999999999999.99'):
        raise ValidationError("Transaction amount exceeds the allowed limit.")
    return amount



def deposit_money(account_id, amount, idempotency_key, description="Deposit"):
    amount = validate_amount(amount)
    try:
        key = UUID(str(idempotency_key))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError("A valid idempotency key is required.")
    with transaction.atomic():
        # Lock the account until the database transaction finishes
        account = (
            BankAccount.objects
            .select_for_update()
            .get(pk=account_id)
        )
        # Check whether this request was already processed
        existing = Transaction.objects.filter(
            idempotency_key=key
        ).first()
        if existing:
            if (
                existing.transaction_type != Transaction.TransactionType.DEPOSIT
                or existing.destination_account_id != account.pk
                or existing.amount != amount
            ):
                raise ValidationError(
                    "This idempotency key was already used for another request."
                )
            return existing
        if account.status != BankAccount.AccountStatus.ACTIVE:
            raise ValidationError("This bank account is not active.")
        # Update balance
        account.balance += amount
        account.save(update_fields=['balance'])
        # Record transaction
        transaction_record = Transaction.objects.create(
            transaction_type=Transaction.TransactionType.DEPOSIT,
            destination_account=account,
            amount=amount,
            status=Transaction.TransactionStatus.COMPLETED,
            idempotency_key=key,
            description=description
        )
        return transaction_record


def withdraw_money(account_id, amount, idempotency_key, description="Withdrawal"):
    amount = validate_amount(amount)
    try:
        key = UUID(str(idempotency_key))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError("A valid idempotency key is required.")
    with transaction.atomic():
        account = (
            BankAccount.objects
            .select_for_update()
            .get(pk=account_id)
        )
        existing = Transaction.objects.filter(
            idempotency_key=key
        ).first()
        if existing:
            if (
                existing.transaction_type != Transaction.TransactionType.WITHDRAWAL
                or existing.source_account_id != account.pk
                or existing.amount != amount
            ):
                raise ValidationError(
                    "This idempotency key was already used for another request."
                )
            return existing
        if account.status != BankAccount.AccountStatus.ACTIVE:
            raise ValidationError("This bank account is not active.")
        # Check available balance
        if account.balance < amount:
            raise ValidationError("Insufficient account balance.")
        # Deduct money
        account.balance -= amount
        account.save(update_fields=['balance'])
        # Record transaction
        transaction_record = Transaction.objects.create(
            transaction_type=Transaction.TransactionType.WITHDRAWAL,
            source_account=account,
            amount=amount,
            status=Transaction.TransactionStatus.COMPLETED,
            idempotency_key=key,
            description=description
        )
        return transaction_record


def transfer_money(
    source_account_id,
    destination_account_id,
    amount,
    idempotency_key,
    description="Fund transfer"
):
    amount = validate_amount(amount)
    try:
        key = UUID(str(idempotency_key))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError("A valid idempotency key is required.")
    if source_account_id == destination_account_id:
        raise ValidationError("Cannot transfer money to the same account.")
    with transaction.atomic():
        # Lock accounts in a consistent order to reduce deadlock risk
        account_ids = sorted([
            source_account_id,
            destination_account_id
        ])
        locked_accounts = {
            account.pk: account
            for account in (
                BankAccount.objects
                .select_for_update()
                .filter(pk__in=account_ids)
                .order_by('pk')
            )
        }
        if len(locked_accounts) != 2:
            raise ValidationError("One or both bank accounts do not exist.")
        source = locked_accounts[source_account_id]
        destination = locked_accounts[destination_account_id]
        # Check duplicate request
        existing = Transaction.objects.filter(
            idempotency_key=key
        ).first()
        if existing:
            if (
                existing.transaction_type != Transaction.TransactionType.TRANSFER
                or existing.source_account_id != source.pk
                or existing.destination_account_id != destination.pk
                or existing.amount != amount
            ):
                raise ValidationError(
                    "This idempotency key was already used for another request."
                )
            return existing
        # Check account status
        if source.status != BankAccount.AccountStatus.ACTIVE:
            raise ValidationError("Source account is not active.")
        if destination.status != BankAccount.AccountStatus.ACTIVE:
            raise ValidationError("Destination account is not active.")
        # Check sufficient balance
        if source.balance < amount:
            raise ValidationError("Insufficient account balance.")
        # Update both accounts
        source.balance -= amount
        destination.balance += amount
        source.save(update_fields=['balance'])
        destination.save(update_fields=['balance'])
        # Create one transaction record for the transfer
        transaction_record = Transaction.objects.create(
            transaction_type=Transaction.TransactionType.TRANSFER,
            source_account=source,
            destination_account=destination,
            amount=amount,
            status=Transaction.TransactionStatus.COMPLETED,
            idempotency_key=key,
            description=description
        )
        return transaction_record


def get_account_transactions(account_id):

    account = BankAccount.objects.get(pk=account_id)

    transactions = Transaction.objects.filter(
        models.Q(source_account=account) |
        models.Q(destination_account=account)
    ).order_by('-created_at')

    return transactions

def create_transaction_notifications(transaction):
    transaction_type = transaction.transaction_type

    if transaction_type == Transaction.TransactionType.DEPOSIT:
        account = transaction.destination_account or transaction.source_account

        Notification.objects.get_or_create(
            customer=account.customer,
            transaction=transaction,
            notification_type=Notification.NotificationType.DEPOSIT,
            defaults={
                "title": "Deposit Successful",
                "message": (
                    f"Your account has been credited with "
                    f"₹{transaction.amount}."
                )
            }
        )

    elif transaction_type == Transaction.TransactionType.WITHDRAWAL:
        account = transaction.source_account

        Notification.objects.get_or_create(
            customer=account.customer,
            transaction=transaction,
            notification_type=Notification.NotificationType.WITHDRAWAL,
            defaults={
                "title": "Withdrawal Successful",
                "message": (
                    f"₹{transaction.amount} has been withdrawn "
                    f"from your account."
                )
            }
        )

    elif transaction_type == Transaction.TransactionType.TRANSFER:
        source = transaction.source_account
        destination = transaction.destination_account

        Notification.objects.get_or_create(
            customer=source.customer,
            transaction=transaction,
            notification_type=Notification.NotificationType.TRANSFER,
            defaults={
                "title": "Money Transferred",
                "message": (
                    f"₹{transaction.amount} has been transferred "
                    f"from your account to {destination.account_number}."
                )
            }
        )

        Notification.objects.get_or_create(
            customer=destination.customer,
            transaction=transaction,
            notification_type=Notification.NotificationType.TRANSFER,
            defaults={
                "title": "Money Received",
                "message": (
                    f"You have received ₹{transaction.amount} "
                    f"from account {source.account_number}."
                )
            }
        )
