'use client';

import { useState } from 'react';

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage("You're in! Check your inbox.");
        setEmail('');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Try again.');
    }

    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 4000);
  };

  return (
    <div className="subscribe-form-wrap">
      {status === 'success' ? (
        <div className="subscribe-success">
          <span>&#10003; {message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="subscribe-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="subscribe-input"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="subscribe-btn"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe free'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="subscribe-error">{message}</p>
      )}
    </div>
  );
}
