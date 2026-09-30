import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * App shell shared by every route: the navbar plus a content area where
 * the matched child route is rendered via <Outlet />.
 */
export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
