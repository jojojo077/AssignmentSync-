import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [canvasAccessToken, setCanvasAccessToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = isRegistering
        ? await auth.register(email, password, name, canvasAccessToken)
        : await auth.login(email, password, canvasAccessToken);

      login(res.data.token, res.data.user);
      navigate('/');
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors;
      const validationMessage = validationErrors
        ? Object.values(validationErrors).flat().join(' ')
        : null;
      const serverMessage = requestError.response?.data?.message || validationMessage;
      const fallbackMessage = isRegistering
        ? 'Unable to create the account.'
        : 'Unable to log in. Check your email and password.';

      setError(serverMessage || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login auth-wrapper">
      <div className="auth-card">
        {/* Brand / Logo Header */}
        <div className="auth-header">
          <div className="auth-brand-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <span className="auth-eyebrow">AssignmentSync Portal</span>
          <h1 className="auth-title">{isRegistering ? 'Create account' : 'Log in'}</h1>
          <p className="auth-subtitle">
            {isRegistering
              ? 'Join AssignmentSync to unify your courses, deadlines, and grades.'
              : 'Welcome back! Sign in to view your deadlines and semester progress.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegistering}
            className={`auth-tab ${!isRegistering ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setIsRegistering(false);
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegistering}
            className={`auth-tab ${isRegistering ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setIsRegistering(true);
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
          {isRegistering && (
            <div className="auth-field">
              <label htmlFor="name" className="auth-label">
                Name
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="name"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="student@autuni.ac.nz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="canvas-access-token" className="auth-label">
                Canvas access token
              </label>
              <span className="auth-label-tag">
                {isRegistering ? 'Required' : 'Optional if saved'}
              </span>
            </div>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                  <path d="m21 2-9.6 9.6" />
                  <circle cx="7.5" cy="15.5" r="5.5" />
                </svg>
              </span>
              <input
                id="canvas-access-token"
                type="password"
                className="auth-input"
                placeholder="Paste Canvas API token"
                value={canvasAccessToken}
                onChange={(e) => setCanvasAccessToken(e.target.value)}
                autoComplete="off"
                required={isRegistering}
              />
            </div>

            {/* Canvas Token Help Accordion */}
            <div className="auth-token-accordion">
              <button
                type="button"
                className="auth-token-accordion__toggle"
                onClick={() => setShowTokenHelp((prev) => !prev)}
                aria-expanded={showTokenHelp}
              >
                <span>{showTokenHelp ? '▾' : '▸'}</span>
                <span>How to find your Canvas access token</span>
              </button>
              {showTokenHelp && (
                <div className="auth-token-accordion__content">
                  <p>Follow these quick steps to generate your Canvas API token:</p>
                  <ol className="auth-token-accordion__steps">
                    <li>Log in to your institution&apos;s Canvas LMS portal.</li>
                    <li>Click <strong>Account</strong> in the left navigation bar, then select <strong>Settings</strong>.</li>
                    <li>Scroll down to <strong>Approved Integrations</strong> and click <strong>+ New Access Token</strong>.</li>
                    <li>Enter &ldquo;AssignmentSync&rdquo; in the Purpose box and click <strong>Generate Token</strong>.</li>
                    <li>Copy the generated token string and paste it into the field above.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-input-action"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle visibility"
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9.88 9.88 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                    <path d="M2 2l20 20" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-btn-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                <span>{isRegistering ? 'Creating account...' : 'Logging in...'}</span>
              </>
            ) : (
              <span>{isRegistering ? 'Create account' : 'Log in'}</span>
            )}
          </button>
        </form>

        {/* Footer switch mode button */}
        <div className="auth-footer">
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => {
              setIsRegistering((current) => !current);
              setError(null);
            }}
          >
            {isRegistering
              ? 'Already have an account? Log in'
              : 'Need an account? Create one'}
          </button>
        </div>
      </div>
    </section>
  );
}

