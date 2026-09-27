import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import registerBg from "../../assets/register-bg.png";
import { API_URL } from "../../lib/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    // Check password
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      // Send registration request to backend
      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      // Backend returned an error
      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      // Registration successful
      setMessage("Account created successfully!");

      console.log("Registration successful");

      // Go to login page after 1 second
      setTimeout(() => {
        console.log("Navigating to login...");
        navigate("/login");
      }, 1000);

    } catch (error) {
      console.error("REGISTER ERROR:", error);
      setMessage("Cannot connect to server");
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-layout">

        {/* LEFT IMAGE */}
        <div className="auth-image">
          <img
            src={registerBg}
            alt="WorkSphere workspace"
          />
        </div>

        {/* RIGHT REGISTER */}
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

            {/* FULL NAME */}
            <div className="form-group">

              <label htmlFor="name">
                Full name
              </label>

              <div className="input-wrapper">

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

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
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

            {/* CONFIRM PASSWORD */}
            <div className="form-group">

              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="input-wrapper">

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

            {/* MESSAGE */}
            {message && (
              <p className="auth-message">
                {message}
              </p>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="auth-button"
            >
              Create account
            </button>

          </form>

          {/* FOOTER */}
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
