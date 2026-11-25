import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

const initialForm = {
  first_name: "", last_name: "", email: "", phone_number: "",
  date_of_birth: "", address: "", city: "", state: "", postal_code: "",
  password: "", confirm_password: "",
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const change = (event) => setForm((current) => ({
    ...current, [event.target.name]: event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("register/", form);
      navigate("/login", {
        replace: true,
        state: { registrationSuccess: "Your customer account was created. Please sign in." },
      });
    } catch (err) {
      const data = err.response?.data;
      const messages = data && typeof data === "object"
        ? Object.entries(data).flatMap(([key, value]) =>
            (Array.isArray(value) ? value : [value]).map((message) =>
              typeof message === "string" ? `${key.replaceAll("_", " ")}: ${message}` : ""
            )
          ).filter(Boolean)
        : [];
      setError(messages.join(" ") || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "560px" }}>
        <div className="login-brand">
          <div className="login-logo">ER</div><span>RuralBank</span>
        </div>
        <div className="login-heading">
          <span className="login-eyebrow">ENTERPRISE RURAL BANKING</span>
          <h1>Create your account</h1>
          <p>Register as a customer to access RuralBank services.</p>
        </div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <form onSubmit={submit} className="login-form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="login-field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" value={form.first_name} onChange={change} autoComplete="given-name" required /></div>
            <div className="login-field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" value={form.last_name} onChange={change} autoComplete="family-name" required /></div>
          </div>
          <div className="login-field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" value={form.email} onChange={change} autoComplete="email" required /></div>
          <div className="login-field"><label htmlFor="phone_number">Phone number</label><input id="phone_number" name="phone_number" type="tel" pattern="\\+?[0-9]{10,15}" value={form.phone_number} onChange={change} autoComplete="tel" required /></div>
          <div className="login-field"><label htmlFor="date_of_birth">Date of birth</label><input id="date_of_birth" name="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={change} required /></div>
          <div className="login-field"><label htmlFor="address">Address</label><textarea id="address" name="address" value={form.address} onChange={change} rows="2" required /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="login-field"><label htmlFor="city">City</label><input id="city" name="city" value={form.city} onChange={change} required /></div>
            <div className="login-field"><label htmlFor="state">State</label><input id="state" name="state" value={form.state} onChange={change} required /></div>
          </div>
          <div className="login-field"><label htmlFor="postal_code">Postal code</label><input id="postal_code" name="postal_code" value={form.postal_code} onChange={change} maxLength="10" required /></div>
          <div className="login-field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" value={form.password} onChange={change} autoComplete="new-password" required /></div>
          <div className="login-field"><label htmlFor="confirm_password">Confirm password</label><input id="confirm_password" name="confirm_password" type="password" value={form.confirm_password} onChange={change} autoComplete="new-password" required /></div>
          <button type="submit" className="login-submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"} {!loading && <span>→</span>}</button>
        </form>
        <div style={{ textAlign: "center", marginTop: "18px", fontSize: "14px" }}>
          Already registered? <Link to="/login" style={{ color: "#0b9c8e", fontWeight: 600 }}>Sign in</Link>
        </div>
        <div className="login-security"><span>✓</span> Your account is registered with customer-only access</div>
        <div className="login-footer">© 2026 RuralBank. Enterprise Rural Banking System.</div>
      </div>
    </div>
  );
}
export default Register;
