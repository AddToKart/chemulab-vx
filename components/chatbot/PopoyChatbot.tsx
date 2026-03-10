'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { filterProfanity } from '@/lib/utils';

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

    // Apply profanity filter
    const filteredText = filterProfanity(text);

    const userMessage: ChatMessage = { role: 'user', content: filteredText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: filteredText }),
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full cursor-pointer hover:scale-110 transition-all duration-300 z-[1500] overflow-hidden p-0 glass-panel border-emerald-500/30"
      >
        <Image src="/img/jepoy.png" alt="Popoy" width={56} height={56} className="w-full h-full object-cover" />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col rounded-[24px] z-[1400] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 glass-panel"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-emerald-500/5"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/20 shadow-inner"
              >
                <Image src="/img/jepoy.png" alt="Popoy" width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-[var(--text-main)]">Popoy AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-medium text-emerald-500/80">Online Assistant</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xl text-[var(--text-light)] hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-hidden bg-black/5 dark:bg-white/5">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 p-5">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'self-end bg-[var(--accent-gradient)] text-white rounded-br-none shadow-emerald-500/20' 
                        : 'self-start bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-white/10 rounded-bl-none backdrop-blur-md'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-emerald-600 dark:text-emerald-400">{children}</strong>,
                          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
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
                    className="self-start rounded-2xl rounded-bl-none px-4 py-3 bg-[var(--bg-sidebar)] border border-white/10 backdrop-blur-md"
                  >
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input area */}
          <div
            className="p-4 bg-white/5 border-t border-white/10"
          >
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask Popoy anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 min-w-0 bg-black/10 dark:bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-light)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="shrink-0 w-10 h-10 rounded-xl bg-[var(--accent-gradient)] flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current transform rotate-45 -translate-y-0.5 -translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}