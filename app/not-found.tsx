import { Logo } from './components/Logo';

export default function NotFound() {
  return (
    <main className="error-page">
      <div className="error-content">
        <div className="error-code">404</div>
        <h1 className="error-heading">Page not found</h1>
        <p className="error-description">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="error-actions">
          <a href="/" className="error-btn primary">Go home</a>
          <a href="/dashboard" className="error-btn secondary">Go to dashboard</a>
        </div>
      </div>
    </main>
  );
}
