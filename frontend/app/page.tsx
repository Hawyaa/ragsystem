import ChatWidget from '@/components/ChatWidget';

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: 'var(--bg)' }}
    >
      {/* Demo page content */}
      <div className="text-center max-w-2xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: 'var(--accent-light)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          AI Support is active
        </div>

        <h1
          className="text-5xl font-black mb-4 tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #f1f0ff 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          How can we help you?
        </h1>

        <p className="text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
          Our AI assistant is ready to answer your questions instantly. Click the chat button in the bottom right corner to get started.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-8">
          {[
            { icon: '⚡', title: 'Instant Answers', desc: 'Get answers in seconds, 24/7' },
            { icon: '🎯', title: 'High Accuracy', desc: 'Powered by your knowledge base' },
            { icon: '🔗', title: 'Human Fallback', desc: 'We escalate when needed' },
          ].map(card => (
            <div
              key={card.title}
              className="rounded-xl p-4 text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{card.title}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
            </div>
          ))}
        </div>

        <a
          href="/admin"
          className="text-sm underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Admin Dashboard →
        </a>
      </div>

      {/* The chat widget */}
      <ChatWidget />
    </main>
  );
}
