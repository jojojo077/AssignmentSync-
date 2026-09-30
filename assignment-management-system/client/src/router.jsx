import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Assignments from './pages/Assignments';
import SearchAssignments from './pages/SearchAssignments';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { useAuth } from './context/AuthContext';

/**
 * "/" shows the Dashboard when signed in, otherwise the Login page
 * (rendered in place rather than redirecting).
 */
function IndexRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
}

/**
 * Guards a route: renders its children only when authenticated,
 * otherwise redirects to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * /login - sends already-authenticated users back to the dashboard.
 */
function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

// All pages render inside Layout (navbar + content area).
const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <IndexRoute /> },
            { path: 'calendar', element: <ProtectedRoute><Calendar /></ProtectedRoute> },
            { path: 'search', element: <ProtectedRoute><SearchAssignments /></ProtectedRoute> },
            { path: 'assignments', element: <ProtectedRoute><Assignments /></ProtectedRoute> },
            { path: 'login', element: <LoginRoute /> },
            { path: '*', element: <NotFound /> },
        ], 
      },
    ],
    {
        // Tests run at the root; builds may be served from a sub-path (e.g. GitHub Pages).
        basename: import.meta.env.MODE === 'test' ? '/' : (import.meta.env.BASE_URL || '/'),
});

export default router;
