import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/assignments', label: 'Assignments' },
];

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
