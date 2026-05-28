'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Mail, CheckCircle, Clock, ExternalLink, User, Bot } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
const authHeaders = { Authorization: `Bearer ${ADMIN_TOKEN}` };

interface Escalation {
  id: string;
  user_email: string;
  reason: string;
  unanswered_question: string;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
  session_id: string;
  message_count: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/escalations?limit=50`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => { setEscalations(d.escalations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openEscalation = async (esc: Escalation) => {
    setSelected(esc);
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/api/escalations/${esc.id}`, { headers: authHeaders });
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav
        className="flex items-center gap-4 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <Link href="/admin">
          <button className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} /> Back
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
          <span className="font-bold">Escalations</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
          >
            {escalations.length}
          </span>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: escalation list */}
        <div
          className="w-80 flex-shrink-0 overflow-y-auto border-r"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Customers who asked questions outside the knowledge base.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : escalations.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No escalations yet.</p>
            </div>
          ) : (
            escalations.map(esc => (
              <button
                key={esc.id}
                onClick={() => openEscalation(esc)}
                className="w-full text-left px-4 py-4 border-b transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--border)',
                  background: selected?.id === esc.id ? 'rgba(245,158,11,0.06)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                      {esc.user_email}
                    </span>
                  </div>
                  {esc.email_sent ? (
                    <div className="flex items-center gap-1" style={{ color: '#10b981' }}>
                      <CheckCircle size={11} />
                      <span className="text-xs">Sent</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      <span className="text-xs">Pending</span>
                    </div>
                  )}
                </div>
                <p className="text-sm truncate mb-1" style={{ color: 'var(--text)' }}>
                  "{esc.unanswered_question}"
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(esc.created_at).toLocaleString()} · {esc.message_count} messages
                </p>
              </button>
            ))
          )}
        </div>

        {/* Right: escalation detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an escalation to view details</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-2xl">
              {/* Header */}
              <div
                className="rounded-xl p-5 mb-5"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                  <span className="font-bold text-sm" style={{ color: '#f59e0b' }}>Escalation Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Customer Email</p>
                    <a
                      href={`mailto:${selected.user_email}`}
                      className="font-semibold flex items-center gap-1"
                      style={{ color: 'var(--accent-light)' }}
                    >
                      {selected.user_email}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Email Notification</p>
                    <p className="font-medium" style={{ color: selected.email_sent ? '#10b981' : '#f59e0b' }}>
                      {selected.email_sent
                        ? `Sent ${selected.email_sent_at ? new Date(selected.email_sent_at).toLocaleString() : ''}`
                        : 'Not sent yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Escalated At</p>
                    <p style={{ color: 'var(--text)' }}>{new Date(selected.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Session ID</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{selected.session_id}</p>
                  </div>
                </div>
              </div>

              {/* Unanswered question */}
              <div
                className="rounded-xl p-4 mb-5"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#ef4444' }}>
                  Unanswered Question
                </p>
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  "{selected.unanswered_question}"
                </p>
              </div>

              {/* Reply button */}
              <a
                href={`mailto:${selected.user_email}?subject=Re: Your support question&body=Hi, following up on your question: "${selected.unanswered_question}"%0A%0A`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Mail size={14} /> Reply to Customer
              </a>

              {/* Full conversation */}
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>Full Conversation Transcript</h3>
              <div className="flex flex-col gap-3">
                {loadingMessages ? (
                  <div style={{ color: 'var(--text-muted)' }}>Loading messages...</div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--surface)', border: '1px solid var(--border)' }}
                      >
                        {msg.role === 'user' ? <User size={12} color="white" /> : <Bot size={12} style={{ color: 'var(--accent-light)' }} />}
                      </div>
                      <div className="max-w-[75%]">
                        <div
                          className="rounded-xl px-4 py-2.5 text-sm"
                          style={{
                            background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'var(--surface)',
                            color: 'var(--text)',
                            border: msg.role !== 'user' ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          {msg.content}
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
