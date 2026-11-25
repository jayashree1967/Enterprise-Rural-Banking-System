
import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  Eye,
} from "lucide-react";

import API from "../services/api";

const categories = [
  { value: "ACCOUNT", label: "Account Related" },
  { value: "TRANSACTION", label: "Transaction Issue" },
  { value: "DEPOSIT", label: "Deposit Issue" },
  { value: "WITHDRAWAL", label: "Withdrawal Issue" },
  { value: "TRANSFER", label: "Fund Transfer Issue" },
  { value: "CARD", label: "Card Related" },
  { value: "SECURITY", label: "Security Concern" },
  { value: "OTHER", label: "Other" },
];

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [form, setForm] = useState({
    category: "ACCOUNT",
    subject: "",
    description: "",
  });

  const fetchComplaints = useCallback(async () => {
    try {
      setError("");
      const response = await API.get("complaints/");
      const data = response.data;

      setComplaints(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        "Unable to load complaints."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateForm = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const submitComplaint = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await API.post("complaints/", form);

      setSuccess("Complaint submitted successfully.");

      setForm({
        category: "ACCOUNT",
        subject: "",
        description: "",
      });

      await fetchComplaints();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setError(
        data?.detail ||
        data?.subject?.[0] ||
        data?.description?.[0] ||
        data?.category?.[0] ||
        "Unable to submit complaint."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeComplaint = async (id) => {
    if (!window.confirm("Close this resolved complaint?")) {
      return;
    }

    try {
      setError("");

      await API.patch(`complaints/${id}/close/`);

      setSuccess("Complaint closed successfully.");
      setSelectedComplaint(null);

      await fetchComplaints();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Unable to close complaint."
      );
    }
  };

  const filteredComplaints = complaints.filter(
    (complaint) =>
      statusFilter === "ALL" ||
      complaint.status === statusFilter
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "OPEN":
        return AlertCircle;
      case "IN_PROGRESS":
        return Clock;
      case "RESOLVED":
        return CheckCircle;
      case "CLOSED":
        return XCircle;
      default:
        return MessageSquare;
    }
  };

  const getCategoryLabel = (value) =>
    categories.find((item) => item.value === value)?.label || value;

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString() : "Not available";

  const openCount = complaints.filter(
    (item) => item.status === "OPEN"
  ).length;

  const progressCount = complaints.filter(
    (item) => item.status === "IN_PROGRESS"
  ).length;

  const resolvedCount = complaints.filter(
    (item) => item.status === "RESOLVED"
  ).length;

  return (
    <div className="complaints-page">
      <div className="complaints-heading">
        <div>
          <h1>Customer Support</h1>
          <p>Submit complaints and track their resolution.</p>
        </div>

        <button
          className="complaint-refresh"
          onClick={fetchComplaints}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="complaint-stats">
        <div className="complaint-stat-card">
          <MessageSquare size={22} />
          <div>
            <span>Total Complaints</span>
            <h2>{complaints.length}</h2>
          </div>
        </div>

        <div className="complaint-stat-card">
          <AlertCircle size={22} />
          <div>
            <span>Open</span>
            <h2>{openCount}</h2>
          </div>
        </div>

        <div className="complaint-stat-card">
          <Clock size={22} />
          <div>
            <span>In Progress</span>
            <h2>{progressCount}</h2>
          </div>
        </div>

        <div className="complaint-stat-card">
          <CheckCircle size={22} />
          <div>
            <span>Resolved</span>
            <h2>{resolvedCount}</h2>
          </div>
        </div>
      </div>

      {error && (
        <div className="complaint-alert complaint-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="complaint-alert complaint-alert-success">
          {success}
        </div>
      )}

      <section className="complaint-panel">
        <div className="complaint-panel-heading">
          <div>
            <h2>
              <PlusCircle size={20} />
              Submit a Complaint
            </h2>
            <p>Tell us about the issue you are experiencing.</p>
          </div>
        </div>

        <form onSubmit={submitComplaint}>
          <div className="complaint-form-grid">
            <div className="complaint-field">
              <label htmlFor="category">Complaint Category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={updateForm}
                required
              >
                {categories.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="complaint-field">
              <label htmlFor="subject">Complaint Subject</label>
              <input
                id="subject"
                name="subject"
                type="text"
                placeholder="Enter a short subject"
                value={form.subject}
                onChange={updateForm}
                maxLength={150}
                required
              />
            </div>
          </div>

          <div className="complaint-field">
            <label htmlFor="description">Describe Your Issue</label>
            <textarea
              id="description"
              name="description"
              placeholder="Explain your issue in detail..."
              value={form.description}
              onChange={updateForm}
              rows={5}
              required
            />
          </div>

          <button
            type="submit"
            className="complaint-submit-button"
            disabled={submitting}
          >
            <Send size={17} />
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>
      </section>

      <section className="complaint-panel">
        <div className="complaint-panel-heading complaint-history-heading">
          <div>
            <h2>
              <MessageSquare size={20} />
              My Complaints
            </h2>
            <p>Track the status of your submitted complaints.</p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="complaint-status-filter"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {loading ? (
          <p className="complaint-empty">Loading complaints...</p>
        ) : filteredComplaints.length === 0 ? (
          <div className="complaint-empty">
            <MessageSquare size={38} />
            <h3>No complaints found</h3>
            <p>Your submitted complaints will appear here.</p>
          </div>
        ) : (
          <div className="complaint-list">
            {filteredComplaints.map((complaint) => {
              const StatusIcon = getStatusIcon(complaint.status);

              return (
                <article
                  className="complaint-item"
                  key={complaint.id}
                >
                  <div className="complaint-item-main">
                    <div className="complaint-item-icon">
                      <StatusIcon size={22} />
                    </div>

                    <div className="complaint-item-content">
                      <h3>{complaint.subject}</h3>
                      <p>{getCategoryLabel(complaint.category)}</p>

                      <span>
                        Reference: {complaint.reference_number}
                      </span>

                      <span>
                        Submitted: {formatDate(complaint.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="complaint-item-actions">
                    <span
                      className={`complaint-status status-${complaint.status.toLowerCase()}`}
                    >
                      {complaint.status_display || complaint.status}
                    </span>

                    <button
                      className="complaint-view-button"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <Eye size={16} />
                      View Details
                    </button>

                    {complaint.status === "RESOLVED" && (
                      <button
                        className="complaint-close-button"
                        onClick={() => closeComplaint(complaint.id)}
                      >
                        <CheckCircle size={16} />
                        Close Complaint
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedComplaint && (
        <div
          className="complaint-modal-overlay"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="complaint-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="complaint-modal-heading">
              <div>
                <h2>Complaint Details</h2>
                <p>
                  Reference: {selectedComplaint.reference_number}
                </p>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="complaint-detail-row">
              <strong>Subject</strong>
              <p>{selectedComplaint.subject}</p>
            </div>

            <div className="complaint-detail-row">
              <strong>Category</strong>
              <p>{getCategoryLabel(selectedComplaint.category)}</p>
            </div>

            <div className="complaint-detail-row">
              <strong>Your Complaint</strong>
              <p>{selectedComplaint.description}</p>
            </div>

            <div className="complaint-detail-row">
              <strong>Status</strong>
              <p>
                {selectedComplaint.status_display ||
                  selectedComplaint.status}
              </p>
            </div>

            <div className="complaint-detail-row">
              <strong>Staff Reply</strong>
              {selectedComplaint.staff_reply ? (
                <div className="staff-reply-box">
                  {selectedComplaint.staff_reply}
                </div>
              ) : (
                <p className="no-staff-reply">
                  The bank team has not replied yet.
                </p>
              )}
            </div>

            <div className="complaint-detail-row">
              <strong>Last Updated</strong>
              <p>{formatDate(selectedComplaint.updated_at)}</p>
            </div>

            {selectedComplaint.status === "RESOLVED" && (
              <button
                className="complaint-close-button modal-close-complaint"
                onClick={() => closeComplaint(selectedComplaint.id)}
              >
                <CheckCircle size={16} />
                Close Complaint
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Complaints;
