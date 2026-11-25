
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN")
    : "—";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN")
    : "—";

function LoanRepayments() {
  const [repayments, setRepayments] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRepayment, setSelectedRepayment] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const navigate = useNavigate();
  const fetchRepayments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("loan-repayments/");
      const data = response.data;

      setRepayments(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load repayment information."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    setPaymentError("");

    try {
      // Assumes your customer bank-account endpoint is /api/accounts/
      const response = await API.get("accounts/");
      const data = response.data;

      const accountList = Array.isArray(data)
        ? data
        : data.results || [];

      // Only show active accounts.
      setAccounts(
        accountList.filter(
          (account) =>
            String(account.status || "").toUpperCase() === "ACTIVE"
        )
      );
    } catch (err) {
      setPaymentError(
        err.response?.data?.detail ||
        "Unable to load your bank accounts."
      );
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepayments();
  }, []);

  const stats = useMemo(() => {
    const paid = repayments.filter(
      (item) => item.status === "PAID"
    );

    const pending = repayments.filter(
      (item) => item.status === "PENDING"
    );

    const overdue = repayments.filter(
      (item) => item.status === "OVERDUE"
    );

    const partial = repayments.filter(
      (item) => item.status === "PARTIAL"
    );

    return {
      total: repayments.length,
      paid: paid.length,
      pending: pending.length,
      overdue: overdue.length,
      paidAmount: repayments.reduce(
        (total, item) =>
          total + Number(item.amount_paid || 0),
        0
      ),
      outstanding: repayments.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            Number(item.emi_amount || 0) -
              Number(item.amount_paid || 0)
          ),
        0
      ),
      partial: partial.length,
    };
  }, [repayments]);

  const openPaymentModal = async (repayment) => {
    setSelectedRepayment(repayment);
    setSelectedAccount("");
    setPaymentError("");
    setPaymentSuccess(null);

    await fetchAccounts();
  };

  const closePaymentModal = () => {
    if (paymentLoading) return;

    setSelectedRepayment(null);
    setSelectedAccount("");
    setPaymentError("");
  };

  const handlePayment = async () => {
    if (!selectedRepayment || !selectedAccount) {
      setPaymentError("Please select a bank account.");
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      const idempotencyKey = crypto.randomUUID();

      const response = await API.post(
        `loan-repayments/${selectedRepayment.id}/pay/`,
        {
          account_id: Number(selectedAccount),
          idempotency_key: idempotencyKey,
        }
      );

      setPaymentSuccess(response.data);

      // Refresh the repayment schedule after successful payment.
      await fetchRepayments();

    } catch (err) {
      const responseData = err.response?.data;

      setPaymentError(
        responseData?.detail ||
        responseData?.error ||
        "Payment could not be completed. Please try again."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <main className="customer-repayments">

      <header className="customer-repayments-header">
        <div>
          <span>RURALBANK / LOANS</span>
          <h1>My Loan Repayments</h1>
          <p>
            Track your EMI schedule and repayment history.
          </p>
        </div>

        <button
          onClick={fetchRepayments}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="repayment-error">
          {error}
        </div>
      )}

      {paymentSuccess && (
        <div className="repayment-success">
          <h3>Payment Successful!</h3>

          <p>
            Your EMI payment has been recorded successfully.
          </p>

          <p>
            Amount:{" "}
            <strong>
              {money(paymentSuccess.amount)}
            </strong>
          </p>

          <p>
            Transaction Reference:{" "}
            <strong>
              {paymentSuccess.transaction_reference ||
                paymentSuccess.transaction_id ||
                "Recorded"}
            </strong>
          </p>

          {paymentSuccess.paid_at && (
            <p>
              Paid On: {formatDateTime(paymentSuccess.paid_at)}
            </p>
          )}

          {paymentSuccess.account_balance !== undefined && (
            <p>
              Remaining Account Balance:{" "}
              <strong>
                {money(paymentSuccess.account_balance)}
              </strong>
            </p>
          )}

          <button onClick={() => setPaymentSuccess(null)}>
            Close
          </button>
        </div>
      )}

      <section className="customer-repayment-stats">

        <article>
          <span>Total Installments</span>
          <strong>{stats.total}</strong>
        </article>

        <article>
          <span>Paid</span>
          <strong>{stats.paid}</strong>
        </article>

        <article>
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </article>

        <article>
          <span>Overdue</span>
          <strong>{stats.overdue}</strong>
        </article>

        <article>
          <span>Total Paid</span>
          <strong>{money(stats.paidAmount)}</strong>
        </article>

        <article>
          <span>Outstanding</span>
          <strong>{money(stats.outstanding)}</strong>
        </article>

      </section>

      <section className="customer-repayment-panel">

        <h2>EMI Schedule</h2>

        {loading ? (
          <p className="repayment-empty">
            Loading repayments...
          </p>
        ) : repayments.length === 0 ? (
          <p className="repayment-empty">
            No approved loan repayment schedule found.
          </p>
        ) : (

          <div className="repayment-table-wrapper">

            <table>
              <thead>
                <tr>
                  <th>Loan Reference</th>
                  <th>Category</th>
                  <th>Installment</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>EMI</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Paid On</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {repayments.map((item) => {
                  const balance = Math.max(
                    0,
                    Number(item.emi_amount || 0) -
                      Number(item.amount_paid || 0)
                  );

                  const canPay =
                    ["PENDING", "OVERDUE"].includes(item.status) &&
                    balance > 0;

                  return (
                    <tr key={item.id}>

                      <td>
                        {String(
                          item.loan_reference || ""
                        ).slice(0, 8)}
                        ...
                      </td>

                      <td>{item.loan_category}</td>

                      <td>{item.installment_number}</td>

                      <td>{formatDate(item.due_date)}</td>

                      <td>{money(item.principal_amount)}</td>

                      <td>{money(item.interest_amount)}</td>

                      <td>{money(item.emi_amount)}</td>

                      <td>{money(item.amount_paid)}</td>

                      <td>{money(balance)}</td>

                      <td>
                        <span
                          className={`repayment-status ${String(
                            item.status || ""
                          ).toLowerCase()}`}
                        >
                          {item.status_display || item.status}
                        </span>
                      </td>

                      <td>
                        {item.paid_at
                          ? formatDateTime(item.paid_at)
                          : "—"}
                      </td>

                      <td>
                        {canPay ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/loan-repayments/${item.id}/pay`)}
                            disabled={paymentLoading}
                          >
                            Pay Now
                          </button>
                        ) : item.status === "PAID" ? (
                          <span>Completed</span>
                        ) : (
                          <span>Not Available</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>
        )}

        <p className="repayment-disclaimer">
          Payments are processed through your selected active bank
          account. Check your account balance before confirming.
        </p>

      </section>

      {/* Payment confirmation modal */}
      {selectedRepayment && (
        <div className="repayment-modal-overlay">

          <div className="repayment-modal">

            {!paymentSuccess ? (
              <>
                <h2>Pay EMI</h2>

                <p>
                  Confirm your installment payment.
                </p>

                <div className="repayment-modal-details">
                  <p>
                    Installment:{" "}
                    <strong>
                      {selectedRepayment.installment_number}
                    </strong>
                  </p>

                  <p>
                    Due Date:{" "}
                    <strong>
                      {formatDate(selectedRepayment.due_date)}
                    </strong>
                  </p>

                  <p>
                    EMI Amount:{" "}
                    <strong>
                      {money(selectedRepayment.emi_amount)}
                    </strong>
                  </p>
                </div>

                <label htmlFor="repayment-account">
                  Select Your Bank Account
                </label>

                {accountsLoading ? (
                  <p>Loading your accounts...</p>
                ) : accounts.length === 0 ? (
                  <p>
                    No active bank accounts are available for payment.
                  </p>
                ) : (
                  <select
                    id="repayment-account"
                    value={selectedAccount}
                    onChange={(event) =>
                      setSelectedAccount(event.target.value)
                    }
                  >
                    <option value="">
                      Select an account
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.account_number
                          ? `Account ending ${String(
                              account.account_number
                            ).slice(-4)}`
                          : `Account ${account.id}`}
                        {" — "}
                        {account.account_type || account.account_type_display || ""}
                        {" — "}
                        Balance: {money(account.balance)}
                      </option>
                    ))}
                  </select>
                )}

                {paymentError && (
                  <div className="repayment-error">
                    {paymentError}
                  </div>
                )}

                <div className="repayment-modal-actions">

                  <button
                    type="button"
                    onClick={closePaymentModal}
                    disabled={paymentLoading}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={
                      paymentLoading ||
                      accountsLoading ||
                      !selectedAccount ||
                      accounts.length === 0
                    }
                  >
                    {paymentLoading
                      ? "Processing..."
                      : `Confirm Payment ${money(
                          selectedRepayment.emi_amount
                        )}`}
                  </button>

                </div>
              </>
            ) : (
              <div>
                <h2>Payment Completed</h2>
                <p>Your payment was successful.</p>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRepayment(null);
                    setSelectedAccount("");
                    setPaymentSuccess(null);
                  }}
                >
                  Done
                </button>
              </div>
            )}

          </div>

        </div>
      )}

    </main>
  );
}

export default LoanRepayments;
