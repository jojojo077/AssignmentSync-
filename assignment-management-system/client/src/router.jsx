import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Calendar from './pages/Calendar';
import Assignments from './pages/Assignments';
import SearchAssignments from './pages/SearchAssignments';
import NotFound from './pages/NotFound';
import { IndexRoute, ProtectedRoute, LoginRoute } from './components/routing/RouteGuards';

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
