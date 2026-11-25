
import { useEffect, useState } from "react";
import API from "../services/api";


const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function StaffComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [success, setSuccess] = useState("");

  const loadComplaints = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("staff/complaints/");
      const data = response.data;
      setComplaints(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Access denied. Your account needs staff permissions."
          : err.response?.data?.detail || "Unable to load complaints."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const updateField = (id, field, value) => {
    setComplaints((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const saveComplaint = async (complaint) => {
    setSavingId(complaint.id);
    setError("");
    setSuccess("");

    try {
      await API.patch(`staff/complaints/${complaint.id}/`, {
        status: complaint.status,
        staff_reply: complaint.staff_reply || "",
      });

      setSuccess(`Complaint ${complaint.reference_number} updated.`);
      await loadComplaints();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.detail ||
        data?.staff_reply?.[0] ||
        data?.status?.[0] ||
        "Unable to update complaint."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="staff-complaints-page">
      <header className="staff-complaints-header">
        <div>
          <span>STAFF PORTAL / SUPPORT</span>
          <h1>Customer Complaints</h1>
          <p>Review complaints and respond to customers.</p>
        </div>

        <button onClick={loadComplaints} disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <div className="complaint-alert error">{error}</div>}
      {success && <div className="complaint-alert success">{success}</div>}

      {loading ? (
        <p>Loading complaints...</p>
      ) : complaints.length === 0 ? (
        <p className="complaint-empty">No complaints found.</p>
      ) : (
        <div className="staff-complaint-list">
          {complaints.map((complaint) => (
            <article className="staff-complaint-card" key={complaint.id}>
              <div className="staff-complaint-card-header">
                <div>
                  <strong>{complaint.subject}</strong>
                  <p>
                    Reference: {complaint.reference_number}
                  </p>
                </div>

                <span className={`complaint-status ${complaint.status.toLowerCase()}`}>
                  {complaint.status_display || complaint.status}
                </span>
              </div>

              <p><strong>Category:</strong> {complaint.category_display}</p>
              <p><strong>Description:</strong> {complaint.description}</p>
              <p>
                <strong>Submitted:</strong>{" "}
                {new Date(complaint.created_at).toLocaleString("en-IN")}
              </p>

              <label>Staff reply</label>
              <textarea
                value={complaint.staff_reply || ""}
                disabled={complaint.status === "CLOSED"}
                onChange={(event) =>
                  updateField(complaint.id, "staff_reply", event.target.value)
                }
                placeholder="Write a response to the customer..."
              />

              <label>Complaint status</label>
              <select
                value={complaint.status}
                disabled={complaint.status === "CLOSED"}
                onChange={(event) =>
                  updateField(complaint.id, "status", event.target.value)
                }
              >
                {STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <button
                className="save-complaint-btn"
                disabled={
                  savingId === complaint.id ||
                  complaint.status === "CLOSED"
                }
                onClick={() => saveComplaint(complaint)}
              >
                {savingId === complaint.id ? "Saving..." : "Save Changes"}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default StaffComplaints;
