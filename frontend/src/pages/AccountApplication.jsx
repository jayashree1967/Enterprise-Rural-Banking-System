
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function AccountApplication() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    account_type: "SAVINGS",
    occupation: "",
    monthly_income: "",
    purpose: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const income = Number(form.monthly_income || 0);

    if (!form.occupation.trim()) {
      setError("Please enter your occupation.");
      return;
    }

    if (!Number.isFinite(income) || income < 0) {
      setError("Please enter a valid monthly income.");
      return;
    }

    if (!form.purpose.trim()) {
      setError("Please enter the purpose of opening this account.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        account_type: form.account_type,
        occupation: form.occupation.trim(),
        monthly_income: income.toFixed(2),
        purpose: form.purpose.trim(),
      };

      // Submit application to Django
      const response = await API.post(
        "account-applications/",
        payload
      );

      // Continue only after successful API response
      if (response.status === 200 || response.status === 201) {
        const application = response.data;

        setSuccess(
          "Your account application has been submitted successfully!"
        );

        // Redirect to My Accounts with the saved application details
        setTimeout(() => {
          navigate("/accounts", {
            replace: true,
            state: {
              applicationSubmitted: true,
              application,
            },
          });
        }, 1200);
      }
    } catch (err) {
      const data = err.response?.data;

      let message = "Unable to submit your application.";

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (typeof data?.error === "string") {
        message = data.error;
      } else if (data && typeof data === "object") {
        message = Object.entries(data)
          .map(([field, errors]) => {
            const text = Array.isArray(errors)
              ? errors.join(" ")
              : String(errors);

            return `${field}: ${text}`;
          })
          .join(" ");
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="account-application-page">
      <header className="account-application-header">
        <div>
          <span>RURALBANK / BANKING / NEW ACCOUNT</span>
          <h1>Open a New Bank Account</h1>
          <p>
            Complete the form below to apply for an additional bank account.
          </p>
        </div>

        <button
          type="button"
          className="application-back-btn"
          onClick={() => navigate("/accounts")}
          disabled={loading}
        >
          Back to My Accounts
        </button>
      </header>

      <section className="account-application-card">
        <div className="application-intro">
          <h2>Account Application Form</h2>
          <p>
            Select your account type and provide the requested information.
            Bank staff will review your application.
          </p>
        </div>

        {error && (
          <div className="application-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="application-success" role="status">
            {success}
            <p>Redirecting to My Accounts...</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="application-field">
            <label>Choose Account Type *</label>

            <div className="account-type-options">
              <label
                className={
                  form.account_type === "SAVINGS" ? "chosen" : ""
                }
              >
                <input
                  type="radio"
                  name="account_type"
                  value="SAVINGS"
                  checked={form.account_type === "SAVINGS"}
                  onChange={handleChange}
                  disabled={loading}
                />

                <strong>Savings Account</strong>
                <span>
                  For personal savings and everyday banking.
                </span>
              </label>

              <label
                className={
                  form.account_type === "CURRENT" ? "chosen" : ""
                }
              >
                <input
                  type="radio"
                  name="account_type"
                  value="CURRENT"
                  checked={form.account_type === "CURRENT"}
                  onChange={handleChange}
                  disabled={loading}
                />

                <strong>Current Account</strong>
                <span>
                  For business and frequent transactions.
                </span>
              </label>
            </div>
          </div>

          <div className="application-form-grid">
            <div className="application-field">
              <label htmlFor="occupation">Occupation *</label>

              <input
                id="occupation"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="e.g. Student, Employee, Business"
                maxLength={100}
                required
                disabled={loading}
              />
            </div>

            <div className="application-field">
              <label htmlFor="monthly_income">
                Monthly Income (₹)
              </label>

              <input
                id="monthly_income"
                name="monthly_income"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_income}
                onChange={handleChange}
                placeholder="Enter monthly income"
                disabled={loading}
              />
            </div>
          </div>

          <div className="application-field">
            <label htmlFor="purpose">
              Purpose of Opening Account *
            </label>

            <textarea
              id="purpose"
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              placeholder="Explain why you want to open this account..."
              rows={4}
              required
              disabled={loading}
            />
          </div>

          <div className="application-notice">
            <strong>What happens next?</strong>

            <p>
              Your application will be submitted for staff verification.
              No active bank account will be created until it is approved.
              The new account will initially have a zero balance.
            </p>
          </div>

          <div className="application-form-actions">
            <button
              type="button"
              className="application-cancel-btn"
              onClick={() => navigate("/accounts")}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="application-submit-btn"
              disabled={loading}
            >
              {loading
                ? "Submitting..."
                : "Submit Application"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default AccountApplication;
