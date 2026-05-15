import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';
import config from '../../config';



const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'citizen',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setForm(prev => ({
      ...prev,
      // Handle checkbox vs text input
      [name]: finalValue
    }));
    validateField(name, finalValue);
  };

  const calculateStrength = (password) => {
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0-5
  };

  const getStrengthLabel = (score) => {
    if (score <= 1) return { label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Strong', color: '#10b981' };
  };

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };
    
    switch(name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else {
          delete errors.password;
        }
        setPasswordStrength(calculateStrength(value));
        break;

      case 'confirmPassword':
        const pwd = document.querySelector('input[name="password"]')?.value || '';
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== pwd) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;

      case 'name':
        if (value && value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else {
          delete errors.name;
        }
        break;

      default:
        break;
    }
    setFieldErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Frontend validation
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(form.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!form.agree) {
      setError('You must accept civic responsibility terms');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${config.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(data.message);

      // Reset form after success
      setForm({
        role: 'citizen',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        agree: false
      });

      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      setError('Server not reachable');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <nav className="navbar navbar-expand navbar-dark px-4 py-2 border-bottom border-light border-opacity-10 my-0 animate-fade-down">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center gap-2 fs-4 fw-bold" href="/">
            <i className="fas fa-building-columns text-primary" aria-hidden="true"></i>
            <span>Civic-Pulse</span>
          </a>
          <div className="navbar-nav ms-auto d-flex flex-row align-items-center gap-3">
            <a className="nav-link fw-medium premium-nav-link fs-6 px-3" href="/">Home</a>
            <a href="/login" className="btn btn-primary rounded-3 fw-semibold shadow px-4 py-2 ms-2 fs-6">Login</a>
          </div>
        </div>
      </nav>

      <main className="auth-container">
        <div className="auth-card">

          <div className="auth-icon">
            <span />
          </div>

          <h1>Create Account</h1>
          <p className="auth-subtitle">
            Create an account to report and track civic issues.
          </p>



          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={(e) => validateField(e.target.name, e.target.value)}
              placeholder="Enter your full name"
            />
            {fieldErrors.name && (
              <span className="auth-field-error">
                {fieldErrors.name}
              </span>
            )}

            <label>Email Address</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={(e) => validateField(e.target.name, e.target.value)}
              placeholder="Enter your email"
            />
            {fieldErrors.email && (
              <span className="auth-field-error">
                {fieldErrors.email}
              </span>
            )}

            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                onBlur={(e) => validateField(e.target.name, e.target.value)}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-pwd"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordStrength > 0 && (
              <div className="auth-strength-bar">
                <div 
                  className="auth-strength-fill"
                  style={{
                    width: `${(passwordStrength / 5) * 100}%`,
                    background: getStrengthLabel(passwordStrength).color
                  }}
                />
                <span 
                  className="auth-strength-label"
                  style={{ color: getStrengthLabel(passwordStrength).color }}
                >
                  {getStrengthLabel(passwordStrength).label}
                </span>
              </div>
            )}
            {fieldErrors.password && (
              <span className="auth-field-error">
                {fieldErrors.password}
              </span>
            )}

            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={(e) => validateField(e.target.name, e.target.value)}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="auth-toggle-pwd"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="auth-field-error">
                {fieldErrors.confirmPassword}
              </span>
            )}

            <div className="terms">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
              />
              <span>
                I agree to civic responsibility and audit policies
              </span>
            </div>

            <button
              className="primary-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>



          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;
