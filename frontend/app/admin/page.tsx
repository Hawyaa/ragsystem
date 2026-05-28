'use client';
import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock, BarChart3, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';

const authHeaders = {
  Authorization: `Bearer ${ADMIN_TOKEN}`,
};

interface Document {
  id: string;
  original_name: string;
  file_type: string;
  chunk_count: number;
  status: 'processing' | 'ready' | 'error';
  uploaded_at: string;
  metadata?: { error?: string };
}

interface Stats {
  total_conversations: string;
  escalated: string;
  active: string;
  last_24h: string;
  avg_messages: string;
}

export default function AdminPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    // Poll for document status updates
    pollRef.current = setInterval(fetchDocuments, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/upload/documents`, { headers: authHeaders });
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/conversations/stats/summary`, { headers: authHeaders });
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = ['.pdf', '.txt', '.docx', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadProgress(`❌ Unsupported file type. Use: ${allowed.join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading file...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadProgress(`✅ "${file.name}" uploaded! Processing in background...`);
      fetchDocuments();
    } catch (err: any) {
      setUploadProgress(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_name}"? This will also remove it from the AI knowledge base.`)) return;
    try {
      await fetch(`${API_URL}/api/upload/documents/${doc.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      ready: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Ready' },
      processing: { icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Processing...' },
      error: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Error' },
    };
    const s = map[status] || map.processing;
    const Icon = s.icon;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: s.bg, color: s.color }}
      >
        {status === 'processing' ? (
          <RefreshCw size={10} className="animate-spin" />
        ) : (
          <Icon size={10} />
        )}
        {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            <BarChart3 size={16} color="white" />
          </div>
          <span className="font-bold text-lg">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/conversations">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <MessageSquare size={14} /> Conversations
            </button>
          </Link>
          <Link href="/admin/escalations">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <AlertTriangle size={14} /> Escalations
            </button>
          </Link>
          <Link href="/">
            <button
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              View Site
            </button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Conversations', value: stats.total_conversations, icon: MessageSquare, color: '#6366f1' },
              { label: 'Escalated', value: stats.escalated, icon: AlertTriangle, color: '#f59e0b' },
              { label: 'Active Now', value: stats.active, icon: CheckCircle, color: '#10b981' },
              { label: 'Last 24h', value: stats.last_24h, icon: Clock, color: '#8b5cf6' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
                    <Icon size={14} style={{ color: card.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload section */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-bold mb-1">Upload Knowledge Base</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Upload documents that the AI will use to answer customer questions. Supported: PDF, DOCX, TXT, MD
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
              background: dragOver ? 'rgba(99,102,241,0.05)' : 'var(--surface-2)',
            }}
          >
            <Upload size={28} className="mx-auto mb-3" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-muted)' }} />
            <p className="font-semibold text-sm mb-1">Drop your file here or click to browse</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, TXT, MD — up to 20MB</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
              onChange={e => handleUpload(e.target.files)}
            />
          </div>

          {/* Upload status */}
          {uploadProgress && (
            <div
              className="mt-3 px-4 py-2.5 rounded-lg text-sm"
              style={{
                background: uploadProgress.startsWith('✅') ? 'rgba(16,185,129,0.1)' : uploadProgress.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                color: uploadProgress.startsWith('✅') ? '#10b981' : uploadProgress.startsWith('❌') ? '#ef4444' : 'var(--accent-light)',
              }}
            >
              {uploading && <RefreshCw size={14} className="animate-spin inline mr-2" />}
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Documents table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold">Knowledge Base ({documents.length} files)</h2>
            <button onClick={fetchDocuments} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={15} />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <FileText size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents uploaded yet.</p>
              <p className="text-xs mt-1">Upload your first document above to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['File', 'Type', 'Chunks', 'Status', 'Uploaded', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: i < documents.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text)' }}>
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="truncate max-w-[200px]" title={doc.original_name}>
                          {doc.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono uppercase"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                      >
                        {doc.file_type.replace('.', '')}
                      </span>
                    </td>
                    <td className="px-6 py-3" style={{ color: 'var(--text-muted)' }}>
                      {doc.chunk_count || '—'}
                    </td>
                    <td className="px-6 py-3">
                      {statusBadge(doc.status)}
                      {doc.status === 'error' && doc.metadata?.error && (
                        <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>
                          {doc.metadata.error.slice(0, 60)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
