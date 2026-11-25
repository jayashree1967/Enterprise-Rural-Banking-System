
import { useEffect, useState } from "react";
import API from "../services/api";
import "./Loans.css";

const initialForm = {
  category: "PERSONAL",
  requested_amount: "",
  monthly_income: "",
  existing_monthly_obligations: "0",
  tenure_months: "",
  purpose: "",
};

const loanCategories = [
  "PERSONAL",
  "HOME",
  "EDUCATION",
  "AGRICULTURE",
  "BUSINESS",
];

const documentTypes = [
  "IDENTITY",
  "ADDRESS",
  "INCOME",
  "BANK_STATEMENT",
  "PROPERTY",
  "EDUCATION",
  "AGRICULTURE",
  "BUSINESS",
  "OTHER",
];

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN")
    : "-";

function Loans() {
  const [applications, setApplications] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [documentType, setDocumentType] = useState("INCOME");
  const [documentFile, setDocumentFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("loans/");

      const data = response.data;
      const loanList = Array.isArray(data)
        ? data
        : data.results || [];

      setApplications(loanList);

      if (selectedLoan) {
        const updatedLoan = loanList.find(
          (loan) => loan.id === selectedLoan.id
        );

        if (updatedLoan) {
          await fetchLoanDetails(updatedLoan.id);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load loan applications."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanDetails = async (id) => {
    try {
      const response = await API.get(`loans/${id}/`);
      setSelectedLoan(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load loan details."
      );
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        requested_amount: Number(form.requested_amount),
        monthly_income: Number(form.monthly_income),
        existing_monthly_obligations: Number(
          form.existing_monthly_obligations
        ),
        tenure_months: Number(form.tenure_months),
      };

      const response = await API.post("loans/", payload);

      setMessage(
        `Loan application submitted successfully. Reference: ${response.data.reference_number}`
      );

      setForm(initialForm);

      await fetchApplications();
      await fetchLoanDetails(response.data.id);
    } catch (err) {
      const data = err.response?.data;

      setError(
        typeof data === "object"
          ? Object.entries(data)
              .map(([field, errors]) =>
                `${field}: ${
                  Array.isArray(errors)
                    ? errors.join(", ")
                    : errors
                }`
              )
              .join(" | ")
          : "Unable to submit loan application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();

    if (!selectedLoan || !documentFile) {
      setError("Please select a document file.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("document_file", documentFile);

      await API.post(
        `loans/${selectedLoan.id}/documents/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage("Document uploaded successfully.");
      setDocumentFile(null);

      await fetchLoanDetails(selectedLoan.id);
      await fetchApplications();
    } catch (err) {
      const data = err.response?.data;

      setError(
        typeof data === "object"
          ? JSON.stringify(data)
          : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const statusClass = (status) =>
    `loan-status ${String(status || "").toLowerCase()}`;

  return (
    <div className="loans-page">
      <header className="loans-header">
        <div>
          <h1>Loan Management</h1>
          <p>Apply for loans and track your repayment details.</p>
        </div>

        <button
          className="loan-refresh-btn"
          onClick={fetchApplications}
          type="button"
        >
          Refresh
        </button>
      </header>

      {error && <div className="loan-alert error">{error}</div>}
      {message && <div className="loan-alert success">{message}</div>}

      <section className="loan-form-card">
        <h2>Apply for a Loan</h2>

        <form onSubmit={handleSubmit}>
          <div className="loan-form-grid">
            <div>
              <label>Loan Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                required
              >
                {loanCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Requested Amount (₹)</label>
              <input
                type="number"
                name="requested_amount"
                min="1"
                step="0.01"
                value={form.requested_amount}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label>Monthly Income (₹)</label>
              <input
                type="number"
                name="monthly_income"
                min="1"
                step="0.01"
                value={form.monthly_income}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label>Existing Monthly Obligations (₹)</label>
              <input
                type="number"
                name="existing_monthly_obligations"
                min="0"
                step="0.01"
                value={form.existing_monthly_obligations}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label>Tenure (Months)</label>
              <input
                type="number"
                name="tenure_months"
                min="1"
                value={form.tenure_months}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="full-width">
              <label>Purpose of Loan</label>
              <textarea
                name="purpose"
                rows="3"
                value={form.purpose}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="loan-primary-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Loan Application"}
          </button>
        </form>
      </section>

      <section className="loan-list-card">
        <h2>My Loan Applications</h2>

        {loading ? (
          <p>Loading applications...</p>
        ) : applications.length === 0 ? (
          <p>No loan applications found.</p>
        ) : (
          <div className="loan-table-wrapper">
            <table className="loan-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Category</th>
                  <th>Requested Amount</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {applications.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.reference_number}</td>
                    <td>{loan.category_display || loan.category}</td>
                    <td>{formatMoney(loan.requested_amount)}</td>
                    <td>
                      <span className={statusClass(loan.status)}>
                        {loan.status_display || loan.status}
                      </span>
                    </td>
                    <td>{formatDate(loan.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="loan-view-btn"
                        onClick={() => fetchLoanDetails(loan.id)}
                      >
                        View Details
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
        <section className="loan-details-card">
          <div className="loan-details-heading">
            <div>
              <h2>Loan Details</h2>
              <p>Reference: {selectedLoan.reference_number}</p>
            </div>

            <span className={statusClass(selectedLoan.status)}>
              {selectedLoan.status_display || selectedLoan.status}
            </span>
          </div>

          <div className="loan-summary-grid">
            <div>
              <span>Category</span>
              <strong>
                {selectedLoan.category_display || selectedLoan.category}
              </strong>
            </div>

            <div>
              <span>Requested Amount</span>
              <strong>{formatMoney(selectedLoan.requested_amount)}</strong>
            </div>

            <div>
              <span>Approved Amount</span>
              <strong>
                {selectedLoan.approved_amount
                  ? formatMoney(selectedLoan.approved_amount)
                  : "Not approved yet"}
              </strong>
            </div>

            <div>
              <span>Annual Interest Rate</span>
              <strong>
                {selectedLoan.annual_interest_rate != null
                  ? `${selectedLoan.annual_interest_rate}%`
                  : "-"}
              </strong>
            </div>

            <div>
              <span>Approved Tenure</span>
              <strong>
                {selectedLoan.approved_tenure_months
                  ? `${selectedLoan.approved_tenure_months} months`
                  : "-"}
              </strong>
            </div>

            <div>
              <span>Application Date</span>
              <strong>{formatDate(selectedLoan.created_at)}</strong>
            </div>
          </div>

          {selectedLoan.staff_remarks && (
            <div className="loan-remarks">
              <strong>Staff Remarks</strong>
              <p>{selectedLoan.staff_remarks}</p>
            </div>
          )}

          {selectedLoan.rejection_reason && (
            <div className="loan-remarks rejection">
              <strong>Rejection Reason</strong>
              <p>{selectedLoan.rejection_reason}</p>
            </div>
          )}

          <h3>Uploaded Documents</h3>

          {selectedLoan.documents?.length > 0 ? (
            <div className="loan-documents">
              {selectedLoan.documents.map((doc) => (
                <div className="loan-document" key={doc.id}>
                  <div>
                    <strong>
                      {doc.document_type_display || doc.document_type}
                    </strong>
                    <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                  </div>

                  <a
                    href={
                      doc.document_file?.startsWith("http")
                        ? doc.document_file
                        : `http://127.0.0.1:8000/media/${doc.document_file}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Document
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p>No documents uploaded yet.</p>
          )}

          {selectedLoan.status === "SUBMITTED" && (
            <form
              className="loan-upload-form"
              onSubmit={handleDocumentUpload}
            >
              <h3>Upload Supporting Document</h3>

              <div>
                <label>Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Select File (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setDocumentFile(e.target.files?.[0] || null)
                  }
                  required
                />
              </div>

              <button
                type="submit"
                className="loan-primary-btn"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          )}

          <h3>EMI Repayment Schedule</h3>

          {selectedLoan.repayments?.length > 0 ? (
            <div className="loan-table-wrapper">
              <table className="loan-table">
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due Date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>EMI Amount</th>
                    <th>Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedLoan.repayments.map((emi) => (
                    <tr key={emi.id}>
                      <td>{emi.installment_number}</td>
                      <td>{formatDate(emi.due_date)}</td>
                      <td>{formatMoney(emi.principal_amount)}</td>
                      <td>{formatMoney(emi.interest_amount)}</td>
                      <td>{formatMoney(emi.emi_amount)}</td>
                      <td>{formatMoney(emi.amount_paid)}</td>
                      <td>
                        <span className={statusClass(emi.status)}>
                          {emi.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              {selectedLoan.status === "APPROVED"
                ? "No repayment schedule is available."
                : "The EMI schedule will be available after loan approval."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default Loans;
