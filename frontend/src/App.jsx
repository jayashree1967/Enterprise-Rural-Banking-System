
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

// Authentication
import Login from "./pages/login";
import Register from "./pages/Register";

// Customer pages
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Withdraw from "./pages/Withdraw";
import Deposit from "./pages/Deposit";
import Transfer from "./pages/Transfer";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import Beneficiaries from "./pages/Beneficiaries";
import Notifications from "./pages/Notifications";
import Complaints from "./pages/Complaints";
import Loans from "./pages/Loans";
import LoanRepayments from "./pages/LoanRepayments";
import MyAccounts from "./pages/MyAccounts";
import AccountApplication from "./pages/AccountApplication";
// Staff and Admin pages
import StaffDashboard from "./pages/StaffDashboard";
import StaffLoans from "./pages/StaffLoans";
import StaffRepayments from "./pages/StaffRepayments";
import StaffComplaints from "./pages/StaffComplaints";
import CustomerOverview from "./pages/CustomerOverview";
import PayLoanEMI from "./pages/PayLoanEMI";
import StaffAccountApplications from "./pages/StaffAccountApplications";

import "./App.css";

// Protected Route
function ProtectedRoute({ children, allowedRoles }) {
  const { accessToken, role } = useAuth();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to={
          role === "STAFF" || role === "ADMIN"
            ? "/staff-dashboard"
            : "/dashboard"
        }
        replace
      />
    );
  }

  return children;
}

// Redirect users according to their roles
function HomeRedirect() {
  const { accessToken, role } = useAuth();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (role === "STAFF" || role === "ADMIN") {
    return <Navigate to="/staff-dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

// Global Back to Dashboard button
function GlobalDashboardButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const { accessToken, role } = useAuth();

  const dashboardPath =
    role === "STAFF" || role === "ADMIN"
      ? "/staff-dashboard"
      : "/dashboard";

  const hiddenPaths = [
    "/",
    "/login",
    "/dashboard",
    "/staff-dashboard",
  ];

  if (
    !accessToken ||
    hiddenPaths.includes(location.pathname)
  ) {
    return null;
  }

  return (
    <button
      className="global-dashboard-button"
      onClick={() => navigate(dashboardPath)}
      title="Return to Dashboard"
    >
      ← Back to Dashboard
    </button>
  );
}

// Application Routes
function AppRoutes() {
  return (
    <>
      <GlobalDashboardButton />

      <Routes>

        {/* Public authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer Dashboard and Customer View */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MyAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-application"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <AccountApplication />
            </ProtectedRoute>
          }
        />
        {/* Customer Operations */}
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Transactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deposit"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Deposit />
            </ProtectedRoute>
          }
        />

        <Route
          path="/withdraw"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Withdraw />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transfer"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Transfer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/beneficiaries"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Beneficiaries />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Complaints />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loans"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Loans />
            </ProtectedRoute>
          }
        />
        {/* Customer Loan Repayments */}
        <Route
          path="/loan-repayments"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <LoanRepayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loan-repayments/:id/pay"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <PayLoanEMI />
            </ProtectedRoute>
          }
        />
        {/* Shared Profile Pages */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Staff and Admin Dashboard */}
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Staff Loan Management */}
        <Route
          path="/staff/loans"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <StaffLoans />
            </ProtectedRoute>
          }
        />

        {/* Staff Loan Repayments */}
        <Route
          path="/staff/repayments"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <StaffRepayments />
            </ProtectedRoute>
          }
        />

        {/* Staff Complaints */}
        <Route
          path="/staff/complaints"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <StaffComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/customers"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <CustomerOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/account-applications"
          element={
            <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
              <StaffAccountApplications />
            </ProtectedRoute>
          }
        />
        {/* Default Routes */}
        <Route
          path="/"
          element={<HomeRedirect />}
        />

        <Route
          path="*"
          element={<HomeRedirect />}
        />

      </Routes>
    </>
  );
}

// Main Application
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
