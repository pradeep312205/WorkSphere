import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import registerBg from "../../assets/register-bg.png";
import { API_URL } from "../../lib/api";

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    console.log("REGISTER FORM SUBMITTED");

    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // =========================
    // FULL NAME VALIDATION
    // =========================
    if (!name.trim()) {
      newErrors.name = "Full name is required";
    }

    // =========================
    // EMAIL VALIDATION
    // =========================
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    // =========================
    // PASSWORD VALIDATION
    // =========================
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password =
        "Password must be at least 8 characters";
    }

    // =========================
    // CONFIRM PASSWORD
    // =========================
    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword =
        "Passwords do not match";
    }

    setErrors(newErrors);
    setMessage("");

    // Stop if validation errors exist
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // =========================
    // SEND DATA TO BACKEND
    // =========================
    try {
      setLoading(true);

      console.log("SENDING REQUEST TO BACKEND");
      console.log({
        name,
        email,
        password,
      });

      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password,
          }),
        }
      );

      console.log(
        "BACKEND STATUS:",
        response.status
      );

      const data = await response.json();

      console.log(
        "BACKEND RESPONSE:",
        data
      );

      // =========================
      // BACKEND ERROR
      // =========================
      if (!response.ok) {
        setMessage(
          data.message || "Registration failed"
        );

        return;
      }

      // =========================
      // SUCCESS
      // =========================
      setMessage(
        "Account created successfully!"
      );

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});

      // Go to login after 1 second
      setTimeout(() => {
        console.log(
          "Navigating to login..."
        );

        navigate("/login");
      }, 1000);

    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      setMessage(
        "Cannot connect to server. Make sure backend is running."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-layout">

        {/* =========================
            LEFT IMAGE
        ========================= */}
        <div className="auth-image">

          <img
            src={registerBg}
            alt="WorkSphere workspace"
          />

        </div>

        {/* =========================
            RIGHT REGISTER
        ========================= */}
        <div className="auth-container">

          {/* BRAND */}
          <div className="auth-brand">

            <div className="brand-icon">
              W
            </div>

            <span>
              WorkSphere
            </span>

          </div>

          {/* HEADER */}
          <div className="auth-header">

            <h1>
              Create account
            </h1>

            <p>
              Join your workspace and get started
            </p>

          </div>

          {/* FORM */}
          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* =========================
                FULL NAME
            ========================= */}
            <div className="form-group">

              <label htmlFor="name">
                Full name
              </label>

              <div className="input-wrapper">

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className={
                    errors.name
                      ? "input-error"
                      : ""
                  }
                />

              </div>

              {errors.name && (
                <span className="form-error">
                  {errors.name}
                </span>
              )}

            </div>

            {/* =========================
                EMAIL
            ========================= */}
            <div className="form-group">

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className={
                    errors.email
                      ? "input-error"
                      : ""
                  }
                />

              </div>

              {errors.email && (
                <span className="form-error">
                  {errors.email}
                </span>
              )}

            </div>

            {/* =========================
                PASSWORD
            ========================= */}
            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className={
                    errors.password
                      ? "input-error"
                      : ""
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "◉"
                    : "◌"}
                </button>

              </div>

              {errors.password && (
                <span className="form-error">
                  {errors.password}
                </span>
              )}

            </div>

            {/* =========================
                CONFIRM PASSWORD
            ========================= */}
            <div className="form-group">

              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="input-wrapper">

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  className={
                    errors.confirmPassword
                      ? "input-error"
                      : ""
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword
                    ? "◉"
                    : "◌"}
                </button>

              </div>

              {errors.confirmPassword && (
                <span className="form-error">
                  {errors.confirmPassword}
                </span>
              )}

            </div>

            {/* =========================
                SERVER MESSAGE
            ========================= */}
            {message && (
              <p
                className={
                  message.includes(
                    "successfully"
                  )
                    ? "auth-message success"
                    : "auth-message error"
                }
              >
                {message}
              </p>
            )}

            {/* =========================
                REGISTER BUTTON
            ========================= */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>

          </form>

          {/* =========================
              FOOTER
          ========================= */}
          <div className="auth-footer">

            <span>
              Already have an account?
            </span>

            <Link to="/login">
              Sign in
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Register;
