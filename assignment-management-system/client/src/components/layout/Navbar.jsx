import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/search', label: 'Search' },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Derive display initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  return (
    <header className="navbar">
      <div className="navbar__left">
        <NavLink to="/" className="navbar__brand-container">
          <div className="navbar__brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <span className="navbar__brand">AssignmentSync</span>
        </NavLink>

        {isAuthenticated && (
          <nav className="navbar__links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  'navbar__link' + (isActive ? ' navbar__link--active' : '')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <div className="navbar__right">
        {isAuthenticated ? (
          <>
            <div className="navbar__user" title={`Logged in as ${user?.email || 'User'}`}>
              <div className="navbar__avatar">{initials}</div>
              <div className="navbar__user-details">
                <span className="navbar__user-name">{user?.name || 'Student'}</span>
                <span className="navbar__user-email">{user?.email || ''}</span>
              </div>
            </div>
            <button
              type="button"
              className="navbar__logout-btn"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <NavLink to="/login" className="btn btn--primary">
            Sign In
          </NavLink>
        )}
      </div>
    </header>
  );
}
