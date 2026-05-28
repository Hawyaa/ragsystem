'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, AlertTriangle, ChevronRight, Search, User, Bot } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
const authHeaders = { Authorization: `Bearer ${ADMIN_TOKEN}` };

interface Conversation {
  id: string;
  session_id: string;
  user_email: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  is_escalated: boolean;
  status: string;
  first_message: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  confidence_score: number | null;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/conversations?limit=50`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => { setConversations(d.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/api/conversations/${conv.id}`, { headers: authHeaders });
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setLoadingMessages(false);
    }
  };

  const filtered = conversations.filter(c =>
    c.first_message?.toLowerCase().includes(search.toLowerCase()) ||
    c.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.session_id.toLowerCase().includes(search.toLowerCase())
  );

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
          <MessageSquare size={18} style={{ color: 'var(--accent-light)' }} />
          <span className="font-bold">Conversations</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}
          >
            {conversations.length}
          </span>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: list */}
        <div
          className="w-80 flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: 'var(--text)' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No conversations found.</div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--border)',
                  background: selected?.id === conv.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {conv.is_escalated && <AlertTriangle size={12} style={{ color: '#f59e0b' }} />}
                    <span className="text-xs font-semibold" style={{ color: conv.is_escalated ? '#f59e0b' : 'var(--accent-light)' }}>
                      {conv.user_email || conv.session_id.slice(0, 12) + '...'}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm truncate" style={{ color: 'var(--text)' }}>
                  {conv.first_message || 'No messages'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{conv.message_count} messages</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: conv.status === 'escalated' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: conv.status === 'escalated' ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {conv.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right panel: message thread */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div
                className="px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User size={14} style={{ color: 'var(--accent-light)' }} />
                  <span className="font-semibold">{selected.user_email || 'Anonymous'}</span>
                  {selected.is_escalated && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
                    >
                      Escalated
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Session: {selected.session_id} · Started {new Date(selected.started_at).toLocaleString()}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                {loadingMessages ? (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading messages...</div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        {msg.role === 'user' ? <User size={12} color="white" /> : <Bot size={12} style={{ color: 'var(--accent-light)' }} />}
                      </div>
                      <div className={`max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
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
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                          {msg.confidence_score != null && msg.role === 'assistant' && (
                            <> · {Math.round(msg.confidence_score * 100)}% confidence</>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
