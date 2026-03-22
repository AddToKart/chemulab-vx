'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  query,
  updateDoc,
  arrayRemove,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import { filterProfanity } from '@/lib/utils';
import { ChatMessage, FriendData } from '../types';
import { useSearchParams, useRouter } from 'next/navigation';

export function useChat() {
  const { user, profile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeChat, setActiveChat] = useState<{
    friendUid: string;
    friendName: string;
    chatId: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showFullReactionPicker, setShowFullReactionPicker] = useState(false);
  const [isInitializingChat, setIsInitializingChat] = useState(!!searchParams.get('chatId'));

  const messagesUnsubRef = useRef<(() => void) | undefined>(undefined);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid;

  // Chat message listener
  useEffect(() => {
    messagesUnsubRef.current?.();
    messagesUnsubRef.current = undefined;

    if (!activeChat || !uid) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setMessages([]), 0);
      return;
    }

    const q = query(collection(db, 'chats', activeChat.chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
      updateDoc(doc(db, 'chats', activeChat.chatId), { unreadBy: arrayRemove(uid) }).catch((err) => console.error('[Chat] mark as read error:', err));
      setTimeout(() => {
        if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }, 50);
    }, (err) => console.error('[Chat] messages listener error:', err));

    messagesUnsubRef.current = unsub;
    return () => { messagesUnsubRef.current?.(); messagesUnsubRef.current = undefined; };
  }, [activeChat, uid]);

  useEffect(() => {
    return () => { messagesUnsubRef.current?.(); };
  }, []);

  const openChat = (friend: FriendData) => {
    setActiveChat({ friendUid: friend.uid, friendName: friend.username, chatId: friend.chatId });
  };

  const handleSendMessage = async (blockedUsers: string[]) => {
    if (!uid || !profile || !activeChat) return;
    const text = messageText.trim();
    if (!text) return;
    if (blockedUsers.includes(activeChat.friendUid)) { return; }
    const filteredText = filterProfanity(text);
    setMessageText('');
    try {
      await addDoc(collection(db, 'chats', activeChat.chatId, 'messages'), {
        text: filteredText, fromUid: uid, fromEmail: profile.email || '', fromUsername: profile.username || '', createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', activeChat.chatId), {
        lastMessage: filteredText, lastMessageAt: serverTimestamp(), unreadBy: [activeChat.friendUid], lastMessageFrom: profile.username || '',
      });
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'message', fromUid: uid, toUid: activeChat.friendUid, fromUsername: profile.username || profile.email || '',
          message: filteredText, chatId: activeChat.chatId, createdAt: serverTimestamp(),
        });
      } catch (notifErr) { console.error('[SendMessage] Notification failed:', notifErr); }
    } catch (e) {
      console.error('[SendMessage] Failed:', e);
      setMessageText(text);
    }
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!uid || !activeChat) return;
    const messageRef = doc(db, 'chats', activeChat.chatId, 'messages', message.id);
    const currentReactions = message.reactions || {};
    const existingReaction = currentReactions[emoji] || [];
    const newReactions = { ...currentReactions };
    if (existingReaction.includes(uid)) {
      newReactions[emoji] = existingReaction.filter((id) => id !== uid);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    } else { newReactions[emoji] = [...existingReaction, uid]; }
    try { await updateDoc(messageRef, { reactions: newReactions }); } catch (e) { console.error("[Reaction] Failed:", e); }
  };

  const handlePinMessage = async (message: ChatMessage) => {
    if (!activeChat) return;
    try { await updateDoc(doc(db, 'chats', activeChat.chatId, 'messages', message.id), { isPinned: !message.isPinned }); } catch (e) { console.error("[Pin] Failed:", e); }
  };

  const handleReportMessage = async (msg: ChatMessage) => {
    if (!uid || !profile) return;
    const reason = window.prompt(`Why are you reporting this message from ${msg.fromUsername}?\n"${msg.text}"`);
    if (!reason) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterUid: uid, reporterUsername: profile.username, messageId: msg.id, messageText: msg.text,
        messageFromUid: msg.fromUid, messageFromUsername: msg.fromUsername, reason, timestamp: serverTimestamp(),
      });
      alert('Thank you. The message has been reported for review.');
    } catch (e) { console.error('[ReportMessage] Failed:', e); alert('Failed to report message.'); }
  };

  const PREDEFINED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  return {
    activeChat,
    setActiveChat,
    messages,
    messageText,
    setMessageText,
    showEmojiPicker,
    setShowEmojiPicker,
    activeReactionMessageId,
    setActiveReactionMessageId,
    showFullReactionPicker,
    setShowFullReactionPicker,
    isInitializingChat,
    setIsInitializingChat,
    chatMessagesRef,
    reactionPickerRef,
    openChat,
    handleSendMessage,
    handleToggleReaction,
    handlePinMessage,
    handleReportMessage,
    PREDEFINED_REACTIONS,
    router,
    searchParams,
  };
}
