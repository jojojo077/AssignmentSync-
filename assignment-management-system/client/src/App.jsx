BREAK_THE_BUILD;

import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import router from './router';

/**
 * Root component. AuthProvider wraps the router so every route (and the
 * route guards in router.jsx) can read the current session via useAuth().
 */
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
