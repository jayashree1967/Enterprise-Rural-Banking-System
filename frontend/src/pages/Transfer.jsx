
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  Wallet,
  Users,
} from "lucide-react";

import API from "../services/api";

function Transfer() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);

  const [sourceAccount, setSourceAccount] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [beneficiaryLoading, setBeneficiaryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [beneficiaryError, setBeneficiaryError] = useState("");
  const [reference, setReference] = useState("");

  const idempotencyKey = useRef(null);

  // Load customer's bank accounts
  const fetchAccounts = async () => {
    try {
      const response = await API.get("accounts/");
      const data = response.data;

      const accountList = Array.isArray(data)
        ? data
        : data.results || [];

      setAccounts(accountList);

      setSourceAccount((previous) => {
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

  // Load saved beneficiaries
  const fetchBeneficiaries = async () => {
    try {
      setBeneficiaryError("");

      const response = await API.get("beneficiaries/");
      const data = response.data;

      const beneficiaryList = Array.isArray(data)
        ? data
        : data.results || [];

      setBeneficiaries(beneficiaryList);
    } catch (err) {
      console.error(
        "Beneficiary loading error:",
        err.response?.data
      );

      setBeneficiaryError(
        "Saved beneficiaries could not be loaded. You can enter the account number manually."
      );
    } finally {
      setBeneficiaryLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchBeneficiaries();
  }, []);

  const selectedSource = accounts.find(
    (item) => String(item.id) === sourceAccount
  );

  const availableBalance = Number(
    selectedSource?.balance || 0
  );

  // Select a saved beneficiary
  const handleBeneficiaryChange = (e) => {
    const beneficiaryId = e.target.value;

    setSelectedBeneficiary(beneficiaryId);
    setError("");
    idempotencyKey.current = null;

    if (!beneficiaryId) {
      setRecipientAccountNumber("");
      return;
    }

    const beneficiary = beneficiaries.find(
      (item) => String(item.id) === beneficiaryId
    );

    if (beneficiary) {
      setRecipientAccountNumber(
        beneficiary.account_number.toUpperCase()
      );
    }
  };

  // Transfer money
  const handleTransfer = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setReference("");

    const transferAmount = Number(amount);
    const normalizedRecipient =
      recipientAccountNumber.trim().toUpperCase();

    const transferDescription = description.trim();

    if (!sourceAccount) {
      setError("Please select your source bank account.");
      return;
    }

    if (!normalizedRecipient) {
      setError("Please enter the recipient account number.");
      return;
    }

    if (
      normalizedRecipient ===
      String(selectedSource?.account_number || "").toUpperCase()
    ) {
      setError("You cannot transfer money to the same account.");
      return;
    }

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      setError("Enter a valid transfer amount.");
      return;
    }

    if (transferAmount > availableBalance) {
      setError("Insufficient account balance.");
      return;
    }

    if (!transferDescription) {
      setError("Please enter a transfer description.");
      return;
    }

    setSubmitting(true);

    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }

      const payload = {
        source_account_id: Number(sourceAccount),
        recipient_account_number: normalizedRecipient,
        amount: transferAmount,
        description: transferDescription,
        idempotency_key: idempotencyKey.current,
      };

      const response = await API.post("transfer/", payload);

      setMessage(
        response.data.message ||
        "Money transferred successfully!"
      );

      setReference(
        response.data.transaction_reference || ""
      );

      setAmount("");
      setDescription("");
      setRecipientAccountNumber("");
      setSelectedBeneficiary("");

      idempotencyKey.current = null;

      await fetchAccounts();
    } catch (err) {
      console.error("Transfer error:", err.response?.data);

      const data = err.response?.data;

      if (data && typeof data === "object") {
        const firstError = Object.values(data)
          .flat()
          .find((value) => typeof value === "string");

        setError(
          data.detail ||
          firstError ||
          "Transfer failed. Please try again."
        );
      } else {
        setError("Transfer failed. Please try again.");
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
          <Send size={30} />
        </div>

        <h1>Transfer Money</h1>

        <p className="form-subtitle">
          Transfer money securely to another bank account.
        </p>

        {loading ? (
          <p className="loading-text">
            Loading your bank accounts...
          </p>
        ) : accounts.length === 0 ? (
          <div className="empty-account-message">
            <Wallet size={28} />
            <p>
              You do not have a bank account available.
            </p>
          </div>
        ) : (
          <form onSubmit={handleTransfer}>
            {/* Source Account */}
            <div className="form-group">
              <label htmlFor="source-account">
                From Account
              </label>

              <select
                id="source-account"
                value={sourceAccount}
                onChange={(e) => {
                  setSourceAccount(e.target.value);
                  idempotencyKey.current = null;
                  setError("");
                }}
                required
              >
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.account_type} - {item.account_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Available Balance */}
            <div className="available-balance">
              <span>Available Balance</span>
              <strong>
                ₹{availableBalance.toFixed(2)}
              </strong>
            </div>

            {/* Saved Beneficiaries */}
            <div className="form-group">
              <label htmlFor="beneficiary">
                <Users size={17} />
                Select Saved Beneficiary
              </label>

              <select
                id="beneficiary"
                value={selectedBeneficiary}
                onChange={handleBeneficiaryChange}
                disabled={beneficiaryLoading}
              >
                <option value="">
                  {beneficiaryLoading
                    ? "Loading beneficiaries..."
                    : "Choose a beneficiary (optional)"}
                </option>

                {beneficiaries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname} - {item.account_number}
                  </option>
                ))}
              </select>

              {beneficiaryError && (
                <p className="field-hint">
                  {beneficiaryError}
                </p>
              )}
            </div>

            {/* Recipient Account Number */}
            <div className="form-group">
              <label htmlFor="recipient-account">
                Recipient Account Number
              </label>

              <input
                id="recipient-account"
                type="text"
                placeholder="Enter recipient account number"
                value={recipientAccountNumber}
                onChange={(e) => {
                  setRecipientAccountNumber(
                    e.target.value.toUpperCase()
                  );
                  setSelectedBeneficiary("");
                  idempotencyKey.current = null;
                  setError("");
                }}
                required
              />

              <p className="field-hint">
                Select a saved beneficiary above or enter an
                account number manually.
              </p>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label htmlFor="transfer-amount">
                Transfer Amount (₹)
              </label>

              <input
                id="transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={availableBalance}
                placeholder="Enter transfer amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  idempotencyKey.current = null;
                  setError("");
                }}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="transfer-description">
                Description *
              </label>

              <textarea
                id="transfer-description"
                placeholder="Enter transfer description"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  idempotencyKey.current = null;
                  setError("");
                }}
                required
              />
            </div>

            {/* Success */}
            {message && (
              <div className="success-message">
                <CheckCircle size={20} />
                <span>{message}</span>
              </div>
            )}

            {/* Transaction Reference */}
            {reference && (
              <div className="reference-box">
                <span>Transaction Reference</span>
                <strong>{reference}</strong>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Processing Transfer..."
                : "Transfer Money"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Transfer;
