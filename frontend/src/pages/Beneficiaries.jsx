
import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
} from "lucide-react";

import API from "../services/api";

function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchBeneficiaries = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("beneficiaries/");
      setBeneficiaries(
        Array.isArray(response.data)
          ? response.data
          : response.data.results || []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Unable to load beneficiaries."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await API.post("beneficiaries/", {
        account_number: accountNumber.trim().toUpperCase(),
        nickname: nickname.trim(),
      });

      setMessage(
        response.data.message || "Beneficiary added successfully."
      );

      setAccountNumber("");
      setNickname("");

      await fetchBeneficiaries();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.error ||
        data?.detail ||
        (typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : "Unable to add beneficiary.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this beneficiary?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await API.delete(`beneficiaries/${id}/`);

      setMessage(
        response.data.message || "Beneficiary deleted successfully."
      );

      setBeneficiaries((previous) =>
        previous.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Unable to delete beneficiary."
      );
    }
  };

  return (
    <div className="beneficiary-page">
      <div className="beneficiary-header">
        <div>
          <h1>Beneficiary Management</h1>
          <p>Manage your saved bank account recipients.</p>
        </div>

        <button
          className="beneficiary-refresh"
          onClick={fetchBeneficiaries}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="success-message">{message}</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="beneficiary-content">
        <section className="beneficiary-form-card">
          <div className="beneficiary-card-heading">
            <UserPlus size={23} />
            <h2>Add New Beneficiary</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Beneficiary Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter recipient account number"
                required
              />
            </div>

            <div className="form-group">
              <label>Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Example: Friend, Family"
                maxLength={100}
                required
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={saving}
            >
              {saving ? "Adding..." : "Add Beneficiary"}
            </button>
          </form>
        </section>

        <section className="beneficiary-list-card">
          <div className="beneficiary-card-heading">
            <Users size={23} />
            <h2>Saved Beneficiaries</h2>
            <span className="beneficiary-count">
              {beneficiaries.length}
            </span>
          </div>

          {loading ? (
            <p>Loading beneficiaries...</p>
          ) : beneficiaries.length === 0 ? (
            <div className="beneficiary-empty">
              <Users size={35} />
              <p>No beneficiaries saved yet.</p>
              <span>Add a beneficiary to get started.</span>
            </div>
          ) : (
            <div className="beneficiary-list">
              {beneficiaries.map((beneficiary) => (
                <div
                  className="beneficiary-item"
                  key={beneficiary.id}
                >
                  <div className="beneficiary-avatar">
                    {beneficiary.nickname?.charAt(0).toUpperCase()}
                  </div>

                  <div className="beneficiary-details">
                    <h3>{beneficiary.nickname}</h3>
                    <p>
                      Account: {beneficiary.account_number}
                    </p>
                  </div>

                  <button
                    className="beneficiary-delete"
                    onClick={() => handleDelete(beneficiary.id)}
                    title="Delete beneficiary"
                    aria-label={`Delete ${beneficiary.nickname}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Beneficiaries;
