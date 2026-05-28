'use client';
import { useState } from 'react';
import { Mail, X, Send, Loader2 } from 'lucide-react';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  unansweredQuestion: string;
}

export default function EmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  unansweredQuestion,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onSubmit(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border animate-fade-in"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={18} />
        </button>

        <div className="p-6">
          {!sent ? (
            <>
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}
              >
                <Mail size={22} />
              </div>

              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                Connect with our team
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                We couldn't find that in our knowledge base. Leave your email and we'll personally follow up.
              </p>

              {/* The unanswered question */}
              <div
                className="rounded-lg p-3 mb-4 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', fontStyle: 'italic' }}
              >
                "{unansweredQuestion}"
              </div>

              {/* Email input */}
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all mb-1"
                style={{
                  background: 'var(--surface-2)',
                  border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                  color: 'var(--text)',
                }}
                autoFocus
              />
              {error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || !email}
                className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending...</>
                ) : (
                  <><Send size={16} /> Send to Support Team</>
                )}
              </button>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>You're all set!</h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                We've notified our team and sent a confirmation to
              </p>
              <p className="font-semibold text-sm mb-4" style={{ color: 'var(--accent-light)' }}>{email}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Our team usually responds within 24 hours.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
