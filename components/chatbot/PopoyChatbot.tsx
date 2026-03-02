'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  role: 'bot' | 'user';
  content: string;
}

export default function PopoyChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', content: "Hello! I'm Popoy. How can I help you in the lab today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok && data.response) {
        setMessages((prev) => [...prev, { role: 'bot', content: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: 'bot', content: data.error || 'Something went wrong. Please try again!' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', content: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Chat bubble toggle */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle Popoy AI chat"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1.5px solid var(--glass-border)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.18), var(--glow-accent)',
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full cursor-pointer hover:scale-110 transition-all duration-200 z-[1500] overflow-hidden p-0"
      >
        <Image src="/img/jepoy.png" alt="Popoy" width={56} height={56} className="w-full h-full object-cover" />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1.5px solid var(--glass-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--glass-border), var(--glow-accent)',
          }}
          className="fixed bottom-24 right-6 w-[340px] h-[480px] flex flex-col rounded-[20px] z-[1400] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          {/* Header */}
          <div
            style={{
              background: 'rgba(16,185,129,0.08)',
              borderBottom: '1px solid var(--glass-border)',
            }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                style={{ border: '1.5px solid var(--glass-border)' }}
                className="w-8 h-8 rounded-full overflow-hidden"
              >
                <Image src="/img/jepoy.png" alt="Popoy" width={32} height={32} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Popoy AI</h3>
                <p className="text-[10px]" style={{ color: 'var(--accent-color)' }}>Your lab assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{ color: 'var(--text-light)' }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={msg.role === 'user' ? {
                      background: 'var(--accent-gradient)',
                      color: '#fff',
                      boxShadow: 'var(--glow-accent)',
                    } : {
                      background: 'var(--bg-sidebar)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }}
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' ? 'self-end rounded-br-sm' : 'self-start rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em>{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                ))}
                {loading && (
                  <div
                    style={{
                      background: 'var(--bg-sidebar)',
                      color: 'var(--text-light)',
                      border: '1px solid var(--glass-border)',
                    }}
                    className="self-start rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm italic"
                  >
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input area */}
          <div
            style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}
            className="flex gap-2 p-3"
          >
            <input
              type="text"
              placeholder="Ask Popoy anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
              }}
              className="flex-1 min-w-0 rounded-[12px] px-4 py-2 text-sm placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--glow-accent)' }}
              className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center text-white transition-all hover:scale-105 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}