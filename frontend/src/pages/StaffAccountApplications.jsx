
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";


const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const getErrorMessage = (error) => {
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

function StaffAccountApplications() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchApplications = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("staff/account-applications/");
      const data = response.data;

      setApplications(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const counts = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    approved: applications.filter(a => a.status === "APPROVED").length,
    rejected: applications.filter(a => a.status === "REJECTED").length,
  }), [applications]);

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return applications.filter((app) => {
      const matchesStatus =
        filter === "ALL" || app.status === filter;

      const matchesSearch =
        !term ||
        String(app.customer_name || "").toLowerCase().includes(term) ||
        String(app.customer_email || "").toLowerCase().includes(term) ||
        String(app.id).includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [applications, filter, search]);

  const openReview = (application) => {
    setSelected(application);
    setRemarks(application.staff_remarks || "");
    setDecision("");
    setError("");
    setSuccess("");
  };

  const closeReview = () => {
    if (processing) return;
    setSelected(null);
    setDecision("");
    setRemarks("");
  };
  const submitDecisionFor = async (nextDecision) => {
    if (!selected) return;

    if (nextDecision === "REJECTED" && !remarks.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const response = await API.patch(
        `staff/account-applications/${selected.id}/review/`,
        {
          status: nextDecision,
          staff_remarks: remarks.trim(),
        }
      );

      const updated = response.data.application;

      setApplications((previous) =>
        previous.map((app) => app.id === updated.id ? updated : app)
      );

      setSuccess(response.data.message || "Application reviewed successfully.");
      setSelected(null);
      await fetchApplications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };
  const submitDecision = async () => {
    if (!selected || !decision) return;

    if (decision === "REJECTED" && !remarks.trim()) {
      setError("Please enter a reason for rejecting this application.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const response = await API.patch(
        `staff/account-applications/${selected.id}/review/`,
        {
          status: decision,
          staff_remarks: remarks.trim(),
        }
      );

      const updated = response.data.application;

      setApplications((previous) =>
        previous.map((app) =>
          app.id === updated.id ? updated : app
        )
      );

      setSuccess(
        decision === "APPROVED"
          ? `Application approved. New account number: ${updated.account_number}`
          : "Application rejected successfully."
      );

      setSelected(null);
      setDecision("");
      setRemarks("");

      await fetchApplications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="staff-account-page">
      <header className="staff-account-header">
        <div>
          <span className="staff-account-breadcrumb">
            RURALBANK / STAFF / ACCOUNT APPLICATIONS
          </span>
          <h1>Account Applications</h1>
          <p>Review and manage customer requests for new bank accounts.</p>
        </div>

        <button
          className="staff-refresh-btn"
          onClick={fetchApplications}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </header>

      {success && <div className="staff-success">{success}</div>}
      {error && !selected && <div className="staff-error">{error}</div>}

      <section className="staff-account-stats">
        <div className="staff-stat-card">
          <span>Total Applications</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="staff-stat-card pending-stat">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </div>
        <div className="staff-stat-card approved-stat">
          <span>Approved</span>
          <strong>{counts.approved}</strong>
        </div>
        <div className="staff-stat-card rejected-stat">
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </div>
      </section>

      <section className="staff-applications-panel">
        <div className="staff-applications-heading">
          <div>
            <h2>Customer Applications</h2>
            <p>Open an application to review its details.</p>
          </div>
        </div>

        <div className="staff-application-filters">
          <input
            type="search"
            placeholder="Search customer name, email or application ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="PENDING">Pending Applications</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All Applications</option>
          </select>
        </div>

        {loading ? (
          <div className="staff-empty-state">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="staff-empty-state">
            <h3>No applications found</h3>
            <p>There are no applications matching your search or filter.</p>
          </div>
        ) : (
          <div className="staff-application-list">
            {filteredApplications.map((app) => (
              <article className="staff-application-item" key={app.id}>
                <div className="staff-application-icon">▤</div>

                <div className="staff-application-info">
                  <h3>
                    {app.account_type_display ||
                      (app.account_type === "CURRENT"
                        ? "Current Account"
                        : "Savings Account")}
                  </h3>

                  <p>Application #{app.id}</p>
                  <p>Customer: {app.customer_name || "Customer"}</p>
                  <p>{app.customer_email}</p>
                  <p>Submitted: {formatDate(app.created_at)}</p>
                </div>

                <div className="staff-application-status">
                  <span className={`application-status ${app.status.toLowerCase()}`}>
                    {app.status_display || app.status}
                  </span>

                  <button
                    className="staff-review-btn"
                    onClick={() => openReview(app)}
                  >
                    {app.status === "PENDING" ? "Review Application" : "View Details"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="staff-review-overlay">
          <section className="staff-review-modal">
            <div className="staff-review-modal-header">
              <div>
                <span>APPLICATION #{selected.id}</span>
                <h2>Review Account Application</h2>
              </div>

              <button
                className="staff-modal-close"
                onClick={closeReview}
                disabled={processing}
              >
                ×
              </button>
            </div>

            <div className="staff-review-details">
              <div>
                <span>Customer Name</span>
                <strong>{selected.customer_name || "—"}</strong>
              </div>

              <div>
                <span>Email Address</span>
                <strong>{selected.customer_email || "—"}</strong>
              </div>

              <div>
                <span>Account Type</span>
                <strong>{selected.account_type_display || selected.account_type}</strong>
              </div>

              <div>
                <span>Occupation</span>
                <strong>{selected.occupation || "—"}</strong>
              </div>

              <div>
                <span>Monthly Income</span>
                <strong>{formatCurrency(selected.monthly_income)}</strong>
              </div>

              <div>
                <span>Application Date</span>
                <strong>{formatDate(selected.created_at)}</strong>
              </div>
            </div>

            <div className="staff-review-purpose">
              <span>Purpose of Opening Account</span>
              <p>{selected.purpose || "No purpose provided."}</p>
            </div>

            {selected.status !== "PENDING" && (
              <div className="staff-review-purpose">
                <span>Staff Remarks / Decision Reason</span>
                <p>{selected.staff_remarks || "No remarks provided."}</p>
                {selected.account_number && (
                  <p><strong>Created Account:</strong> {selected.account_number}</p>
                )}
              </div>
            )}

            {selected.status === "PENDING" && (
              <>
                <div className="staff-review-field">
                  <label htmlFor="staff-remarks">
                    Staff Remarks
                    {decision === "REJECTED" ? " (required)" : ""}
                  </label>

                  <textarea
                    id="staff-remarks"
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter review remarks. A reason is required for rejection."
                  />
                </div>

                {error && <div className="staff-error">{error}</div>}

                <div className="staff-review-actions">
                  <button
                    className="staff-reject-btn"
                    disabled={processing}
                    onClick={() => {
                      setDecision("REJECTED");
                      if (!remarks.trim()) {
                        setError("Enter a rejection reason before confirming.");
                      } else {
                        submitDecision();
                      }
                    }}
                  >
                    Reject Application
                  </button>

                  <button
                    className="staff-approve-btn"
                    disabled={processing}
                    onClick={() => {
                      setDecision("APPROVED");
                      submitDecisionFor("APPROVED");
                    }}
                  >
                    {processing ? "Processing..." : "Approve Application"}
                  </button>
                </div>
              </>
            )}

            {selected.status !== "PENDING" && (
              <button className="staff-review-btn" onClick={closeReview}>
                Close
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default StaffAccountApplications;
