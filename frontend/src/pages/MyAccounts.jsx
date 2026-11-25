
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  Wallet,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Eye,
  Clock,
  ShieldCheck,
  FileText,
  CheckCircle,
  XCircle,
  Hourglass,
} from "lucide-react";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const dateFormat = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

function MyAccounts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAccounts = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        accountResponse,
        transactionResponse,
        applicationResponse,
      ] = await Promise.all([
        API.get("accounts/"),
        API.get("transactions/"),
        API.get("account-applications/"),
      ]);

      const accountList = getList(accountResponse.data);
      const transactionList = getList(transactionResponse.data);
      const applicationList = getList(applicationResponse.data);

      setAccounts(accountList);
      setTransactions(transactionList);
      setApplications(applicationList);

      setSelectedAccount((previous) => {
        if (!previous) return null;

        return (
          accountList.find(
            (account) => account.id === previous.id
          ) || null
        );
      });
    } catch (err) {
      console.error("My Accounts loading error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load your account information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (location.state?.applicationSubmitted) {
      setSuccess(
        "Your account application was submitted successfully. You can track its status below."
      );

      // Clear navigation state so refreshing does not repeat the message.
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const stats = useMemo(() => {
    const active = accounts.filter(
      (account) => account.status === "ACTIVE"
    );

    return {
      total: accounts.length,
      active: active.length,
      totalBalance: accounts.reduce(
        (sum, account) => sum + Number(account.balance || 0),
        0
      ),
      savings: accounts.filter(
        (account) => account.account_type === "SAVINGS"
      ).length,
      current: accounts.filter(
        (account) => account.account_type === "CURRENT"
      ).length,
    };
  }, [accounts]);

  const applicationStats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(
      (item) => item.status === "PENDING"
    ).length,
    approved: applications.filter(
      (item) => item.status === "APPROVED"
    ).length,
    rejected: applications.filter(
      (item) => item.status === "REJECTED"
    ).length,
  }), [applications]);

  const accountTransactions = selectedAccount
    ? transactions.filter(
        (transaction) =>
          Number(transaction.source_account) ===
            Number(selectedAccount.id) ||
          Number(transaction.destination_account) ===
            Number(selectedAccount.id)
      )
    : [];

  const maskAccount = (number) => {
    const value = String(number || "");
    return value.length > 4
      ? `XXXX XXXX XXXX ${value.slice(-4)}`
      : value;
  };

  const applicationStatusClass = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
      default:
        return "pending";
    }
  };

  const applicationStatusIcon = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "APPROVED":
        return <CheckCircle size={18} />;
      case "REJECTED":
        return <XCircle size={18} />;
      default:
        return <Hourglass size={18} />;
    }
  };

  return (
    <main className="my-accounts-page">
      <header className="accounts-page-header">
        <div>
          <span className="accounts-breadcrumb">
            RURALBANK / BANKING
          </span>
          <h1>My Accounts</h1>
          <p>
            Manage your savings and current bank accounts in one place.
          </p>
        </div>

        <div className="accounts-header-actions">
          <button
            className="accounts-refresh-btn"
            onClick={fetchAccounts}
            disabled={loading}
          >
            <RefreshCw size={17} />
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            className="accounts-open-btn"
            onClick={() => navigate("/account-application")}
          >
            <Plus size={18} />
            Open New Account
          </button>
        </div>
      </header>

      {error && (
        <div className="accounts-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="application-success" role="status">
          {success}
        </div>
      )}

      {/* Account summary */}
      <section className="accounts-summary-grid">
        <article className="accounts-summary-card">
          <div className="summary-icon">
            <Wallet />
          </div>
          <span>Total Bank Accounts</span>
          <strong>{stats.total}</strong>
          <small>All your registered accounts</small>
        </article>

        <article className="accounts-summary-card">
          <div className="summary-icon">
            <ShieldCheck />
          </div>
          <span>Active Accounts</span>
          <strong>{stats.active}</strong>
          <small>Accounts available for banking</small>
        </article>

        <article className="accounts-summary-card balance-summary">
          <div className="summary-icon">
            <CreditCard />
          </div>
          <span>Total Available Balance</span>
          <strong>{money(stats.totalBalance)}</strong>
          <small>Combined balance of all accounts</small>
        </article>

        <article className="accounts-summary-card">
          <div className="summary-icon">
            <Wallet />
          </div>
          <span>Account Types</span>
          <strong>{stats.savings} Savings</strong>
          <small>{stats.current} Current accounts</small>
        </article>
      </section>

      {/* Existing bank accounts */}
      <section className="accounts-content-panel">
        <div className="accounts-section-heading">
          <div>
            <h2>Your Bank Accounts</h2>
            <p>
              Choose an account to view its details and transactions.
            </p>
          </div>
          <span>{accounts.length} Account(s)</span>
        </div>

        {loading ? (
          <div className="accounts-empty">
            Loading your accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="accounts-empty">
            <Wallet size={42} />
            <h3>No bank accounts found</h3>
            <p>
              Your active bank accounts will appear here after
              your application is approved.
            </p>
            <button
              className="accounts-open-btn"
              onClick={() => navigate("/account-application")}
            >
              <Plus size={18} />
              Apply for an Account
            </button>
          </div>
        ) : (
          <div className="accounts-card-grid">
            {accounts.map((account) => (
              <article
                className={`bank-account-card ${
                  selectedAccount?.id === account.id
                    ? "selected"
                    : ""
                }`}
                key={account.id}
              >
                <div className="bank-card-top">
                  <div className="bank-card-icon">
                    <Wallet size={22} />
                  </div>

                  <span
                    className={`account-status ${
                      account.status?.toLowerCase()
                    }`}
                  >
                    {account.status}
                  </span>
                </div>

                <span className="bank-card-label">
                  {account.account_type === "SAVINGS"
                    ? "Savings Account"
                    : "Current Account"}
                </span>

                <h3>{maskAccount(account.account_number)}</h3>

                <div className="bank-card-balance">
                  <span>Available Balance</span>
                  <strong>{money(account.balance)}</strong>
                </div>

                <div className="bank-card-footer">
                  <span>
                    Opened {dateFormat(account.created_at)}
                  </span>

                  <button
                    onClick={() => setSelectedAccount(account)}
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Account applications */}
      <section className="accounts-content-panel">
        <div className="accounts-section-heading">
          <div>
            <h2>My Account Applications</h2>
            <p>
              Track applications submitted for additional bank accounts.
            </p>
          </div>

          <button
            className="accounts-open-btn"
            onClick={() => navigate("/account-application")}
          >
            <Plus size={17} />
            New Application
          </button>
        </div>

        <div className="application-summary-grid">
          <article>
            <span>Total Applications</span>
            <strong>{applicationStats.total}</strong>
          </article>
          <article>
            <span>Pending</span>
            <strong>{applicationStats.pending}</strong>
          </article>
          <article>
            <span>Approved</span>
            <strong>{applicationStats.approved}</strong>
          </article>
          <article>
            <span>Rejected</span>
            <strong>{applicationStats.rejected}</strong>
          </article>
        </div>

        {loading ? (
          <div className="accounts-empty">
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="accounts-empty">
            <FileText size={40} />
            <h3>No account applications yet</h3>
            <p>
              Applications you submit will appear here.
            </p>
          </div>
        ) : (
          <div className="account-applications-list">
            {applications.map((application) => (
              <article
                className="account-application-item"
                key={application.id}
              >
                <div className="application-item-icon">
                  <FileText size={22} />
                </div>

                <div className="application-item-details">
                  <h3>
                    {application.account_type === "SAVINGS"
                      ? "Savings Account Application"
                      : "Current Account Application"}
                  </h3>

                  <p>
                    Application #{application.id}
                  </p>

                  <p>
                    Occupation: {application.occupation || "—"}
                  </p>

                  <p>
                    Submitted: {dateFormat(
                      application.created_at ||
                      application.applied_at
                    )}
                  </p>

                  {application.purpose && (
                    <p>
                      Purpose: {application.purpose}
                    </p>
                  )}

                  {application.rejection_reason && (
                    <p className="application-rejection-reason">
                      Rejection reason: {application.rejection_reason}
                    </p>
                  )}
                </div>

                <div
                  className={`application-status-badge ${
                    applicationStatusClass(application.status)
                  }`}
                >
                  {applicationStatusIcon(application.status)}
                  {application.status || "PENDING"}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Selected account details */}
      {selectedAccount && (
        <section className="account-details-panel">
          <div className="accounts-section-heading">
            <div>
              <h2>Account Details</h2>
              <p>
                Detailed information about your selected account.
              </p>
            </div>

            <button
              className="close-account-details"
              onClick={() => setSelectedAccount(null)}
            >
              Close
            </button>
          </div>

          <div className="account-detail-grid">
            <div>
              <span>Account Number</span>
              <strong>
                {maskAccount(selectedAccount.account_number)}
              </strong>
            </div>

            <div>
              <span>Account Type</span>
              <strong>{selectedAccount.account_type}</strong>
            </div>

            <div>
              <span>Account Status</span>
              <strong>{selectedAccount.status}</strong>
            </div>

            <div>
              <span>Account Opening Date</span>
              <strong>{dateFormat(selectedAccount.created_at)}</strong>
            </div>

            <div>
              <span>Current Balance</span>
              <strong>{money(selectedAccount.balance)}</strong>
            </div>

            <div>
              <span>Account ID</span>
              <strong>#{selectedAccount.id}</strong>
            </div>
          </div>

          <div className="account-action-buttons">
            <button onClick={() => navigate("/deposit")}>
              <ArrowDownLeft size={17} />
              Deposit
            </button>

            <button onClick={() => navigate("/withdraw")}>
              <ArrowUpRight size={17} />
              Withdraw
            </button>

            <button onClick={() => navigate("/transfer")}>
              <ArrowUpRight size={17} />
              Transfer
            </button>
          </div>

          <div className="account-transactions-heading">
            <div>
              <h3>Account Transaction History</h3>
              <p>Transactions linked to this account.</p>
            </div>
            <Clock size={21} />
          </div>

          {accountTransactions.length === 0 ? (
            <div className="accounts-empty">
              No transactions found for this account.
            </div>
          ) : (
            <div className="account-transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Transaction Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {accountTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {String(
                          transaction.transaction_reference || ""
                        ).slice(0, 8)}...
                      </td>

                      <td>{transaction.transaction_type}</td>
                      <td>{transaction.description || "—"}</td>
                      <td>{money(transaction.amount)}</td>
                      <td>{transaction.status}</td>
                      <td>{dateFormat(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <p className="accounts-security-note">
        <ShieldCheck size={17} />
        Your account information is accessible only after authentication.
      </p>
    </main>
  );
}

export default MyAccounts;
