import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Assignments from './pages/Assignments';
import SearchAssignments from './pages/SearchAssignments';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { useAuth } from './context/AuthContext';

function IndexRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

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
        basename: '/assignment-management-system/',
});

export default router;
