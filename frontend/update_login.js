const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/Login/Login.js');

let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const handleSubmit = async \(e\) => \{\s*e\.preventDefault\(\);\s*setError\(''\);\s*if \(!form\.email \|\| !form\.password\) \{\s*setError\('Please fill in both fields'\);\s*return;\s*\}/s,
  `const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLockoutMessage(null);
    setFieldErrors({});

    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/;

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
    }`
);

content = content.replace(
  /\} else \{\s*setError\(data\.message \|\| 'Login failed'\);\s*\}\s*\} catch \(err\) \{\s*setError\('Server not reachable\. Please try again\.'\);\s*console\.error\(err\);/s,
  `} else if (res.status === 423) {
        setLockoutMessage(data.message || 'Account temporarily locked');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      if (err.response && err.response.status === 423) {
        setLockoutMessage(err.response?.data?.message || 'Account temporarily locked');
      } else {
        setError('Server not reachable. Please try again.');
      }
      console.error(err);`
);

content = content.replace(
  /\{error && \(\s*<div className="feed-time" role="alert" aria-live="polite">\s*\{error\}\s*<\/div>\s*\)\}\s*<div className="mb-3">\s*<label className="form-label">Email<\/label>\s*<input\s*name="email".*?autoComplete="current-password"\s*\/>\s*<\/div>/s,
  `{error && (
                <div className="feed-time" role="alert" aria-live="polite">
                  {error}
                </div>
              )}

              {lockoutMessage && (
                <div className="auth-lockout-msg">
                  🔒 {lockoutMessage}
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
              </div>`
);

fs.writeFileSync(file, content);
console.log('Login.js updated successfully!');
