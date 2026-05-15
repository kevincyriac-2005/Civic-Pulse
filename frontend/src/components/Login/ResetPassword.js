import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import config from '../../config';
import './Login.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setLoading(true);
    try {
      await axios.post(`${config.API_BASE_URL}/auth/reset-password/${token}`, { password });
      toast.success('Password updated successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset link is invalid or has expired.';
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
                <i className="fas fa-key"></i>
              </div>
              <h4>Set New Password</h4>
            </div>

            <p className="about-text animate-stagger auth-stagger-1">
              Choose a strong password for your account. It must be at least 8 characters.
            </p>

            <form
              className="contact-form animate-stagger auth-stagger-2"
              onSubmit={handleSubmit}
              id="reset-password-form"
            >
              {error && (
                <div className="feed-time" role="alert" aria-live="polite">
                  <i className="fas fa-circle-exclamation me-2"></i>{error}
                </div>
              )}

              {/* New Password */}
              <div className="mb-3">
                <label htmlFor="rp-password" className="form-label">New Password</label>
                <div className="rp-input-wrap">
                  <input
                    id="rp-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control rp-password-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    id="rp-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rp-toggle-btn"
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label htmlFor="rp-confirm" className="form-label">Confirm Password</label>
                <input
                  id="rp-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Password strength hint */}
              {password.length > 0 && (
                <div className="rp-strength-wrap">
                  <div className="rp-strength-bar" data-strength={
                    password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak'
                  } />
                  <p className="rp-strength-label">
                    {password.length >= 12 ? '✓ Strong password' : password.length >= 8 ? '⚠ Acceptable — consider a longer password' : '✗ Too short'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                id="rp-submit-btn"
                className="btn btn-primary w-100 btn-elevate"
                disabled={loading}
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin me-2"></i>Updating...</>
                ) : (
                  <><i className="fas fa-check me-2"></i>Update Password</>
                )}
              </button>
            </form>

            <p className="feed-text mt-3 text-center animate-stagger auth-stagger-2">
              <a href="/login" id="rp-back-login">
                <i className="fas fa-arrow-left me-1"></i>Back to Login
              </a>
            </p>

          </div>
        </div>
      </section>
    </div>
  );
};

export default ResetPassword;
