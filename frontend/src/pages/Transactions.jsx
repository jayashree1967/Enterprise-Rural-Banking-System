
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  RotateCcw,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("transactions/");
      const data = response.data;

      setTransactions(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      console.error("Transaction loading error:", err.response?.data);

      setError(
        err.response?.data?.detail ||
        "Unable to fetch transaction history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getType = (transaction) =>
    String(
      transaction.transaction_type ||
      transaction.type ||
      "Transaction"
    ).toUpperCase();

  const getStatus = (transaction) =>
    String(transaction.status || "Unknown").toUpperCase();

  const getReference = (transaction) =>
    transaction.transaction_reference || "—";

  const getAmount = (transaction) =>
    Number(transaction.amount || 0);

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getIcon = (type) => {
    if (type === "DEPOSIT") return <ArrowDownLeft size={20} />;
    if (type === "WITHDRAWAL") return <ArrowUpRight size={20} />;

    return <RefreshCw size={20} />;
  };

  // Search and filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const reference = String(getReference(transaction)).toLowerCase();
      const type = getType(transaction);
      const status = getStatus(transaction);
      const query = search.trim().toLowerCase();

      const matchesSearch =
        reference.includes(query) ||
        type.toLowerCase().includes(query) ||
        String(transaction.description || "")
          .toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "ALL" || type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, search, typeFilter, statusFilter]);

  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  // Export filtered transactions to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      setError("No transactions available to export.");
      return;
    }

    const headers = [
      "Transaction Reference",
      "Transaction Type",
      "Amount (INR)",
      "Status",
      "Description",
      "Date",
    ];

    // Escape CSV values safely
    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = filteredTransactions.map((transaction) => [
      getReference(transaction),
      getType(transaction),
      getAmount(transaction).toFixed(2),
      getStatus(transaction),
      transaction.description || "",
      transaction.created_at
        ? formatDate(transaction.created_at)
        : "",
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    // UTF-8 BOM supports correct display in Excel
    const blob = new Blob(
      ["\uFEFF", csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `RuralBank_Statement_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setError("");
  };

  const formatCSVDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");

    const year = parsedDate.getFullYear();

    const hours = String(
      parsedDate.getHours()
    ).padStart(2, "0");

    const minutes = String(
      parsedDate.getMinutes()
    ).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const downloadCSV = () => {
  if (filteredTransactions.length === 0) {
    alert("No transactions available to download.");
    return;
  }

  const headers = [
    "Transaction Reference",
    "Transaction Type",
    "Amount (INR)",
    "Status",
    "Description",
    "Date",
  ];

  const rows = filteredTransactions.map((transaction) => [
    getReference(transaction),
    getType(transaction),
    getAmount(transaction).toFixed(2),
    getStatus(transaction),
    transaction.description || "",
    formatCSVDate(transaction.created_at || transaction.date),
  ]);

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `RuralBank_Statement_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  return (
    <div className="transactions-page">
      <header className="transactions-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <h1>Transaction History</h1>
        <p>View and manage all your banking transactions.</p>
      </header>

      <div className="transactions-panel">
        <div className="transaction-title">
          <div>
            <h2>All Transactions</h2>
            <p>
              Showing {filteredTransactions.length} of{" "}
              {transactions.length} transaction records
            </p>
          </div>

          <div className="transaction-actions">
            <button
              type="button"
              className="export-button"
              onClick={exportToCSV}
              disabled={loading || filteredTransactions.length === 0}
            >
              <Download size={16} />
              Export CSV
            </button>

            <div className="transaction-actions">
              <button
                type="button"
                className="download-button"
                onClick={downloadCSV}
                disabled={loading || filteredTransactions.length === 0}
              >
                <Download size={17} />
                Download Statement
              </button>

              {/* <button
                type="button"
                className="refresh-button"
                onClick={fetchTransactions}
                disabled={loading}
              >
                <RefreshCw size={16} />
                {loading ? "Loading..." : "Refresh"}
              </button> */}
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={fetchTransactions}
              disabled={loading}
            >
              <RefreshCw size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="transaction-filters">
          <div className="transaction-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search reference, type or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="button"
            className="reset-filter-button"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        {loading && (
          <p className="transaction-message">
            Loading transactions...
          </p>
        )}

        {error && (
          <p className="error-message">{error}</p>
        )}

        {!loading && !error && filteredTransactions.length === 0 && (
          <p className="transaction-message">
            No matching transactions found.
          </p>
        )}

        {!loading && !error && filteredTransactions.length > 0 && (
          <div className="transaction-table-wrapper">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((transaction) => {
                  const type = getType(transaction);
                  const status = getStatus(transaction);

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <div className="transaction-type">
                          {getIcon(type)}
                          <span>{type}</span>
                        </div>
                      </td>

                      <td className="transaction-reference">
                        {getReference(transaction)}
                      </td>

                      <td className="transaction-amount">
                        ₹{getAmount(transaction).toFixed(2)}
                      </td>

                      <td>
                        <span
                          className={`transaction-status ${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          transaction.created_at || transaction.date
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;
