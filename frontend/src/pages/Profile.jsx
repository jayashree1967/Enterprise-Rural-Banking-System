
import { useEffect, useState } from "react";
import { ArrowLeft, User, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await API.get("profile/");
      setProfile(response.data);
    } catch (err) {
      console.error("Profile loading error:", err.response?.data);
      setError(
        err.response?.data?.detail ||
        "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await API.patch("profile/", profile);

      setProfile(response.data.profile);
      setMessage(
        response.data.message || "Profile updated successfully."
      );
    } catch (err) {
      console.error("Profile update error:", err.response?.data);

      const data = err.response?.data;
      const firstError =
        data && typeof data === "object"
          ? Object.values(data)
              .flat()
              .find((value) => typeof value === "string")
          : null;

      setError(
        firstError ||
        data?.detail ||
        "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="profile-card">
        <div className="form-icon">
          <User size={30} />
        </div>

        <h1>My Profile</h1>
        <p className="form-subtitle">
          View and manage your personal information.
        </p>

        {message && (
          <div className="success-message">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <div>
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                value={profile.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                value={profile.last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                disabled
              />
            </div>

            <div>
              <label htmlFor="phone_number">Phone Number</label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                maxLength={15}
                value={profile.phone_number}
                onChange={handleChange}
                pattern="^\+?[0-9]{10,15}$"
                title="Enter a valid phone number containing 10 to 15 digits."
              />
            </div>

            <div>
              <label htmlFor="date_of_birth">Date of Birth</label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={profile.date_of_birth || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="postal_code">Postal Code</label>
              <input
                id="postal_code"
                name="postal_code"
                value={profile.postal_code}
                onChange={handleChange}
                maxLength={10}
                required
              />
            </div>

            <div className="profile-full-width">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={profile.address}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                value={profile.city}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="state">State</label>
              <input
                id="state"
                name="state"
                value={profile.state}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={saving}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
