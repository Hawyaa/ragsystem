'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Minimize2, Sparkles } from 'lucide-react';
import MessageBubble, { TypingIndicator } from './MessageBubble';
import EmailCaptureModal from './EmailCaptureModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isOutOfScope?: boolean;
  confidenceScore?: number;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your AI support assistant. Ask me anything and I'll do my best to help!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [lastOutOfScopeQuestion, setLastOutOfScopeQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Server error');

      // Store session ID
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          isOutOfScope: data.isOutOfScope,
          confidenceScore: data.confidenceScore,
        },
      ]);

      // Trigger email capture if out of scope
      if (data.isOutOfScope) {
        setLastOutOfScopeQuestion(userMessage);
        setTimeout(() => setShowEmailModal(true), 800);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (email: string) => {
    if (!sessionId) throw new Error('No session');

    const res = await fetch(`${API_URL}/api/chat/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userEmail: email,
        unansweredQuestion: lastOutOfScopeQuestion,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    // Add a confirmation message to chat
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Perfect! Our team has been notified and a confirmation was sent to **${email}**. You'll hear back within 24 hours. Is there anything else I can help you with?`,
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-40"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}
          aria-label="Open support chat"
        >
          <MessageSquare size={22} color="white" />
          {/* Pulse ring */}
          <span
            className="absolute w-full h-full rounded-full animate-ping"
            style={{ background: 'rgba(99,102,241,0.3)' }}
          />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 w-[380px] rounded-2xl flex flex-col overflow-hidden z-40 animate-fade-in"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            height: '560px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1e1b3a, #12111e)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.2)' }}
            >
              <Sparkles size={18} style={{ color: 'var(--accent-light)' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>AI Support</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Online</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isLatest={i === messages.length - 1}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex-shrink-0 px-3 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 resize-none text-sm outline-none bg-transparent"
                style={{
                  color: 'var(--text)',
                  maxHeight: '100px',
                  lineHeight: '1.5',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                style={{
                  background: input.trim() ? 'var(--accent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <Send size={14} color="white" />
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Press Enter to send
            </p>
          </div>
        </div>
      )}

      {/* Email capture modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
        unansweredQuestion={lastOutOfScopeQuestion}
      />
    </>
  );
}
