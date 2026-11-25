
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import API from "../services/api";

function Deposit() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load customer's bank accounts
  const fetchAccounts = async () => {
    try {
      setError("");

      const response = await API.get("accounts/");

      const data = response.data;

      const accountList = Array.isArray(data)
        ? data
        : data.results || [];

      setAccounts(accountList);

      if (accountList.length > 0) {
        setAccount((previous) =>
          accountList.some(
            (item) => String(item.id) === previous
          )
            ? previous
            : String(accountList[0].id)
        );
      }
    } catch (err) {
      console.error("Account loading error:", err.response?.data);

      setError(
        err.response?.data?.detail ||
        "Unable to load your bank accounts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle deposit submission
  const handleDeposit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const depositAmount = Number(amount);
    const depositDescription = description.trim();

    if (!account) {
      setError("Please select a bank account.");
      return;
    }

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount <= 0
    ) {
      setError("Enter a valid deposit amount.");
      return;
    }

    if (!depositDescription) {
      setError("Please enter a deposit description.");
      return;
    }

    if (!Number.isInteger(Number(account))) {
      setError("Invalid bank account selection.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        account_id: Number(account),
        amount: depositAmount,
        description: depositDescription,
        idempotency_key: crypto.randomUUID(),
      };

      console.log("Deposit request:", payload);

      const response = await API.post("deposit/", payload);

      console.log("Deposit response:", response.data);

      setMessage("Money deposited successfully!");

      setAmount("");
      setDescription("");

      // Refresh account balance after successful deposit
      await fetchAccounts();

    } catch (err) {
      console.error("Deposit error:", err.response?.data);
      console.error("HTTP status:", err.response?.status);

      const data = err.response?.data;

      if (data && typeof data === "object") {
        const firstError = Object.values(data)
          .flat()
          .find((value) => typeof value === "string");

        setError(
          data.detail ||
          firstError ||
          "Deposit failed. Please try again."
        );
      } else {
        setError("Deposit failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bank-form-page">

      {/* Back button */}
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      {/* Deposit form card */}
      <div className="bank-form-card">

        <div className="form-icon">
          <Wallet size={30} />
        </div>

        <h1>Deposit Money</h1>

        <p className="form-subtitle">
          Add money to your bank account securely.
        </p>

        {loading ? (
          <p>Loading your bank accounts...</p>
        ) : accounts.length === 0 ? (
          <p>No bank accounts are available.</p>
        ) : (

          <form onSubmit={handleDeposit}>

            {/* Bank account */}
            <label htmlFor="account">
              Select Bank Account
            </label>

            <select
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            >
              <option value="" disabled>
                Select an account
              </option>

              {accounts.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.account_type} - {item.account_number}
                </option>
              ))}
            </select>

            {/* Deposit amount */}
            <label htmlFor="amount">
              Deposit Amount (₹)
            </label>

            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter deposit amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            {/* Description */}
            <label htmlFor="description">
              Description *
            </label>

            <textarea
              id="description"
              placeholder="Enter deposit description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />

            {/* Success message */}
            {message && (
              <div className="success-message">
                <CheckCircle size={18} />
                <span>{message}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Processing Deposit..."
                : "Deposit Money"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}

export default Deposit;
