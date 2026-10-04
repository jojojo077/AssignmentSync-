import { NavLink } from 'react-router-dom';

// Top-level navigation entries. `end` stops "/" matching every route as active.
const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/calendar', label: 'Calendar' },
    { to: '/assignments', label: 'Workload Summary' },
    { to: '/search', label: 'Search'},
];

/**
 * Top navigation bar. NavLink applies the active modifier class to the
 * link for the current route.
 */
export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__brand">Assignment Manager</div>
      <nav className="navbar__links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
