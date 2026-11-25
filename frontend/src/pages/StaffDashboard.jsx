
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
  Users,
  LogOut,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

function StaffDashboard() {
  const navigate = useNavigate();
  const { role, email, logout } = useAuth();

  const staffModules = [
    {
      title: "Loan Management",
      description:
        "Review customer loan applications and approve or reject them.",
      icon: FileText,
      path: "/staff/loans",
    },
    {
      title: "Loan Repayment Management",
      description:
        "View EMI installments and record verified repayments.",
      icon: CreditCard,
      path: "/staff/repayments",
    },
    {
      title: "Customer Complaints",
      description:
        "Review and respond to customer complaints.",
      icon: MessageSquare,
      path: "/staff/complaints",
    },
    {
      title: "Account Applications",
      description:
        "Review new savings and current account applications and approve or reject them.",
      icon: ClipboardCheck,
      path: "/staff/account-applications",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="staff-dashboard">
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <div className="staff-brand-icon">ER</div>
          <div>
            <h2>RuralBank</h2>
            <span>Staff Portal</span>
          </div>
        </div>

        <p className="staff-menu-label">STAFF MENU</p>

        <button
          className="staff-nav-active"
          onClick={() => navigate("/staff-dashboard")}
        >
          <LayoutDashboard size={19} />
          Dashboard
        </button>

        <button onClick={() => navigate("/staff/loans")}>
          <FileText size={19} />
          Loan Management
        </button>

        <button onClick={() => navigate("/staff/repayments")}>
          <CreditCard size={19} />
          Loan Repayments
        </button>

        <button onClick={() => navigate("/staff/complaints")}>
          <MessageSquare size={19} />
          Complaints
        </button>

        <button onClick={() => navigate("/staff/customers")}>
          <Users size={19} />
          Customer View
        </button>

        <button onClick={() => navigate("/staff/account-applications")}>
          <ClipboardCheck size={19} />
          Account Applications
        </button>

        <button className="staff-logout" onClick={handleLogout}>
          <LogOut size={19} />
          Logout
        </button>
      </aside>

      <main className="staff-main">
        <header className="staff-topbar">
          <div>
            <span>ENTERPRISE RURAL BANKING</span>
            <h1>Staff Dashboard</h1>
          </div>

          <div className="staff-user">
            <div className="staff-avatar">
              {role === "ADMIN" ? "A" : "S"}
            </div>

            <div>
              <strong>{role}</strong>
              <p>{email}</p>
            </div>
          </div>
        </header>

        <section className="staff-welcome">
          <div>
            <h2>Welcome to the Staff Portal</h2>
            <p>
              Manage account applications, loans, repayments and
              customer support from one place.
            </p>
          </div>
        </section>

        <section className="staff-module-section">
          <div className="staff-section-heading">
            <div>
              <h2>Banking Operations</h2>
              <p>Select a module to continue.</p>
            </div>

            <button onClick={() => window.location.reload()}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="staff-module-grid">
            {staffModules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  className="staff-module-card"
                  key={module.path}
                  onClick={() => navigate(module.path)}
                >
                  <div className="staff-module-icon">
                    <Icon size={25} />
                  </div>

                  <h3>{module.title}</h3>
                  <p>{module.description}</p>

                  <span>Open Module →</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default StaffDashboard;
