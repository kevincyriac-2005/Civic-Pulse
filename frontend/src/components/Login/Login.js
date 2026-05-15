import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Home/Home.css';
import './Login.css';
import config from '../../config';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(form.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${config.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        // Save token and user info (could use Context in future)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user)); // Optional: for quick access

        // Redirect based on role or to dashboard
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else if (data.user.role === 'citizen') {
          navigate('/citizen');
        } else if (data.user.role === 'officer') {
          navigate('/officer');
        } else if (data.user.role === 'field') {
          navigate('/fieldworker');
        } else {
          navigate('/');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Server not reachable. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page ${mounted ? 'is-mounted' : ''}`}>
      <nav className="navbar animate-fade-down">
        <div className="container-fluid">
          <a className="navbar-brand" href="/">
            {/* Match Civic-Pulse icon style (same as Home) */}
            <i className="fas fa-building-columns brand-float" aria-hidden="true"></i>
            <span className="brand-text">Civic-Pulse</span>
          </a>
          <div className="navbar-nav">
            <a className="nav-link premium-nav-link" href="/">Home</a>
            <a href="/register" className="btn btn-primary ml-3 btn-elevate">Get Started</a>
          </div>
        </div>
      </nav>

      <section className="hero-section d-flex align-items-center justify-content-center">
        <div className="hero-content">
          <div className="glass-card login-card animate-fade-up">
            <div className="about-card-header animate-stagger auth-stagger-0">
              <i className="fas fa-right-to-bracket"></i>
              <h4>Welcome Back</h4>
            </div>

            <p className="about-text animate-stagger auth-stagger-1">
              Sign in to your Civic-Pulse account to manage and track issues.
            </p>

            <form className="contact-form animate-stagger auth-stagger-2" onSubmit={handleSubmit}>
              {error && (
                <div className="feed-time" role="alert" aria-live="polite">
                  {error}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-control"
                  type="email"
                  placeholder="you@city.gov"
                  autoComplete="username"
                />
                {fieldErrors.email && (
                  <span className="auth-field-error">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="form-control"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-pwd"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="auth-field-error">
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <button type="submit" className="btn btn-primary btn-lg btn-elevate">Sign In</button>
                <a href="/forgot" className="nav-link">Forgot?</a>
              </div>
            </form>

            <hr />
            <div className="auth-footer-note">
              <small className="feed-text">
                Don’t have an account? <Link to="/register">Create one</Link>
              </small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
