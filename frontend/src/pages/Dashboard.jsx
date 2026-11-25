
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  User,
  Users,
  LogOut,
  PlusCircle,
  MinusCircle,
  Send,
  Bell,
  Search,
  CheckCheck,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { logout } = useAuth();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);

      const response = await API.get("notifications/");
      const data = response.data;

      setNotifications(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      console.error("Unable to load notifications:", err);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  // Mark individual notification as read
  const markAsRead = async (id) => {
    try {
      await API.patch(`notifications/${id}/read/`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.is_read
    );

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          API.patch(`notifications/${notification.id}/read/`)
        )
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Unable to mark all notifications as read:", err);
      fetchNotifications();
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  // Select icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "DEPOSIT":
        return ArrowDownLeft;

      case "WITHDRAWAL":
        return ArrowUpRight;

      case "TRANSFER":
        return Send;

      default:
        return Bell;
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [accountResponse, transactionResponse] =
          await Promise.all([
            API.get("accounts/"),
            API.get("transactions/"),
          ]);

        const accountData = accountResponse.data;
        const transactionData = transactionResponse.data;

        setAccounts(
          Array.isArray(accountData)
            ? accountData
            : accountData.results || []
        );

        setTransactions(
          Array.isArray(transactionData)
            ? transactionData
            : transactionData.results || []
        );
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          "Unable to load dashboard information."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    fetchNotifications();

    // Refresh notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      clearInterval(notificationInterval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
  if (location.hash === "#my-accounts") {
    document.getElementById("my-accounts")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [location.hash]);

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0
  );

  const navigation = [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { name: "My Accounts", icon: Wallet, path:"/accounts" },
    { name: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
    { name: "Deposit Money", icon: PlusCircle, path: "/deposit" },
    { name: "Withdraw Money", icon: MinusCircle, path: "/withdraw" },
    { name: "Transfer Money", icon: Send, path: "/transfer" },
    { name: "Notifications", icon: Bell, path: "/notifications" },
    { name: "My Profile", icon: User, path: "/profile" },
    { name: "Change Password", icon: User, path: "/change-password" },
    { name: "Beneficiaries", icon: Users, path: "/beneficiaries" },
    { name: "Loans", icon: CreditCard, path: "/loans" },
    {name: "Customer Support",icon: MessageSquare,path: "/complaints"},
    {name: "My Loan Repayments",icon: CreditCard,path: "/loan-repayments"},
  ];

  const searchResults = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // const handleNavigation = (item) => {
  //   if (item.path) {
  //     setShowSearch(false);
  //     setSearchQuery("");
  //     navigate(item.path);
  //   }
  // };

  const handleNavigation = (item) => {
  //   if (item.name === "My Accounts") {
  //     document.getElementById("my-accounts")?.scrollIntoView({
  //       behavior: "smooth",
  //       block: "start",
  //     });
  //     return;
  //   }

    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="bank-layout">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">ER</div>
          <div>
            <h2>RuralBank</h2>
            <span>Enterprise Banking</span>
          </div>
        </div>

        <p className="menu-heading">MAIN MENU</p>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.name}
                role="button"
                tabIndex={0}
                className={`nav-item ${
                  item.name === "My Accounts"
                    ? ""
                    : location.pathname === item.path
                    ? "active"
                    : ""
                }`}
                onClick={() => handleNavigation(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleNavigation(item);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-button" onClick={logout}>
            <LogOut size={19} />
            Logout
          </button>
        </div>

      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Welcome back! Here's your banking summary.</p>
          </div>

          <div className="topbar-actions">

            <div className="dashboard-search">
              <button
                type="button"
                className="icon-button"
                aria-label="Search dashboard"
                onClick={() => {
                  setShowSearch((previous) => !previous);
                  setSearchQuery("");
                }}
              >
                <Search size={20} />
              </button>

              {showSearch && (
                <div className="dashboard-search-dropdown">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search banking services..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />

                  <div className="dashboard-search-results">
                    {searchQuery.trim() === "" ? (
                      <p>Search accounts, transactions, loans and services.</p>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            type="button"
                            key={item.name}
                            onClick={() => handleNavigation(item)}
                          >
                            <Icon size={17} />
                            <span>{item.name}</span>
                          </button>
                        );
                      })
                    ) : (
                      <p>No matching services found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="notification-wrapper">

              <button
                className="icon-button notification-button"
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown">

                  <div className="notification-header">
                    <div>
                      <h3>Notifications</h3>
                      <span>{unreadCount} unread</span>
                    </div>

                    <button
                      className="notification-close"
                      onClick={() => setShowNotifications(false)}
                      aria-label="Close notifications"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      className="mark-all-button"
                      onClick={markAllAsRead}
                    >
                      <CheckCheck size={15} />
                      Mark all as read
                    </button>
                  )}

                  <div className="notification-list">

                    {notificationLoading ? (
                      <p className="notification-empty">
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <p className="notification-empty">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((notification) => {
                        const NotificationIcon =
                          getNotificationIcon(
                            notification.notification_type
                          );

                        return (
                          <div
                            key={notification.id}
                            className={`notification-item ${
                              notification.is_read ? "read" : "unread"
                            }`}
                            onClick={() => {
                              if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                            }}
                          >
                            <div className="notification-icon">
                              <NotificationIcon size={18} />
                            </div>

                            <div className="notification-content">

                              <div className="notification-item-top">
                                <strong>{notification.title}</strong>

                                {!notification.is_read && (
                                  <span className="unread-dot"></span>
                                )}
                              </div>

                              <p>{notification.message}</p>

                              <span className="notification-date">
                                {new Date(
                                  notification.created_at
                                ).toLocaleString()}
                              </span>

                            </div>
                          </div>
                        );
                      })
                    )}

                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="profile-avatar"
              aria-label="Open my profile"
              title="My Profile"
              onClick={() => navigate("/profile")}
            >
              C
            </button>

          </div>
        </header>

        {/* Welcome Section */}
        <section className="welcome-section">
          <div>
            <h1>Welcome to RuralBank</h1>
            <p>Manage your money with confidence and security.</p>
          </div>
        </section>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p>Loading your banking information...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <section className="summary-grid">

              <div className="summary-card balance-summary">
                <div className="summary-icon">
                  <Wallet size={22} />
                </div>
                <p>Total Account Balance</p>
                <h2>₹{totalBalance.toFixed(2)}</h2>
                <span>Across all your accounts</span>
              </div>

              <div className="summary-card">
                <div className="summary-icon">
                  <CreditCard size={22} />
                </div>
                <p>Total Bank Accounts</p>
                <h2>{accounts.length}</h2>
                <span>Active banking accounts</span>
              </div>

              <div className="summary-card">
                <div className="summary-icon">
                  <ArrowLeftRight size={22} />
                </div>
                <p>Total Transactions</p>
                <h2>{transactions.length}</h2>
                <span>Transaction records</span>
              </div>

            </section>

            {/* Accounts and Quick Actions */}
            <section className="content-grid">

              <div className="panel accounts-panel" id="my-accounts">
                <div className="panel-heading">
                  <div>
                    <h2>My Bank Accounts</h2>
                    <p>Your available bank accounts</p>
                  </div>
                </div>

                {accounts.length === 0 ? (
                  <p>No bank accounts found.</p>
                ) : (
                  accounts.map((account) => (
                    <div className="account-card" key={account.id}>

                      <div className="account-card-top">
                        <div className="account-symbol">
                          <Wallet size={22} />
                        </div>

                        <span className="status-badge">
                          {account.status}
                        </span>
                      </div>

                      <h3>
                        {account.account_type || "Bank Account"}
                      </h3>

                      <p className="account-number">
                        Account Number: {account.account_number}
                      </p>

                      <div className="account-balance">
                        ₹{Number(account.balance || 0).toFixed(2)}
                      </div>

                    </div>
                  ))
                )}
              </div>

              <div className="panel quick-actions-panel">

                <div className="panel-heading">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Banking services</p>
                  </div>
                </div>

                <div className="quick-actions">

                  <button
                    className="action-item"
                    onClick={() => navigate("/deposit")}
                  >
                    <PlusCircle size={22} />
                    <span>Deposit Money</span>
                  </button>

                  <button
                    className="action-item"
                    onClick={() => navigate("/withdraw")}
                  >
                    <MinusCircle size={22} />
                    <span>Withdraw Money</span>
                  </button>

                  <button
                    className="action-item"
                    onClick={() => navigate("/transfer")}
                  >
                    <Send size={22} />
                    <span>Transfer Money</span>
                  </button>

                  <button
                    className="action-item"
                    onClick={() => navigate("/transactions")}
                  >
                    <ArrowLeftRight size={22} />
                    <span>Transaction History</span>
                  </button>

                  <button
                    className="action-item"
                    onClick={() => navigate("/loans")}
                  >
                    <CreditCard size={22} />
                    <span>Loan Management</span>
                  </button>

                </div>
              </div>

            </section>

            {/* Recent Transactions */}
            <section className="panel transactions-panel">

              <div className="panel-heading">
                <div>
                  <h2>Recent Transactions</h2>
                  <p>Your latest banking activities</p>
                </div>

                <button
                  className="refresh-button"
                  onClick={() => navigate("/transactions")}
                >
                  View All
                </button>
              </div>

              {transactions.length === 0 ? (
                <p>No transactions available yet.</p>
              ) : (
                <div className="transaction-list">

                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      className="transaction-row"
                      key={transaction.id}
                    >
                      <div>
                        <strong>
                          {transaction.type ||
                            transaction.transaction_type ||
                            "Transaction"}
                        </strong>

                        <p>
                          {transaction.reference ||
                            transaction.reference_number ||
                            transaction.description ||
                            "Bank transaction"}
                        </p>
                      </div>

                      <strong>
                        ₹{Number(transaction.amount || 0).toFixed(2)}
                      </strong>
                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}

        <footer className="dashboard-footer">
          © 2026 RuralBank Enterprise Banking System
        </footer>

      </main>
    </div>
  );
}

export default Dashboard;
