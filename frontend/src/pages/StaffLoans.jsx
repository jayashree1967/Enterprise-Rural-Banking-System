
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
// import "./StaffLoans.css";
import { useNavigate } from "react-router-dom";

const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const CATEGORIES = [
  "PERSONAL",
  "HOME",
  "EDUCATION",
  "AGRICULTURE",
  "BUSINESS",
];

const initialReview = {
  approved_amount: "",
  annual_interest_rate: "",
  approved_tenure_months: "",
  staff_remarks: "",
  rejection_reason: "",
};

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
  if (data.message) return data.message;

  return Object.entries(data)
    .map(([key, value]) =>
      `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
    )
    .join("\n");
};

function StaffLoans() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [review, setReview] = useState(initialReview);
  const [processing, setProcessing] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("staff/loans/");
      const data = response.data;

      setApplications(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Access denied. Please log in using an authorized staff or admin account."
          : getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((loan) => {
      const matchesStatus =
        statusFilter === "ALL" || loan.status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" ||
        loan.category === categoryFilter;

      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        String(loan.reference_number || "")
          .toLowerCase()
          .includes(searchText) ||
        String(loan.customer_email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(loan.id).includes(searchText);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [applications, statusFilter, categoryFilter, search]);

  const counts = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter(
        (loan) => loan.status === "SUBMITTED"
      ).length,
      underReview: applications.filter(
        (loan) => loan.status === "UNDER_REVIEW"
      ).length,
      approved: applications.filter(
        (loan) => loan.status === "APPROVED"
      ).length,
      rejected: applications.filter(
        (loan) => loan.status === "REJECTED"
      ).length,
    };
  }, [applications]);

  const openLoan = (loan) => {
    setSelectedLoan(loan);
    setReview({
      ...initialReview,
      approved_amount: loan.requested_amount || "",
      approved_tenure_months: loan.tenure_months || "",
    });
    setError("");
    setSuccess("");
  };

  const closeLoan = () => {
    setSelectedLoan(null);
    setReview(initialReview);
    setError("");
  };

  const updateReview = (event) => {
    const { name, value } = event.target;

    setReview((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const updateApplication = async (payload, successMessage) => {
    if (!selectedLoan) return;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await API.patch(
        `staff/loans/${selectedLoan.id}/review/`,
        payload
      );

      setSuccess(successMessage);
      await fetchApplications();

      const detailResponse = await API.get(
        `staff/loans/`
      );

      const updatedData = Array.isArray(detailResponse.data)
        ? detailResponse.data
        : detailResponse.data.results || [];

      const updatedLoan = updatedData.find(
        (loan) => loan.id === selectedLoan.id
      );

      if (updatedLoan) {
        setSelectedLoan(updatedLoan);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const moveToReview = async () => {
    await updateApplication(
      { status: "UNDER_REVIEW" },
      "Application moved to Under Review."
    );
  };

  const approveLoan = async (event) => {
    event.preventDefault();

    if (
      !review.approved_amount ||
      !review.annual_interest_rate ||
      !review.approved_tenure_months ||
      !review.staff_remarks.trim()
    ) {
      setError("Please complete all approval fields.");
      return;
    }

    if (
      Number(review.approved_amount) <= 0 ||
      Number(review.approved_amount) >
        Number(selectedLoan.requested_amount)
    ) {
      setError(
        "Approved amount must be positive and cannot exceed the requested amount."
      );
      return;
    }

    if (
      Number(review.approved_tenure_months) <= 0 ||
      Number(review.approved_tenure_months) >
        Number(selectedLoan.tenure_months)
    ) {
      setError(
        "Approved tenure must be positive and cannot exceed the requested tenure."
      );
      return;
    }

    if (Number(review.annual_interest_rate) < 0) {
      setError("Interest rate cannot be negative.");
      return;
    }

    await updateApplication(
      {
        status: "APPROVED",
        approved_amount: review.approved_amount,
        annual_interest_rate: review.annual_interest_rate,
        approved_tenure_months: Number(
          review.approved_tenure_months
        ),
        staff_remarks: review.staff_remarks.trim(),
      },
      "Loan application approved successfully. EMI schedule generated."
    );
  };

  const rejectLoan = async () => {
    if (!review.rejection_reason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    await updateApplication(
      {
        status: "REJECTED",
        rejection_reason: review.rejection_reason.trim(),
      },
      "Loan application rejected successfully."
    );
  };

  const getDocumentUrl = (filePath) => {
    if (!filePath) return "#";

    if (/^https?:\/\//i.test(filePath)) {
      return filePath;
    }

    const mediaPath = filePath.startsWith("/media/")
      ? filePath
      : `/media/${filePath.replace(/^\/+/, "")}`;

    return `${API.defaults.baseURL.replace(/\/api\/?$/, "")}${mediaPath}`;
  };

  return (
    <div className="staff-loans-page">
      <header className="staff-loans-header">
        <div>
          <span className="staff-eyebrow">RURALBANK / OPERATIONS</span>
          <h1>Staff Loan Management</h1>
          <p>Review, process and manage customer loan applications.</p>
        </div>

        <button
          className="staff-refresh-btn"
          onClick={fetchApplications}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
        <button
            className="staff-refresh-btn"
            onClick={() => navigate("/staff/repayments")}
            >
            Loan Repayment Management
            </button>
      </header>

      {error && (
        <div className="staff-alert staff-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="staff-alert staff-alert-success">
          {success}
        </div>
      )}

      <section className="staff-stat-grid">
        <div className="staff-stat-card">
          <span>Total Applications</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="staff-stat-card">
          <span>Submitted</span>
          <strong>{counts.submitted}</strong>
        </div>
        <div className="staff-stat-card">
          <span>Under Review</span>
          <strong>{counts.underReview}</strong>
        </div>
        <div className="staff-stat-card">
          <span>Approved</span>
          <strong>{counts.approved}</strong>
        </div>
        <div className="staff-stat-card">
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </div>
      </section>

      <section className="staff-loans-panel">
        <div className="staff-panel-heading">
          <div>
            <h2>Loan Applications</h2>
            <p>
              {filteredApplications.length} application(s) found
            </p>
          </div>
        </div>

        <div className="staff-filter-row">
          <input
            type="search"
            placeholder="Search reference, email or ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="staff-empty-state">
            Loading loan applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="staff-empty-state">
            No loan applications match your filters.
          </div>
        ) : (
          <div className="staff-table-wrapper">
            <table className="staff-loans-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Requested Amount</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.map((loan) => (
                  <tr key={loan.id}>
                    <td className="staff-reference">
                      {loan.reference_number}
                    </td>
                    <td>{loan.customer_email || "—"}</td>
                    <td>
                      {loan.category_display || loan.category}
                    </td>
                    <td>{formatCurrency(loan.requested_amount)}</td>
                    <td>{formatDate(loan.created_at)}</td>
                    <td>
                      <span
                        className={`staff-status status-${loan.status.toLowerCase()}`}
                      >
                        {(loan.status_display || loan.status).replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        className="staff-view-btn"
                        onClick={() => openLoan(loan)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedLoan && (
        <div
          className="staff-modal-backdrop"
          onClick={closeLoan}
        >
          <section
            className="staff-loan-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="staff-modal-header">
              <div>
                <span className="staff-eyebrow">
                  APPLICATION #{selectedLoan.id}
                </span>
                <h2>Loan Application Details</h2>
                <p>{selectedLoan.reference_number}</p>
              </div>

              <button
                className="staff-close-btn"
                onClick={closeLoan}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-detail-grid">
                <div>
                  <span>Customer Email</span>
                  <strong>{selectedLoan.customer_email || "—"}</strong>
                </div>
                <div>
                  <span>Loan Category</span>
                  <strong>
                    {selectedLoan.category_display ||
                      selectedLoan.category}
                  </strong>
                </div>
                <div>
                  <span>Requested Amount</span>
                  <strong>
                    {formatCurrency(selectedLoan.requested_amount)}
                  </strong>
                </div>
                <div>
                  <span>Monthly Income</span>
                  <strong>
                    {formatCurrency(selectedLoan.monthly_income)}
                  </strong>
                </div>
                <div>
                  <span>Existing Obligations</span>
                  <strong>
                    {formatCurrency(
                      selectedLoan.existing_monthly_obligations
                    )}
                  </strong>
                </div>
                <div>
                  <span>Requested Tenure</span>
                  <strong>{selectedLoan.tenure_months} months</strong>
                </div>
                <div>
                  <span>Application Date</span>
                  <strong>{formatDate(selectedLoan.created_at)}</strong>
                </div>
                <div>
                  <span>Current Status</span>
                  <strong>
                    {selectedLoan.status_display ||
                      selectedLoan.status}
                  </strong>
                </div>
              </div>

              <div className="staff-purpose-box">
                <h3>Loan Purpose</h3>
                <p>{selectedLoan.purpose || "Not provided."}</p>
              </div>

              <div className="staff-documents-section">
                <h3>Uploaded Documents</h3>

                {!selectedLoan.documents?.length ? (
                  <p className="staff-muted">
                    No documents uploaded.
                  </p>
                ) : (
                  selectedLoan.documents.map((document) => (
                    <div
                      className="staff-document-row"
                      key={document.id}
                    >
                      <div>
                        <strong>
                          {document.document_type_display ||
                            document.document_type}
                        </strong>
                        <span>
                          Uploaded: {formatDate(document.uploaded_at)}
                        </span>
                      </div>

                      <a
                        href={getDocumentUrl(document.document_file)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Document ↗
                      </a>
                    </div>
                  ))
                )}
              </div>

              {selectedLoan.status === "APPROVED" && (
                <div className="staff-decision-box">
                  <h3>Approved Loan Details</h3>
                  <p>
                    Approved Amount:{" "}
                    <strong>
                      {formatCurrency(selectedLoan.approved_amount)}
                    </strong>
                  </p>
                  <p>
                    Annual Interest:{" "}
                    <strong>
                      {selectedLoan.annual_interest_rate}%
                    </strong>
                  </p>
                  <p>
                    Approved Tenure:{" "}
                    <strong>
                      {selectedLoan.approved_tenure_months} months
                    </strong>
                  </p>
                  <p>
                    Staff Remarks:{" "}
                    <strong>{selectedLoan.staff_remarks || "—"}</strong>
                  </p>
                </div>
              )}

              {selectedLoan.status === "REJECTED" && (
                <div className="staff-rejection-box">
                  <h3>Rejection Reason</h3>
                  <p>
                    {selectedLoan.rejection_reason || "Not provided."}
                  </p>
                </div>
              )}

              {selectedLoan.status === "SUBMITTED" && (
                <div className="staff-review-actions">
                  <h3>Application Review</h3>
                  <p>
                    Move this application to Under Review before
                    approving or rejecting it.
                  </p>
                  <button
                    className="staff-primary-btn"
                    onClick={moveToReview}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Move to Under Review"}
                  </button>
                </div>
              )}

              {selectedLoan.status === "UNDER_REVIEW" && (
                <div className="staff-review-form-section">
                  <h3>Make Final Decision</h3>

                  <form onSubmit={approveLoan}>
                    <div className="staff-form-grid">
                      <label>
                        Approved Amount (₹)
                        <input
                          type="number"
                          name="approved_amount"
                          min="0.01"
                          max={selectedLoan.requested_amount}
                          step="0.01"
                          value={review.approved_amount}
                          onChange={updateReview}
                          required
                        />
                      </label>

                      <label>
                        Annual Interest Rate (%)
                        <input
                          type="number"
                          name="annual_interest_rate"
                          min="0"
                          step="0.01"
                          value={review.annual_interest_rate}
                          onChange={updateReview}
                          required
                        />
                      </label>

                      <label>
                        Approved Tenure (Months)
                        <input
                          type="number"
                          name="approved_tenure_months"
                          min="1"
                          max={selectedLoan.tenure_months}
                          value={review.approved_tenure_months}
                          onChange={updateReview}
                          required
                        />
                      </label>
                    </div>

                    <label className="staff-full-label">
                      Staff Remarks
                      <textarea
                        name="staff_remarks"
                        rows="3"
                        value={review.staff_remarks}
                        onChange={updateReview}
                        placeholder="Enter review remarks..."
                        required
                      />
                    </label>

                    <div className="staff-decision-actions">
                      <button
                        type="submit"
                        className="staff-approve-btn"
                        disabled={processing}
                      >
                        {processing ? "Processing..." : "Approve Loan"}
                      </button>
                    </div>
                  </form>

                  <div className="staff-reject-form">
                    <label>
                      Rejection Reason
                      <textarea
                        name="rejection_reason"
                        rows="2"
                        value={review.rejection_reason}
                        onChange={updateReview}
                        placeholder="Enter the reason if rejecting..."
                      />
                    </label>

                    <button
                      type="button"
                      className="staff-reject-btn"
                      onClick={rejectLoan}
                      disabled={processing}
                    >
                      {processing ? "Processing..." : "Reject Application"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default StaffLoans;
