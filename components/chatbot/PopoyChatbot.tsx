'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <Button
        variant="outline"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg border-2 border-primary/20 bg-background hover:bg-accent cursor-pointer hover:scale-105 transition-all z-[1500] overflow-hidden p-0"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle Popoy AI chat"
      >
        <Image src="/img/jepoy.png" alt="Popoy" width={56} height={56} className="w-full h-full object-cover" />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card
          className="fixed bottom-24 right-6 w-[340px] h-[480px] flex flex-col shadow-xl z-[1400] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-background">
                <Image src="/img/jepoy.png" alt="Popoy" width={32} height={32} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-sm">Popoy AI</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              &times;
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                      ? 'self-end bg-primary text-primary-foreground rounded-br-sm'
                      : 'self-start bg-muted text-foreground rounded-bl-sm'
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
                <div className="self-start bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm italic">
                  Popoy is thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          </div>

          {/* Input area */}
          <div className="flex gap-2 p-3 border-t bg-background">
            <Input
              className="flex-1"
              placeholder="Ask Popoy anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <Button
              size="icon"
              className="shrink-0 transition-opacity"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}