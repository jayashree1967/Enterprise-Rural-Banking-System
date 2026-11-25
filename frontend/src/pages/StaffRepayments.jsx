
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";


const STATUSES = ["PENDING", "PAID", "OVERDUE", "PARTIAL"];

const CATEGORIES = [
  "PERSONAL",
  "HOME",
  "EDUCATION",
  "AGRICULTURE",
  "BUSINESS",
];

const currency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const dateFormat = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN")
    : "—";

const errorMessage = (error) => {
  const data = error.response?.data;

  if (!data) return error.message || "Something went wrong.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;

  return Object.entries(data)
    .map(([key, value]) =>
      `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
    )
    .join("\n");
};

function StaffRepayments() {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRepayments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("staff/repayments/");
      const data = response.data;

      setRepayments(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Access denied. Log in using an authorized staff or admin account."
          : errorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepayments();
  }, []);

  const filteredRepayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return repayments.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" ||
        item.loan_category === categoryFilter;

      const matchesSearch =
        !term ||
        String(item.customer_email || "").toLowerCase().includes(term) ||
        String(item.loan_reference || "").toLowerCase().includes(term) ||
        String(item.installment_number).includes(term);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [repayments, statusFilter, categoryFilter, search]);

  const counts = useMemo(() => ({
    total: repayments.length,
    pending: repayments.filter((x) => x.status === "PENDING").length,
    paid: repayments.filter((x) => x.status === "PAID").length,
    overdue: repayments.filter((x) => x.status === "OVERDUE").length,
  }), [repayments]);

  const markAsPaid = async (repayment) => {
    const confirmed = window.confirm(
      `Confirm receipt of ${currency(repayment.emi_amount)} for installment ${repayment.installment_number}?`
    );

    if (!confirmed) return;

    setProcessingId(repayment.id);
    setError("");
    setSuccess("");

    try {
      const response = await API.post(
        `staff/repayments/${repayment.id}/mark-paid/`
      );

      setSuccess(response.data.message || "Payment recorded successfully.");

      // Update this installment immediately in the table.
      setRepayments((previous) =>
        previous.map((item) =>
          item.id === repayment.id
            ? response.data.repayment
            : item
        )
      );
    } catch (err) {
      setError(errorMessage(err));
      await fetchRepayments();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="staff-repayments-page">
      <header className="repayments-header">
        <div>
          <span className="repayments-eyebrow">
            RURALBANK / OPERATIONS
          </span>
          <h1>Loan Repayment Management</h1>
          <p>Monitor customer EMI payments and record received installments.</p>
        </div>

        <button
          className="repayments-refresh"
          onClick={fetchRepayments}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      {error && (
        <div className="repayments-alert repayments-error">
          {error}
        </div>
      )}

      {success && (
        <div className="repayments-alert repayments-success">
          {success}
        </div>
      )}

      <section className="repayments-stats">
        <div className="repayment-stat-card">
          <span>Total Installments</span>
          <strong>{counts.total}</strong>
        </div>

        <div className="repayment-stat-card">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </div>

        <div className="repayment-stat-card">
          <span>Paid</span>
          <strong>{counts.paid}</strong>
        </div>

        <div className="repayment-stat-card">
          <span>Overdue</span>
          <strong>{counts.overdue}</strong>
        </div>
      </section>

      <section className="repayments-panel">
        <div className="repayments-panel-heading">
          <div>
            <h2>Customer EMI Payments</h2>
            <p>{filteredRepayments.length} installment(s) found</p>
          </div>
        </div>

        <div className="repayments-filters">
          <input
            type="search"
            placeholder="Search customer email or loan reference..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Payment Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="ALL">All Loan Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="repayments-empty">Loading EMI payments...</div>
        ) : filteredRepayments.length === 0 ? (
          <div className="repayments-empty">
            No repayment installments found.
          </div>
        ) : (
          <div className="repayments-table-wrapper">
            <table className="repayments-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Loan Reference</th>
                  <th>Category</th>
                  <th>Installment</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>EMI Amount</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRepayments.map((item) => (
                  <tr key={item.id}>
                    <td>{item.customer_email}</td>

                    <td className="repayment-reference">
                      {item.loan_reference}
                    </td>

                    <td>{item.loan_category}</td>

                    <td>{item.installment_number}</td>

                    <td>{dateFormat(item.due_date)}</td>

                    <td>{currency(item.principal_amount)}</td>

                    <td>{currency(item.interest_amount)}</td>

                    <td><strong>{currency(item.emi_amount)}</strong></td>

                    <td>{currency(item.amount_paid)}</td>

                    <td>
                      <span className={`repayment-status status-${item.status.toLowerCase()}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>

                    <td>
                      {item.status === "PAID" ? (
                        <span className="repayment-paid-label">
                          Paid ✓
                        </span>
                      ) : (
                        <button
                          className="repayment-mark-btn"
                          onClick={() => markAsPaid(item)}
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id
                            ? "Saving..."
                            : "Mark as Paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default StaffRepayments;
