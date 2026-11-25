
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Check,
  CheckCheck,
  RefreshCw,
  Filter,
  Inbox,
} from "lucide-react";

import API from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Fetch notifications from Django
  const fetchNotifications = useCallback(async () => {
    try {
      setError("");

      const response = await API.get("notifications/");
      const data = response.data;

      setNotifications(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      console.error("Notification fetch error:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Refresh notification history every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Unread notification count
  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const readCount = notifications.length - unreadCount;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNREAD" && !notification.is_read) ||
        (statusFilter === "READ" && notification.is_read);

      const matchesType =
        typeFilter === "ALL" ||
        notification.notification_type === typeFilter;

      return matchesStatus && matchesType;
    });
  }, [notifications, statusFilter, typeFilter]);

  // Select icon based on transaction type
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

  // Mark one notification as read
  const markAsRead = async (id) => {
    try {
      setUpdatingId(id);

      await API.patch(`notifications/${id}/read/`);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
      setError("Unable to update notification. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (item) => !item.is_read
    );

    if (unread.length === 0) return;

    try {
      setMarkingAll(true);
      setError("");

      await Promise.all(
        unread.map((item) =>
          API.patch(`notifications/${item.id}/read/`)
        )
      );

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Unable to mark all as read:", err);
      setError(
        "Some notifications could not be updated. Refreshing the list."
      );
      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="notification-page">

      {/* Page Heading */}
      <div className="notification-page-heading">
        <div>
          <h1>Notification Center</h1>
          <p>
            View and manage your banking alerts and transaction updates.
          </p>
        </div>

        <button
          className="notification-refresh"
          onClick={fetchNotifications}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="notification-stats">

        <div className="notification-stat-card">
          <div className="notification-stat-icon">
            <Bell size={21} />
          </div>
          <div>
            <span>Total Notifications</span>
            <h2>{notifications.length}</h2>
          </div>
        </div>

        <div className="notification-stat-card">
          <div className="notification-stat-icon unread-stat-icon">
            <Inbox size={21} />
          </div>
          <div>
            <span>Unread Notifications</span>
            <h2>{unreadCount}</h2>
          </div>
        </div>

        <div className="notification-stat-card">
          <div className="notification-stat-icon read-stat-icon">
            <CheckCheck size={21} />
          </div>
          <div>
            <span>Read Notifications</span>
            <h2>{readCount}</h2>
          </div>
        </div>

      </div>

      {/* Notification History */}
      <section className="notification-history-panel">

        <div className="notification-history-heading">
          <div>
            <h2>Notification History</h2>
            <p>Your complete banking notification history</p>
          </div>

          <button
            className="notification-mark-all"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
          >
            <CheckCheck size={16} />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {/* Filters */}
        <div className="notification-filters">

          <div className="notification-status-filters">
            {[
              { label: "All", value: "ALL" },
              { label: "Unread", value: "UNREAD" },
              { label: "Read", value: "READ" },
            ].map((filter) => (
              <button
                key={filter.value}
                className={`notification-filter-button ${
                  statusFilter === filter.value ? "active" : ""
                }`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="notification-type-filter">
            <Filter size={17} />

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="ALL">All transaction types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
            </select>
          </div>

        </div>

        {error && (
          <div className="notification-error">
            {error}
          </div>
        )}

        {/* Notification List */}
        <div className="notification-history-list">

          {loading ? (
            <div className="notification-history-empty">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-history-empty">
              <Inbox size={42} />
              <h3>No notifications found</h3>
              <p>
                Try changing your filters or check again later.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const NotificationIcon = getNotificationIcon(
                notification.notification_type
              );

              return (
                <article
                  key={notification.id}
                  className={`notification-history-item ${
                    notification.is_read ? "read" : "unread"
                  }`}
                >

                  <div className="notification-history-icon">
                    <NotificationIcon size={21} />
                  </div>

                  <div className="notification-history-content">

                    <div className="notification-history-title">
                      <h3>{notification.title}</h3>

                      {!notification.is_read && (
                        <span className="notification-unread-label">
                          Unread
                        </span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <div className="notification-history-meta">
                      <span className="notification-type-label">
                        {notification.notification_type}
                      </span>

                      <span>
                        {new Date(
                          notification.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                    {notification.transaction && (
                      <div className="notification-transaction-detail">
                        Transaction ID: {notification.transaction}
                      </div>
                    )}

                  </div>

                  {!notification.is_read && (
                    <button
                      className="notification-read-button"
                      onClick={() => markAsRead(notification.id)}
                      disabled={updatingId === notification.id}
                    >
                      <Check size={16} />
                      {updatingId === notification.id
                        ? "Updating..."
                        : "Mark as read"}
                    </button>
                  )}

                </article>
              );
            })
          )}

        </div>

        <div className="notification-history-footer">
          Showing {filteredNotifications.length} of {notifications.length} notifications
        </div>

      </section>
    </div>
  );
}

export default Notifications;
