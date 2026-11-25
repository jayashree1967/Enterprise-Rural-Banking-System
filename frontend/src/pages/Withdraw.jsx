
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import API from "../services/api";

function Withdraw() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Keep the same key when retrying an uncertain request
  const idempotencyKey = useRef(null);

  // Load bank accounts
  const fetchAccounts = async () => {
    try {
      const response = await API.get("accounts/");
      const data = response.data;

      const accountList = Array.isArray(data)
        ? data
        : data.results || [];

      setAccounts(accountList);

      setAccount((previous) => {
        if (
          previous &&
          accountList.some(
            (item) => String(item.id) === previous
          )
        ) {
          return previous;
        }

        return accountList.length
          ? String(accountList[0].id)
          : "";
      });
    } catch (err) {
      console.error("Account loading error:", err.response?.data);
      setError("Unable to load your bank accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const selectedAccount = accounts.find(
    (item) => String(item.id) === account
  );

  const availableBalance = Number(
    selectedAccount?.balance || 0
  );

  // Handle withdrawal
  const handleWithdraw = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const withdrawalAmount = Number(amount);
    const withdrawalDescription = description.trim();

    if (!account) {
      setError("Please select a bank account.");
      return;
    }

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (withdrawalAmount > availableBalance) {
      setError("Insufficient account balance.");
      return;
    }

    if (!withdrawalDescription) {
      setError("Please enter a withdrawal description.");
      return;
    }

    setSubmitting(true);

    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }

      const payload = {
        account_id: Number(account),
        amount: withdrawalAmount,
        description: withdrawalDescription,
        idempotency_key: idempotencyKey.current,
      };

      console.log("Withdrawal request:", payload);

      const response = await API.post("withdraw/", payload);

      console.log("Withdrawal response:", response.data);

      setMessage("Money withdrawn successfully!");

      setAmount("");
      setDescription("");
      idempotencyKey.current = null;

      await fetchAccounts();

    } catch (err) {
      console.error("Withdrawal error:", err.response?.data);

      const data = err.response?.data;

      if (data && typeof data === "object") {
        const firstError = Object.values(data)
          .flat()
          .find((value) => typeof value === "string");

        setError(
          data.detail ||
          firstError ||
          "Withdrawal failed. Please try again."
        );
      } else {
        setError("Withdrawal failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bank-form-page">

      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="bank-form-card">

        <div className="form-icon">
          <Wallet size={30} />
        </div>

        <h1>Withdraw Money</h1>

        <p className="form-subtitle">
          Withdraw money from your bank account securely.
        </p>

        {loading ? (
          <p>Loading your bank accounts...</p>
        ) : accounts.length === 0 ? (
          <p>No bank accounts are available.</p>
        ) : (

          <form onSubmit={handleWithdraw}>

            <label htmlFor="withdraw-account">
              Select Bank Account
            </label>

            <select
              id="withdraw-account"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                idempotencyKey.current = null;
              }}
              required
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.account_type} - {item.account_number}
                </option>
              ))}
            </select>

            <div className="available-balance">
              <span>Available Balance</span>
              <strong>
                ₹{availableBalance.toFixed(2)}
              </strong>
            </div>

            <label htmlFor="withdraw-amount">
              Withdrawal Amount (₹)
            </label>

            <input
              id="withdraw-amount"
              type="number"
              min="0.01"
              step="0.01"
              max={availableBalance}
              placeholder="Enter withdrawal amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                idempotencyKey.current = null;
              }}
              required
            />

            <label htmlFor="withdraw-description">
              Description *
            </label>

            <textarea
              id="withdraw-description"
              placeholder="Enter withdrawal description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                idempotencyKey.current = null;
              }}
              rows={3}
              required
            />

            {message && (
              <div className="success-message">
                <CheckCircle size={18} />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Processing Withdrawal..."
                : "Withdraw Money"}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}

export default Withdraw;
