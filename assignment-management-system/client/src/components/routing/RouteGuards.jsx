import { Navigate } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import Login from '../../pages/Login';
import { useAuth } from '../../context/AuthContext';

/**
 * "/" shows the Dashboard when signed in, otherwise the Login page
 * (rendered in place rather than redirecting).
 */
export function IndexRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
}

/**
 * Guards a route: renders its children only when authenticated,
 * otherwise redirects to /login.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * /login - sends already-authenticated users back to the dashboard.
 */
export function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}
