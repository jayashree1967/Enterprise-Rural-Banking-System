
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  ArrowLeft,
  Eye,
  ShieldCheck,
} from "lucide-react";

import API from "../services/api";


function CustomerOverview() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const searchCustomers = async (event) => {
    event.preventDefault();

    if (!search.trim()) {
      setError("Enter a customer name, ID, mobile number or account number.");
      return;
    }

    setLoading(true);
    setError("");
    setSelected(null);

    try {
      const response = await API.get("staff/customers/", {
        params: { search: search.trim() },
      });

      const data = response.data;
      setCustomers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "You do not have permission to search customer records."
          : err.response?.data?.detail || "Unable to search customers."
      );
    } finally {
      setLoading(false);
    }
  };

  const viewCustomer = async (id) => {
    setDetailLoading(true);
    setError("");

    try {
      const response = await API.get(`staff/customers/${id}/`);
      setSelected(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load the customer service summary."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <main className="customer-workspace">

      <header className="customer-workspace-header">
        <div>
          <span>STAFF PORTAL / CUSTOMER OPERATIONS</span>
          <h1>Customer Service Workspace</h1>
          <p>
            Search for customers and access information needed
            to handle banking service requests.
          </p>
        </div>

        <button
          className="workspace-back"
          onClick={() => navigate("/staff-dashboard")}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>
      </header>

      <section className="workspace-security-note">
        <ShieldCheck size={22} />
        <div>
          <strong>Restricted customer information</strong>
          <p>
            Only limited customer and account information is displayed.
            Access is recorded for audit purposes.
          </p>
        </div>
      </section>

      <section className="workspace-search-panel">
        <h2>Find a Customer</h2>
        <p>
          Search using a customer ID, name, registered mobile
          or account number.
        </p>

        <form onSubmit={searchCustomers} className="workspace-search-form">
          <div className="workspace-search-input">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter customer details..."
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="workspace-error">{error}</div>
        )}
      </section>

      <section className="workspace-results">
        <div className="workspace-section-title">
          <div>
            <h2>Search Results</h2>
            <p>{customers.length} customer record(s) returned</p>
          </div>
        </div>

        {loading ? (
          <p className="workspace-empty">Searching customers...</p>
        ) : customers.length === 0 ? (
          <p className="workspace-empty">
            Search for a customer to view their limited service summary.
          </p>
        ) : (
          <div className="workspace-customer-list">
            {customers.map((customer) => (
              <article
                className="workspace-customer-card"
                key={customer.customer_id}
              >
                <div className="workspace-customer-avatar">
                  <Users size={22} />
                </div>

                <div className="workspace-customer-info">
                  <strong>{customer.full_name}</strong>
                  <span>Customer ID: {customer.customer_id}</span>
                  <span>Mobile: {customer.masked_phone}</span>

                  <div className="workspace-account-list">
                    {customer.accounts?.length ? (
                      customer.accounts.map((account, index) => (
                        <div key={account.account_id || index}>
                          <span>{account.account_type}</span>
                          <span>{account.account_number}</span>
                          <span>{account.status}</span>
                        </div>
                      ))
                    ) : (
                      <span>No bank accounts found</span>
                    )}
                  </div>
                </div>

                <button
                  className="workspace-view-button"
                  onClick={() => viewCustomer(customer.customer_id)}
                >
                  <Eye size={16} />
                  View Service Summary
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {detailLoading && (
        <p className="workspace-empty">Loading customer summary...</p>
      )}

      {selected && (
        <section className="workspace-detail">
          <div className="workspace-detail-heading">
            <div>
              <span>CUSTOMER SERVICE SUMMARY</span>
              <h2>{selected.full_name}</h2>
              <p>Customer ID: {selected.customer_id}</p>
            </div>

            <button onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          <div className="workspace-detail-grid">
            <article>
              <CreditCard size={22} />
              <span>Bank Accounts</span>
              <strong>{selected.accounts?.length || 0}</strong>
            </article>

            <article>
              <MessageSquare size={22} />
              <span>Open Complaints</span>
              <strong>{selected.open_complaints}</strong>
            </article>

            <article>
              <FileText size={22} />
              <span>Complaints Assigned to You</span>
              <strong>{selected.assigned_complaints}</strong>
            </article>

            <article>
              <FileText size={22} />
              <span>Loans Assigned to You</span>
              <strong>{selected.assigned_loans}</strong>
            </article>
          </div>

          <h3>Account Summary</h3>

          {selected.accounts?.length ? (
            <div className="workspace-detail-accounts">
              {selected.accounts.map((account, index) => (
                <div key={index}>
                  <span>{account.account_type}</span>
                  <strong>{account.account_number}</strong>
                  <span>{account.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No accounts are available.</p>
          )}

          <p className="workspace-privacy">
            Email: {selected.masked_email} · Mobile: {selected.masked_phone}
          </p>
        </section>
      )}
    </main>
  );
}

export default CustomerOverview;
