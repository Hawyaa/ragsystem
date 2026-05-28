'use client';
import { Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isOutOfScope?: boolean;
  confidenceScore?: number;
}

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

// Very simple markdown renderer (no external deps)
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export default function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animationDelay: isLatest ? '0ms' : undefined }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'var(--surface-2)',
          border: isUser ? 'none' : '1px solid var(--border)',
        }}
      >
        {isUser ? (
          <User size={14} color="white" />
        ) : (
          <Bot size={14} style={{ color: 'var(--accent-light)' }} />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed prose-chat"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
              : 'var(--surface-2)',
            color: isUser ? 'white' : 'var(--text)',
            border: isUser ? 'none' : '1px solid var(--border)',
            borderTopLeftRadius: !isUser ? '4px' : undefined,
            borderTopRightRadius: isUser ? '4px' : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />

        {/* Confidence badge for assistant */}
        {!isUser && message.confidenceScore !== undefined && message.confidenceScore > 0 && (
          <div
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            {Math.round(message.confidenceScore * 100)}% match
          </div>
        )}
      </div>
    </div>
  );
}

// Typing indicator
export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <Bot size={14} style={{ color: 'var(--accent-light)' }} />
      </div>
      <div
        className="rounded-2xl rounded-tl-[4px] px-4 py-3 flex items-center gap-1.5"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent-light)' }} />
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent-light)' }} />
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent-light)' }} />
      </div>
    </div>
  );
}
