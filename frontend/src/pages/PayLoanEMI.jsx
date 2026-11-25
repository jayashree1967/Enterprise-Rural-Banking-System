
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";


const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN");
};

function PayLoanEMI() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repayment, setRepayment] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  // Load repayment and customer bank account details.
  useEffect(() => {
    let cancelled = false;

    const loadPaymentDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const [repaymentResponse, accountResponse] =
          await Promise.all([
            API.get("loan-repayments/"),
            API.get("accounts/"),
          ]);

        if (cancelled) return;

        const repaymentData = repaymentResponse.data;

        const repaymentList = Array.isArray(repaymentData)
          ? repaymentData
          : repaymentData.results || [];

        const selected = repaymentList.find(
          (item) => String(item.id) === String(id)
        );

        if (!selected) {
          setError("Repayment record not found.");
          return;
        }

        if (!["PENDING", "OVERDUE"].includes(selected.status)) {
          setError("This installment is not available for payment.");
          return;
        }

        setRepayment(selected);

        const accountData = accountResponse.data;

        const accountList = Array.isArray(accountData)
          ? accountData
          : accountData.results || [];

        const activeAccounts = accountList.filter(
          (account) =>
            String(account.status || "").toUpperCase() === "ACTIVE"
        );

        setAccounts(activeAccounts);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load payment details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPaymentDetails();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const amountPayable = repayment
    ? Math.max(
        0,
        Number(repayment.emi_amount || 0) -
          Number(repayment.amount_paid || 0)
      )
    : 0;

  const selectedAccountDetails = accounts.find(
    (account) => String(account.id) === String(selectedAccount)
  );

  // Process EMI payment.
  const handlePayment = async (event) => {
    event.preventDefault();

    if (!selectedAccount) {
      setError("Please select your bank account.");
      return;
    }

    if (!selectedAccountDetails) {
      setError("Please select a valid active bank account.");
      return;
    }

    if (Number(selectedAccountDetails.balance) < amountPayable) {
      setError("Insufficient account balance to pay this EMI.");
      return;
    }

    setPaymentLoading(true);
    setError("");

    try {
      const response = await API.post(
        `loan-repayments/${id}/pay/`,
        {
          account_id: Number(selectedAccount),
          idempotency_key: crypto.randomUUID(),
        }
      );

      setSuccess(response.data);
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.detail ||
          data?.error ||
          "Payment could not be completed. Please try again."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // Automatically return to repayment dashboard after success.
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigate("/loan-repayments", { replace: true });
    }, 4000);

    return () => clearTimeout(timer);
  }, [success, navigate]);

  // Loading screen.
  if (loading) {
    return (
      <main className="emi-payment-page">
        <div className="emi-loading">
          <div className="emi-loader"></div>
          <p>Loading your payment details...</p>
        </div>
      </main>
    );
  }

  // Successful payment screen.
  if (success) {
    return (
      <main className="emi-payment-page">
        <div className="emi-success-card">
          <div className="emi-success-icon">✓</div>

          <h1>Payment Successful!</h1>

          <p>
            Your EMI payment has been processed successfully.
          </p>

          <div className="emi-success-amount">
            {money(success.amount ?? amountPayable)}
          </div>

          <div className="emi-success-reference">
            <span>Transaction Reference</span>
            <strong>
              {success.transaction_reference ||
                success.transaction_id ||
                "Recorded"}
            </strong>
          </div>

          {success.paid_at && (
            <p>
              Paid on:{" "}
              {new Date(success.paid_at).toLocaleString("en-IN")}
            </p>
          )}

          {success.account_balance !== undefined && (
            <p>
              Remaining Account Balance:{" "}
              <strong>{money(success.account_balance)}</strong>
            </p>
          )}

          <p className="emi-redirect-message">
            Redirecting to My Loan Repayments in 4 seconds...
          </p>

          <button
            type="button"
            className="emi-primary-button"
            onClick={() =>
              navigate("/loan-repayments", { replace: true })
            }
          >
            Back to My Repayments
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="emi-payment-page">
      <header className="emi-page-header">
        <div>
          <span className="emi-breadcrumb">
            RURALBANK <span>/</span> LOANS <span>/</span> PAYMENT
          </span>

          <h1>Pay Your EMI</h1>

          <p>
            Review your installment details and make a secure payment.
          </p>
        </div>

        <button
          className="emi-back-button"
          type="button"
          onClick={() => navigate("/loan-repayments")}
        >
          ← Back to Repayments
        </button>
      </header>

      {error && (
        <div className="emi-error-message">
          <span>⚠</span>
          {error}
        </div>
      )}

      {!repayment ? (
        <section className="emi-main-card">
          <h2>Payment details unavailable</h2>
          <p>Please return to your repayment dashboard.</p>

          <button
            className="emi-primary-button"
            onClick={() => navigate("/loan-repayments")}
          >
            Back to Repayments
          </button>
        </section>
      ) : (
        <div className="emi-layout">
          {/* Left: Installment summary */}
          <section className="emi-main-card">
            <div className="emi-card-heading">
              <div>
                <span className="emi-section-label">
                  PAYMENT DETAILS
                </span>

                <h2>Installment Summary</h2>
              </div>

              <span className="emi-pending-badge">
                {repayment.status_display || repayment.status}
              </span>
            </div>

            <div className="emi-amount-card">
              <span>Amount Payable</span>

              <h2>{money(amountPayable)}</h2>

              <p>Monthly loan installment</p>
            </div>

            <div className="emi-details-grid">
              <div className="emi-detail-item">
                <span>Loan Category</span>
                <strong>{repayment.loan_category || "—"}</strong>
              </div>

              <div className="emi-detail-item">
                <span>Installment Number</span>
                <strong>{repayment.installment_number}</strong>
              </div>

              <div className="emi-detail-item">
                <span>Loan Reference</span>
                <strong>
                  {String(repayment.loan_reference || "").slice(0, 16)}
                </strong>
              </div>

              <div className="emi-detail-item">
                <span>Due Date</span>
                <strong>{formatDate(repayment.due_date)}</strong>
              </div>

              <div className="emi-detail-item">
                <span>Total EMI</span>
                <strong>{money(repayment.emi_amount)}</strong>
              </div>

              <div className="emi-detail-item">
                <span>Already Paid</span>
                <strong>{money(repayment.amount_paid)}</strong>
              </div>
            </div>

            <div className="emi-security-note">
              <span>🔒</span>

              <div>
                <strong>Secure Payment</strong>

                <p>
                  Your payment will be processed through your selected
                  RuralBank account.
                </p>
              </div>
            </div>
          </section>

          {/* Right: Payment form */}
          <section className="emi-payment-card">
            <div className="emi-payment-icon">₹</div>

            <h2>Payment Method</h2>

            <p className="emi-payment-subtitle">
              Select the bank account you want to pay from.
            </p>

            <form onSubmit={handlePayment}>
              <label htmlFor="payment-account">
                Select Bank Account
              </label>

              {accounts.length === 0 ? (
                <div className="emi-no-account">
                  No active bank account is available.
                </div>
              ) : (
                <select
                  id="payment-account"
                  className="emi-account-select"
                  value={selectedAccount}
                  onChange={(event) => {
                    setSelectedAccount(event.target.value);
                    setError("");
                  }}
                  required
                >
                  <option value="">
                    Choose your bank account
                  </option>

                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number
                        ? `Account ending ${String(
                            account.account_number
                          ).slice(-4)}`
                        : `Account ${account.id}`}
                      {" — "}
                      {account.account_type ||
                        account.account_type_display ||
                        ""}
                      {" — Balance: "}
                      {money(account.balance)}
                    </option>
                  ))}
                </select>
              )}

              {selectedAccountDetails && (
                <div className="emi-selected-account">
                  <span>Selected Account Balance</span>

                  <strong>
                    {money(selectedAccountDetails.balance)}
                  </strong>
                </div>
              )}

              <div className="emi-payment-total">
                <span>Total to Pay</span>
                <strong>{money(amountPayable)}</strong>
              </div>

              <button
                type="submit"
                className="emi-primary-button emi-pay-button"
                disabled={
                  paymentLoading ||
                  !selectedAccount ||
                  accounts.length === 0 ||
                  amountPayable <= 0
                }
              >
                {paymentLoading
                  ? "Processing Payment..."
                  : `Confirm & Pay ${money(amountPayable)}`}
              </button>

              <p className="emi-terms">
                By clicking Confirm & Pay, you authorize the debit of
                the displayed EMI amount from your selected account.
              </p>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default PayLoanEMI;
