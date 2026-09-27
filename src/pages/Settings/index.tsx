import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../lib/api";

function Settings() {
  const navigate = useNavigate();

  // =========================
  // GET LOGGED-IN USER
  // =========================

  const storedUser = localStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : null;

  // =========================
  // STATE
  // =========================

  const [name, setName] = useState(
    user?.name || ""
  );

  const [email, setEmail] = useState(
    user?.email || ""
  );

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);


  // =========================
  // SAVE PROFILE
  // =========================

  const handleSave = async () => {
    setMessage("");
    setError("");

    // Check logged-in user
    if (!user?.id) {
      setError(
        "User session not found. Please login again."
      );

      return;
    }

    // Check JWT token
    const token = localStorage.getItem("token");

    if (!token) {
      setError(
        "Authentication token not found. Please login again."
      );

      return;
    }

    // Validate name
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    // Basic email validation
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setLoading(true);

      console.log(
        "UPDATING USER:",
        user.id
      );

      // =========================
      // UPDATE USER API
      // =========================
      //
      // IMPORTANT:
      // The user ID is NOT sent in the URL.
      // Backend gets the ID from JWT.
      //

      const response = await fetch(
        `${API_URL}/user`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            // Send JWT
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log(
        "UPDATE RESPONSE:",
        response.status,
        data
      );


      // =========================
      // TOKEN INVALID / EXPIRED
      // =========================

      if (response.status === 401 ||
          response.status === 403) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        setError(
          "Your session has expired. Please login again."
        );

        setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 1500);

        return;
      }


      // =========================
      // UPDATE FAILED
      // =========================

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to update profile."
        );

        return;
      }


      // =========================
      // UPDATE LOCAL STORAGE
      // =========================

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );
      window.dispatchEvent(new Event("worksphere-user-updated"));


      // =========================
      // UPDATE UI
      // =========================

      setName(data.user.name);
      setEmail(data.user.email);


      // =========================
      // SUCCESS
      // =========================

      setMessage(
        "Profile updated successfully."
      );

      console.log(
        "PROFILE UPDATE SUCCESS"
      );

    } catch (error) {

      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      setError(
        "Cannot connect to server. Make sure the backend is running."
      );

    } finally {
      setLoading(false);
    }
  };


  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {

    localStorage.removeItem("user");

    localStorage.removeItem("token");

    navigate("/login", {
      replace: true,
    });
  };


  // =========================
  // PAGE
  // =========================

  return (
    <div className="settings-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="settings-header">

        <div>

          <h1>
            Settings
          </h1>

          <p>
            Manage your account and workspace preferences.
          </p>

        </div>

      </div>


      {/* =========================
          PROFILE CARD
      ========================= */}

      <div className="settings-card">

        <div className="settings-card-header">

          <div>

            <h2>
              Profile
            </h2>

            <p>
              Update your personal information.
            </p>

          </div>

        </div>


        {/* =========================
            PROFILE FORM
        ========================= */}

        <div className="settings-form">

          {/* FULL NAME */}

          <div className="settings-form-group">

            <label htmlFor="name">
              Full name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);

                // Clear messages while typing
                setError("");
                setMessage("");
              }}
              placeholder="Enter your full name"
            />

          </div>


          {/* EMAIL */}

          <div className="settings-form-group">

            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                // Clear messages while typing
                setError("");
                setMessage("");
              }}
              placeholder="Enter your email"
            />

          </div>

        </div>


        {/* =========================
            ERROR MESSAGE
        ========================= */}

        {error && (
          <p className="settings-error">
            {error}
          </p>
        )}


        {/* =========================
            SUCCESS MESSAGE
        ========================= */}

        {message && (
          <p className="settings-success">
            {message}
          </p>
        )}


        {/* =========================
            SAVE BUTTON
        ========================= */}

        <button
          type="button"
          className="settings-save-button"
          onClick={handleSave}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save changes"}
        </button>

      </div>


      {/* =========================
          ACCOUNT CARD
      ========================= */}

      <div className="settings-card">

        <div className="settings-card-header">

          <div>

            <h2>
              Account
            </h2>

            <p>
              Manage your WorkSphere account.
            </p>

          </div>

        </div>


        <div className="settings-account-row">

          <div>

            <h3>
              Sign out
            </h3>

            <p>
              Sign out of your WorkSphere account
              on this device.
            </p>

          </div>


          <button
            type="button"
            className="settings-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}

export default Settings;
