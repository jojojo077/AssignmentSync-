import { Link } from 'react-router-dom';

/**
 * Catch-all page for unknown routes.
 */
export default function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/">Back to dashboard</Link>
    </section>
  );
}
