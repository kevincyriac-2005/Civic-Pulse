import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${config.API_BASE_URL}/auth/forgot-password`, {
        email: email.trim().toLowerCase()
      });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page ${mounted ? 'is-mounted' : ''}`}>
      {/* Navbar */}
      <nav className="navbar animate-fade-down">
        <div className="container-fluid">
          <a className="navbar-brand" href="/">
            <i className="fas fa-building-columns brand-float" aria-hidden="true"></i>
            <span className="brand-text">Civic-Pulse</span>
          </a>
          <div className="navbar-nav">
            <a className="nav-link premium-nav-link" href="/">Home</a>
            <a href="/login" className="btn btn-primary ml-3 btn-elevate">Login</a>
          </div>
        </div>
      </nav>

      <section className="hero-section d-flex align-items-center justify-content-center">
        <div className="hero-content">
          <div className="glass-card login-card animate-fade-up">

            {/* Header */}
            <div className="about-card-header animate-stagger auth-stagger-0">
              <div>
                <i className="fas fa-lock-open"></i>
              </div>
              <h4>Forgot Password</h4>
            </div>

            {!success ? (
              <>
                <p className="about-text animate-stagger auth-stagger-1">
                  Enter your registered email address and we'll send you a link to reset your password.
                </p>

                <form
                  className="contact-form animate-stagger auth-stagger-2"
                  onSubmit={handleSubmit}
                  id="forgot-password-form"
                >
                  {error && (
                    <div className="feed-time" role="alert" aria-live="polite">
                      <i className="fas fa-circle-exclamation me-2"></i>{error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="fp-email" className="form-label">Email Address</label>
                    <input
                      id="fp-email"
                      type="email"
                      className="form-control"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <button
                    type="submit"
                    id="fp-submit-btn"
                    className="btn btn-primary w-100 btn-elevate"
                    disabled={loading}
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin me-2"></i>Sending...</>
                    ) : (
                      <><i className="fas fa-paper-plane me-2"></i>Send Reset Link</>
                    )}
                  </button>
                </form>

                <p className="feed-text mt-3 text-center animate-stagger auth-stagger-2">
                  Remember your password?{' '}
                  <a href="/login" id="fp-back-login">Sign in</a>
                </p>
              </>
            ) : (
              /* Success State */
              <div className="text-center animate-fade-up fp-success-box">
                <div className="fp-success-icon">
                  <i className="fas fa-circle-check"></i>
                </div>
                <h5 className="fp-success-title">Check Your Inbox</h5>
                <p className="fp-success-msg">
                  If <strong className="fp-success-email">{email}</strong> is registered,
                  you'll receive a password reset link shortly. The link expires in 1 hour.
                </p>
                <p className="fp-success-hint">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    id="fp-resend-btn"
                    onClick={() => setSuccess(false)}
                    className="fp-resend-btn"
                  >
                    try again
                  </button>.
                </p>
                <a href="/login" id="fp-return-login" className="btn btn-primary btn-elevate mt-3">
                  <i className="fas fa-arrow-left me-2"></i>Back to Login
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForgotPassword;
