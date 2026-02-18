'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <div className="error-content">
        <div className="error-code">500</div>
        <h1 className="error-heading">Something went wrong</h1>
        <p className="error-description">
          An unexpected error occurred. Please try again.
        </p>
        <div className="error-actions">
          <button onClick={reset} className="error-btn primary">Try again</button>
          <a href="/" className="error-btn secondary">Go home</a>
        </div>
      </div>
    </main>
  );
}
