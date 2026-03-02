'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './PopoyChatbot.module.css';

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
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

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
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: data.error || 'Something went wrong. Please try again!' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Network error. Please check your connection and try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className={styles.bubble} onClick={() => setIsOpen((prev) => !prev)}>
        <Image src="/img/jepoy.png" alt="Popoy" width={56} height={56} />
      </div>

      <div className={`${styles.window} ${isOpen ? styles.windowActive : ''}`}>
        <div className={styles.header}>
          <h3>Popoy AI</h3>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="Close chat">
            &times;
          </button>
        </div>

        <div className={styles.messages} ref={messagesRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className={`${styles.message} ${styles.bot} ${styles.loading}`}>
              Popoy is thinking...
            </div>
          )}
        </div>

        <div className={styles.inputArea}>
          <input
            className={styles.input}
            type="text"
            placeholder="Ask Popoy anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className={styles.sendBtn} onClick={sendMessage} disabled={loading} aria-label="Send message">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
