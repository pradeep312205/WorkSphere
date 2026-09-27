import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import loginBg from "../../assets/login-bg.png";
import { API_URL } from "../../lib/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    // =========================
    // VALIDATION
    // =========================

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);

      console.log("LOGIN REQUEST");

      // =========================
      // LOGIN API
      // =========================

      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "LOGIN RESPONSE:",
        response.status,
        data
      );

      // =========================
      // LOGIN FAILED
      // =========================

      if (!response.ok) {
        setError(
          data.message ||
            "Invalid email or password"
        );

        return;
      }

      // =========================
      // CHECK USER + TOKEN
      // =========================

      if (!data.user || !data.token) {
        console.error(
          "Login succeeded but authentication information is missing:",
          data
        );

        setError(
          "Login failed: authentication information was not received."
        );

        return;
      }

      // =========================
      // LOGIN SUCCESS
      // =========================

      console.log(
        "LOGIN SUCCESS:",
        data.user
      );

      // =========================
      // SAVE USER
      // =========================

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // =========================
      // SAVE JWT TOKEN
      // =========================

      localStorage.setItem(
        "token",
        data.token
      );

      // =========================
      // VERIFY STORAGE
      // =========================

      console.log(
        "USER SAVED:",
        localStorage.getItem("user")
      );

      console.log(
        "TOKEN SAVED:",
        localStorage.getItem("token")
      );

      // =========================
      // GO TO DASHBOARD
      // =========================

      navigate("/dashboard");

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setError(
        "Cannot connect to server. Make sure the backend is running."
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
            src={loginBg}
            alt="WorkSphere workspace"
          />

        </div>


        {/* =========================
            RIGHT LOGIN
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
              Welcome back
            </h1>

            <p>
              Sign in to your workspace
            </p>

          </div>


          {/* LOGIN FORM */}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}

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
                  required
                />

                <span className="input-icon">
                  ✉
                </span>

              </div>

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <span className="input-icon">
                  ♙
                </span>

              </div>


              {/* FORGOT PASSWORD */}

              <div className="forgot-password">

                <Link to="/forgot-password">
                  Forgot password?
                </Link>

              </div>

            </div>


            {/* ERROR MESSAGE */}

            {error && (
              <p className="auth-message error">
                {error}
              </p>
            )}


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>

          </form>


          {/* DIVIDER */}

          <div className="auth-divider">

            <span></span>

            <p>or</p>

            <span></span>

          </div>


          {/* FOOTER */}

          <div className="auth-footer">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Create account
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
