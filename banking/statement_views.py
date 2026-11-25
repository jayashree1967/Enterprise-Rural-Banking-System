
from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from banking.models import BankAccount, Transaction


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_bank_statement(request):
    account_id = request.query_params.get("account_id")

    if not account_id:
        return Response(
            {"detail": "Please provide an account ID."},
            status=400,
        )

    try:
        account = BankAccount.objects.get(
            id=account_id,
            customer__user=request.user,
        )
    except BankAccount.DoesNotExist:
        return Response(
            {"detail": "Bank account not found."},
            status=404,
        )

    transactions = Transaction.objects.filter(
        Q(source_account=account) |
        Q(destination_account=account)
    ).order_by("-created_at")

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "BankTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#087f8c"),
        alignment=TA_CENTER,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b"),
    )

    story = []

    story.append(Paragraph("RURALBANK", title_style))
    story.append(
        Paragraph(
            "Enterprise Rural Banking System",
            subtitle_style,
        )
    )

    story.append(Spacer(1, 20))

    customer_name = (
        request.user.get_full_name()
        or request.user.email
    )

    account_details = [
        ["Customer Name", customer_name],
        ["Account Number", account.account_number],
        ["Account Type", account.account_type],
        ["Current Balance", f"INR {account.balance}"],
        [
            "Statement Generated",
            timezone.localtime().strftime("%d %B %Y, %I:%M %p"),
        ],
    ]

    details_table = Table(
        account_details,
        colWidths=[45 * mm, 110 * mm],
    )

    details_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8f5f5")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#123456")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe4ec")),
        ])
    )

    story.append(details_table)
    story.append(Spacer(1, 20))

    story.append(
        Paragraph("Transaction Statement", styles["Heading2"])
    )

    table_data = [[
        "Reference",
        "Type",
        "Description",
        "Amount (INR)",
        "Status",
        "Date",
    ]]

    total_deposits = 0
    total_withdrawals = 0
    total_transactions = 0

    for transaction in transactions:
        transaction_type = transaction.transaction_type
        amount = transaction.amount

        if transaction.status == "COMPLETED":
            if transaction_type == "DEPOSIT":
                total_deposits += amount
            elif transaction_type == "WITHDRAWAL":
                total_withdrawals += amount

        total_transactions += 1

        table_data.append([
            str(transaction.transaction_reference),
            transaction_type,
            (transaction.description or "")[:45],
            f"{amount:.2f}",
            transaction.status,
            timezone.localtime(
                transaction.created_at
            ).strftime("%d-%m-%Y %H:%M"),
        ])

    if total_transactions == 0:
        table_data.append([
            "-", "-", "No transactions found", "-", "-", "-"
        ])

    transaction_table = Table(
        table_data,
        repeatRows=1,
        colWidths=[
            48 * mm,
            25 * mm,
            55 * mm,
            28 * mm,
            25 * mm,
            35 * mm,
        ],
    )

    transaction_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123456")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe4ec")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                colors.white,
                colors.HexColor("#f3f7fa"),
            ]),
            ("ALIGN", (3, 1), (3, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 7),
        ])
    )

    story.append(transaction_table)
    story.append(Spacer(1, 20))

    summary_data = [
        ["Total Transactions", str(total_transactions)],
        ["Total Deposits", f"INR {total_deposits:.2f}"],
        ["Total Withdrawals", f"INR {total_withdrawals:.2f}"],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[55 * mm, 45 * mm],
    )

    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e8f5f5")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe4ec")),
        ])
    )

    story.append(summary_table)
    story.append(Spacer(1, 25))

    story.append(
        Paragraph(
            "This statement was generated electronically by RuralBank.",
            subtitle_style,
        )
    )

    document.build(story)

    pdf = buffer.getvalue()
    buffer.close()

    response = HttpResponse(
        pdf,
        content_type="application/pdf",
    )

    response["Content-Disposition"] = (
        'attachment; filename="RuralBank_Statement.pdf"'
    )

    return response
