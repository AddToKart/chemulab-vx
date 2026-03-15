'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile, SmilePlus, Pin } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  limit,
  updateDoc,
  arrayRemove,
  orderBy,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import { filterProfanity, cn } from '@/lib/utils';


/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FriendData {
  uid: string;
  email: string;
  username: string;
  photoURL?: string;
  chatId: string;
  createdAt?: unknown;
  lastMessage?: string;
  lastMessageFrom?: string;
  lastMessageAt?: unknown;
  unreadBy?: string[];
}

interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromEmail: string;
  fromUsername: string;
  toEmail: string;
  chatId: string;
  createdAt?: unknown;
  acceptedAt?: unknown;
}

interface ChatMessage {
  id: string;
  text: string;
  fromUid: string;
  fromEmail: string;
  fromUsername: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
}

interface ModalData {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  joinDate?: string;
  discoveryCount?: number;
  chatId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeChatId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatTime(ts: { seconds: number; nanoseconds: number } | null | undefined): string {
  if (!ts || !ts.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FriendsPage() {
  const { user, profile } = useAuthStore();

  /* State */
  const [friendProfiles, setFriendProfiles] = useState<FriendData[]>([]);
  const [chatDataMap, setChatDataMap] = useState<Record<string, any>>({});
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [activeChat, setActiveChat] = useState<{
    friendUid: string;
    friendName: string;
    chatId: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showFullReactionPicker, setShowFullReactionPicker] = useState(false);
  const [showPinnedMessagesModal, setShowPinnedMessagesModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const setStatus = (msg: string) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (msg) statusTimerRef.current = setTimeout(() => setStatusMsg(''), 6000);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const [isInitializingChat, setIsInitializingChat] = useState(!!searchParams.get('chatId'));

  /* Refs */
  const messagesUnsubRef = useRef<(() => void) | undefined>(undefined);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  /* Derived */
  const uid = user?.uid;

  /* ---------------------------------------------------------------- */
  /*  Click outside handler for emoji pickers                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setActiveReactionMessageId(null);
        setShowFullReactionPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Real-time friends list profiles                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, 'users', uid, 'friends'), async (snap) => {
      const list: FriendData[] = [];
      for (const d of snap.docs) {
        const data = d.data() as FriendData;
        try {
          const profileSnap = await getDoc(doc(db, 'users', data.uid));
          if (profileSnap.exists()) {
            const p = profileSnap.data();
            data.username = p.username ?? data.username;
            data.photoURL = p.photoURL ?? data.photoURL;
          }
        } catch { /* keep existing data */ }
        list.push(data);
      }
      setFriendProfiles(list);
    }, (err) => console.error('[Friends] list listener error:', err));
    
    // Listen for blocked users
    const unsubBlocked = onSnapshot(collection(db, 'users', uid, 'blocked'), (snap) => {
      setBlockedUsers(snap.docs.map(d => d.id));
    }, (err) => console.error('[Friends] blocked listener error:', err));

    return () => { unsub(); unsubBlocked(); };
  }, [uid]);

  /* ---------------------------------------------------------------- */
  /*  Real-time chats list for last messages                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
    const unsub = onSnapshot(q, (snap) => {
      const chatMap: Record<string, any> = {};
      snap.docs.forEach(d => {
        chatMap[d.id] = d.data();
      });
      console.log('[Friends] Chat listener updated. Total chats:', snap.docs.length, chatMap);
      setChatDataMap(chatMap);
    }, (err) => console.error('[Friends] chats listener error:', err));
    return () => unsub();
  }, [uid]);

  /* ---------------------------------------------------------------- */
  /*  Merge profiles and chats into friends list                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const merged = friendProfiles.map(friend => {
      const chat = chatDataMap[friend.chatId];
      if (chat) {
        return {
          ...friend,
          lastMessage: chat.lastMessage,
          lastMessageFrom: chat.lastMessageFrom,
          lastMessageAt: chat.lastMessageAt,
          unreadBy: chat.unreadBy || [],
        };
      }
      return friend;
    });

    // Sort by latest message, then by username
    merged.sort((a, b) => {
      const aTime = a.lastMessageAt ? (a.lastMessageAt as any).seconds : 0;
      const bTime = b.lastMessageAt ? (b.lastMessageAt as any).seconds : 0;
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      return a.username.localeCompare(b.username);
    });

    console.log('[Friends] Merged friends list', merged);
    setFriends(merged);
  }, [friendProfiles, chatDataMap]);



  /* ---------------------------------------------------------------- */
  /*  Real-time friend requests (pending only)                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!uid) return;

    const inQ = query(collection(db, 'friendRequests'), where('toUid', '==', uid));
    const unsubIn = onSnapshot(inQ, (snap) => {
      const reqs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FriendRequest))
        .filter((r) => !r.acceptedAt);
      setIncomingRequests(reqs);
    }, (err) => console.error('[Friends] incoming requests error:', err));

    const outQ = query(collection(db, 'friendRequests'), where('fromUid', '==', uid));
    const unsubOut = onSnapshot(outQ, (snap) => {
      const reqs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FriendRequest))
        .filter((r) => !r.acceptedAt);
      setOutgoingRequests(reqs);
    }, (err) => console.error('[Friends] outgoing requests error:', err));

    return () => { unsubIn(); unsubOut(); };
  }, [uid]);

  /* ---------------------------------------------------------------- */
  /*  Chat message listener                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    messagesUnsubRef.current?.();
    messagesUnsubRef.current = undefined;

    if (!activeChat || !uid) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChat.chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
      
      // Mark as read when viewing active chat
      updateDoc(doc(db, 'chats', activeChat.chatId), {
        unreadBy: arrayRemove(uid)
      }).catch((err) => console.error('[Chat] mark as read error:', err));

      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 50);
    }, (err) => console.error('[Chat] messages listener error:', err));

    messagesUnsubRef.current = unsub;
    return () => { messagesUnsubRef.current?.(); messagesUnsubRef.current = undefined; };
  }, [activeChat, uid]);

  useEffect(() => {
    return () => { messagesUnsubRef.current?.(); };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Add friend                                                       */
  /* ---------------------------------------------------------------- */

  const handleAddFriend = async () => {
    if (!uid || !profile) return;

    const email = friendEmail.trim().toLowerCase();
    if (!email) {
      setStatus('Please enter an email address.');
      return;
    }
    if (!validateEmail(email)) {
      setStatus('Please enter a valid email address.');
      return;
    }
    if (email === profile.email?.toLowerCase()) {
      setStatus("You can't add yourself as a friend.");
      return;
    }

    setStatus('Searching...');

    try {
      let targetUid: string | null = null;
      let targetUsername = '';
      let targetEmail = email;

      // Query users collection directly by email
      try {
        const usersQ = query(
          collection(db, 'users'),
          where('email', '==', email),
          limit(1),
        );
        const usersSnap = await getDocs(usersQ);
        if (!usersSnap.empty) {
          const userData = usersSnap.docs[0].data();
          targetUid = userData.uid ?? usersSnap.docs[0].id;
          targetUsername = userData.username || email;
          targetEmail = userData.email || email;
        }
      } catch (e) {
        console.error('[AddFriend] users collection query failed:', e);
      }

      if (!targetUid) {
        setStatus('User not found. Make sure the email is correct.');
        return;
      }

      // Check if user is blocked
      if (blockedUsers.includes(targetUid)) {
        setStatus('You have blocked this user. Unblock them in settings to send a friend request.');
        return;
      }

      // Check if already friends
      const existingFriend = friends.find((f) => f.uid === targetUid);
      if (existingFriend) {
        setStatus('You are already friends with this user.');
        return;
      }

      // Check if request already pending
      const existingOutgoing = outgoingRequests.find(
        (r) => r.toUid === targetUid,
      );
      if (existingOutgoing) {
        setStatus('You already have a pending request to this user.');
        return;
      }

      const chatId = makeChatId(uid, targetUid);

      await addDoc(collection(db, 'friendRequests'), {
        fromUid: uid,
        toUid: targetUid,
        fromEmail: profile.email || '',
        fromUsername: profile.username || '',
        toEmail: targetEmail,
        chatId,
        createdAt: serverTimestamp(),
      });

      setStatus(`Friend request sent to ${targetUsername}!`);
      setFriendEmail('');
    } catch (e) {
      console.error('[AddFriend] Failed to send request:', e);
      setStatus('Failed to send request. Please try again.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Accept — batch both sides + chat doc + delete request           */
  /* ---------------------------------------------------------------- */

  const handleAccept = async (req: FriendRequest) => {
    if (!uid || !profile) return;
    try {
      const senderSnap = await getDoc(doc(db, 'users', req.fromUid));
      const senderData = senderSnap.exists() ? senderSnap.data() : {};

      const batch = writeBatch(db);

      // Add sender → acceptor's friends list
      batch.set(doc(db, 'users', uid, 'friends', req.fromUid), {
        uid: req.fromUid,
        email: req.fromEmail,
        username: senderData.username ?? req.fromUsername ?? req.fromEmail,
        photoURL: senderData.photoURL ?? '',
        chatId: req.chatId,
        createdAt: serverTimestamp(),
      });

      // Add acceptor → sender's friends list (rule: friendId can write)
      batch.set(doc(db, 'users', req.fromUid, 'friends', uid), {
        uid,
        email: profile.email || '',
        username: profile.username || '',
        photoURL: '',
        chatId: req.chatId,
        createdAt: serverTimestamp(),
      });

      // Create chat document
      batch.set(
        doc(db, 'chats', req.chatId),
        { participants: [uid, req.fromUid], createdAt: serverTimestamp() },
        { merge: true },
      );

      // Delete the friend request — no more acceptedAt needed
      batch.delete(doc(db, 'friendRequests', req.id));

      await batch.commit();
    } catch (e) {
      console.error('[Accept] Failed to accept friend request:', e);
    }
  };

  const handleDecline = async (req: FriendRequest) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (e) {
      console.error('[Decline] Failed to decline request:', e);
    }
  };

  const handleCancel = async (req: FriendRequest) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (e) {
      console.error('[Cancel] Failed to cancel request:', e);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Open chat                                                        */
  /* ---------------------------------------------------------------- */

  const openChat = (friend: FriendData) => {
    setActiveChat({
      friendUid: friend.uid,
      friendName: friend.username,
      chatId: friend.chatId,
    });
  };

  const router = useRouter();

  // Handle direct chat redirection from URL (?chatId=...)
  // Note: We define openChat above so it's accessible here
  useEffect(() => {
    const targetChatId = searchParams.get('chatId');
    if (!targetChatId) {
      if (isInitializingChat) {
        setTimeout(() => setIsInitializingChat(false), 60);
      }
      return;
    }

    if (friends.length > 0) {
      const friend = friends.find(f => f.chatId === targetChatId);
      if (friend) {
        console.log('[Friends] Auto-opening chat from URL param:', targetChatId);
        // Set active chat directly instead of calling function to avoid state-in-effect warning
        setActiveChat({
          friendUid: friend.uid,
          friendName: friend.username,
          chatId: friend.chatId,
        });
        // Clean up the URL after opening
        const params = new URLSearchParams(searchParams.toString());
        params.delete('chatId');
        router.replace(`/friends${params.toString() ? `?${params.toString()}` : ''}`);
        
        // 60ms delay to let the state update before hiding the loader
        setTimeout(() => setIsInitializingChat(false), 60);
      } else {
        // Friend not found in list (maybe un-friended?), clear loader with delay
        setTimeout(() => setIsInitializingChat(false), 60);
      }
    }
  }, [searchParams, friends, router]);

  /* ---------------------------------------------------------------- */
  /*  Send message                                                     */
  /* ---------------------------------------------------------------- */

  const handleSendMessage = async () => {
    if (!uid || !profile || !activeChat) return;
    const text = messageText.trim();
    if (!text) return;

    // Check if we blocked them
    if (blockedUsers.includes(activeChat.friendUid)) {
      setStatus('You have blocked this user. Unblock them to send a message.');
      return;
    }

    // Apply profanity filter
    const filteredText = filterProfanity(text);

    setMessageText('');
    try {
      // Write the message
      await addDoc(collection(db, 'chats', activeChat.chatId, 'messages'), {
        text: filteredText,
        fromUid: uid,
        fromEmail: profile.email || '',
        fromUsername: profile.username || '',
        createdAt: serverTimestamp(),
      });

      // Update parent chat document so friends list can show last message
      await updateDoc(doc(db, 'chats', activeChat.chatId), {
        lastMessage: filteredText,
        lastMessageAt: serverTimestamp(),
        unreadBy: [activeChat.friendUid],
        lastMessageFrom: profile.username || '',
      });

      // Create a notification for the recipient
      try {
        const notifRef = await addDoc(collection(db, 'notifications'), {
          type: 'message',
          fromUid: uid,
          toUid: activeChat.friendUid,
          fromUsername: profile.username || profile.email || '',
          message: filteredText,
          chatId: activeChat.chatId,
          createdAt: serverTimestamp(),
        });
        console.log('[SendMessage] Notification created:', notifRef.id);
      } catch (notifErr: any) {
        console.error('[SendMessage] Notification creation FAILED:', notifErr);
        // Alert the user so we know exactly what is failing during testing
        window.alert(`Notification failed: ${notifErr.message}`);
      }
    } catch (e: any) {
      console.error('[SendMessage] Failed:', e);
      setMessageText(text);
      setStatus("Couldn't send message.");
      window.alert(`Message send failed: ${e.message}`);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Message actions (reactions, pinning)                             */
  /* ---------------------------------------------------------------- */

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!uid || !activeChat) return;

    const messageRef = doc(db, 'chats', activeChat.chatId, 'messages', message.id);
    const currentReactions = message.reactions || {};
    const existingReaction = currentReactions[emoji] || [];

    const newReactions = { ...currentReactions };
    
    if (existingReaction.includes(uid)) {
      // User is removing their reaction
      newReactions[emoji] = existingReaction.filter((id) => id !== uid);
      if (newReactions[emoji].length === 0) {
        delete newReactions[emoji];
      }
    } else {
      // User is adding a reaction
      newReactions[emoji] = [...existingReaction, uid];
    }

    try {
      await updateDoc(messageRef, { reactions: newReactions });
    } catch (e) {
      console.error("[Reaction] Failed to toggle reaction:", e);
      // Optional: revert UI state on failure
    }
  };

  const handlePinMessage = async (message: ChatMessage) => {
    if (!activeChat) return;
    const messageRef = doc(db, 'chats', activeChat.chatId, 'messages', message.id);
    try {
      await updateDoc(messageRef, { isPinned: !message.isPinned });
    } catch (e) {
      console.error("[Pin] Failed to pin message:", e);
    }
  };
  
  const PREDEFINED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  /* ---------------------------------------------------------------- */
  /*  Report message                                                   */
  /* ---------------------------------------------------------------- */

  const handleReportMessage = async (msg: ChatMessage) => {
    if (!uid || !profile) return;
    const reason = window.prompt(`Why are you reporting this message from ${msg.fromUsername}?\n"${msg.text}"`);
    if (!reason) return;

    try {
      await addDoc(collection(db, 'reports'), {
        reporterUid: uid,
        reporterUsername: profile.username,
        messageId: msg.id,
        messageText: msg.text,
        messageFromUid: msg.fromUid,
        messageFromUsername: msg.fromUsername,
        reason,
        timestamp: serverTimestamp(),
      });
      alert('Thank you. The message has been reported for review.');
    } catch (e) {
      console.error('[ReportMessage] Failed:', e);
      alert('Failed to report message. Please try again.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  View friend profile (modal)                                      */
  /* ---------------------------------------------------------------- */

  const viewFriendProfile = async (friend: FriendData) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', friend.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      let joinDate = 'Unknown';
      const regDate = userData.registrationDate || userData.createdAt;
      if (regDate) {
        if (typeof regDate === 'string') {
          joinDate = new Date(regDate).toLocaleDateString();
        } else if (regDate.seconds) {
          joinDate = new Date(regDate.seconds * 1000).toLocaleDateString();
        }
      }

      let discoveryCount = 0;
      try {
        const progressSnap = await getDoc(doc(db, 'progress', friend.uid));
        if (progressSnap.exists()) {
          const pData = progressSnap.data();
          discoveryCount =
            pData.discoveryCount ??
            pData.totalDiscoveries ??
            (Array.isArray(pData.discoveries) ? pData.discoveries.length : 0);
        }
      } catch {
        // best-effort
      }

      setModalData({
        uid: friend.uid,
        username: userData.username ?? friend.username,
        email: userData.email ?? friend.email,
        photoURL: userData.photoURL ?? friend.photoURL,
        joinDate,
        discoveryCount,
        chatId: friend.chatId,
      });
      setModalVisible(true);
    } catch {
      // best-effort
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Unfriend                                                         */
  /* ---------------------------------------------------------------- */

  const handleUnfriend = async () => {
    if (!uid || !modalData) return;
    const confirmed = window.confirm(
      `Are you sure you want to unfriend ${modalData.username}?`,
    );
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      // Delete from my friends list
      batch.delete(doc(db, 'users', uid, 'friends', modalData.uid));
      // Delete from their friends list (rule: friendId can write)
      batch.delete(doc(db, 'users', modalData.uid, 'friends', uid));
      // Delete chat
      batch.delete(doc(db, 'chats', modalData.chatId));
      await batch.commit();

      if (activeChat?.friendUid === modalData.uid) {
        setActiveChat(null);
        setMessages([]);
      }

      setModalVisible(false);
      setModalData(null);
    } catch (e) {
      console.error('[Unfriend] Failed:', e);
    }
  };

  const handleBlock = async () => {
    if (!uid || !modalData) return;
    const confirmed = window.confirm(
      `Are you sure you want to block ${modalData.username}? You won't receive their messages anymore.`,
    );
    if (!confirmed) return;

    try {
      // Only add to blocked list, preserve friend doc & chat history
      await setDoc(doc(db, 'users', uid, 'blocked', modalData.uid), {
        uid: modalData.uid,
        email: modalData.email,
        username: modalData.username,
        blockedAt: serverTimestamp(),
      });

      setModalVisible(false);
      setModalData(null);
      setStatus(`Blocked ${modalData.username}.`);
    } catch (e) {
      console.error('[Block] Failed:', e);
      setStatus('Failed to block user.');
    }
  };

  const handleUnblock = async () => {
    if (!uid || !modalData) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'blocked', modalData.uid));
      setModalVisible(false);
      setModalData(null);
      setStatus(`Unblocked ${modalData.username}.`);
    } catch (e) {
      console.error('[Unblock] Failed:', e);
      setStatus('Failed to unblock user.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render: loading / unauthenticated                                */
  /* ---------------------------------------------------------------- */

  if (!user) {
    return (
      <div className="flex gap-4 h-[calc(100vh-230px)] max-[900px]:flex-col max-[900px]:h-auto">
        <div className="w-[300px] max-[900px]:w-full flex flex-col gap-3 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] p-5 overflow-hidden">
          <p className="text-[var(--text-light)] text-sm text-center py-4">Please sign in to use Friends &amp; Chat.</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
return (
  <div className="flex gap-4 h-[calc(100vh-230px)]">
    {/* ==================== LEFT PANEL ==================== */}
    <div 
      className={cn(
        "w-[300px] flex flex-col gap-3 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] p-5 overflow-hidden",
        "max-[900px]:w-full transition-all duration-300",
        activeChat ? "max-[900px]:hidden" : "max-[900px]:flex"
      )}
    >
        <h3 className="font-bold text-[var(--text-main)] text-base">Friends</h3>
        {/* Add friend */}
        <div className="flex gap-2">
           <input
            type="email"
            placeholder="Friend's email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddFriend();
            }}
            className="flex-1 min-w-0 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
          />
          <button
            type="button"
            onClick={handleAddFriend}
            className="bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[10px] text-sm hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            Add
          </button>
        </div>

        {statusMsg && (
          <div className="text-xs text-[var(--accent-color)] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-[8px] px-3 py-1.5">
            {statusMsg}
          </div>
        )}

        {/* Friends list */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
          {friends.length === 0 && (
            <p className="text-[var(--text-light)] text-sm text-center py-4">
              No friends yet. Add someone by email!
            </p>
          )}
          {friends.map((friend) => (
            <div
              key={friend.uid}
              className={`flex items-center gap-3 p-3 rounded-[12px] border cursor-pointer transition-all${activeChat?.friendUid === friend.uid ? ' bg-[var(--bg-item-active)] border-[var(--accent-color)]/30' : ' border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)]'}`}
              onClick={() => openChat(friend)}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                {friend.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.photoURL}
                    alt={friend.username}
                    width={44}
                    height={44}
                  />
                ) : (
                  <Image
                    src="/img/default-avatar.png"
                    alt={friend.username}
                    width={44}
                    height={44}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{friend.username}</strong>
                {friend.lastMessage ? (
                  <span className={cn(
                    "text-xs truncate transition-colors",
                    (uid && friend.unreadBy?.includes(uid))
                      ? "text-[var(--text-main)] font-bold" 
                      : "text-[var(--text-light)]"
                  )}>
                    {friend.lastMessageFrom === profile?.username ? 'You' : friend.lastMessageFrom}: {friend.lastMessage}
                  </span>
                ) : (
                  <span className="text-[var(--text-light)] text-xs italic opacity-50">No messages yet</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pending requests */}
        <div className="shrink-0 max-h-[220px] overflow-y-auto space-y-2 border-t border-[var(--border-color)] pt-3">
          {incomingRequests.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)] mb-2">Incoming Requests</h4>
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 rounded-[12px] border border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)] cursor-pointer transition-all opacity-80"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                    <Image
                      src="/img/default-avatar.png"
                      alt={req.fromUsername}
                      width={44}
                      height={44}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{req.fromUsername}</strong>
                    <span className="text-[var(--text-light)] text-xs truncate">{req.fromEmail}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      onClick={() => handleAccept(req)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:bg-red-500/20 transition-colors cursor-pointer"
                      onClick={() => handleDecline(req)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {outgoingRequests.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)] mb-2">Outgoing Requests</h4>
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 rounded-[12px] border border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)] cursor-pointer transition-all opacity-80"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                    <Image
                      src="/img/default-avatar.png"
                      alt={req.toEmail}
                      width={44}
                      height={44}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{req.toEmail}</strong>
                    <span className="text-[var(--text-light)] text-xs truncate">Pending...</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] text-xs font-semibold px-2.5 py-1 rounded-[6px] hover:border-red-500/50 transition-colors cursor-pointer"
                      onClick={() => handleCancel(req)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ==================== RIGHT PANEL ==================== */}
      <div 
        className={cn(
          "flex-1 flex flex-col bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] overflow-hidden transition-all duration-300",
          !activeChat ? "max-[900px]:hidden" : "max-[900px]:flex"
        )}
      >
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] font-semibold text-[var(--text-main)]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveChat(null)}
                  className="hidden max-[900px]:flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-sidebar)] hover:bg-[var(--border-color)] transition-colors text-[var(--text-light)] cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <span>{activeChat.friendName}</span>
              </div>
      <button
                 type="button"
                 className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[var(--accent-color)] hover:bg-[rgba(16,185,129,0.2)] transition-colors cursor-pointer"
                 onClick={() => {
                   const friend = friends.find(
                     (f) => f.uid === activeChat.friendUid,
                   );
                   if (friend) viewFriendProfile(friend);
                 }}
                 title="View Profile"
               >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <circle cx="12" cy="12" r="10" />
                   <path d="M12 16v-4" />
                   <path d="M12 8h.01" />
                 </svg>
               </button>
               <button
                 type="button"
                 className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[var(--accent-color)] hover:bg-[rgba(16,185,129,0.2)] transition-colors cursor-pointer"
                 onClick={() => setShowPinnedMessagesModal(true)}
                 title="View Pinned Messages"
               >
                 <Pin size={18} />
               </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-5 flex flex-col gap-3"
              ref={chatMessagesRef}
            >
              {messages.length === 0 && (
                <p className="text-[var(--text-light)] text-sm text-center mt-8">
                  No messages yet. Say hello!
                </p>
              )}
              {messages.map((msg) => {
                // Ignore messages from people we've blocked that were sent AFTER we blocked them
                // (Optional: right now we just hide all messages from blocked users for simplicity, or we can show them since they are still friends)
                // Let's hide them for a true "block" feel.
                if (msg.fromUid !== uid && blockedUsers.includes(msg.fromUid)) {
                  return null;
                }
                return (
                  <div
                    key={msg.id}
                    className={`relative flex flex-col max-w-[70%] group${msg.fromUid === uid ? ' self-end items-end' : ' self-start items-start'}`}
                  >
                    <div className={cn(
                      "relative text-sm shadow-sm",
                      msg.fromUid === uid 
                        ? 'bg-[var(--accent-color)] text-white px-4 py-2.5 rounded-[16px] rounded-br-[4px]' 
                        : 'bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-[var(--border-color)] px-4 py-2.5 rounded-[16px] rounded-bl-[4px]',
                      msg.isPinned && 'ring-2 ring-amber-500/80' // Highlight for pinned messages
                    )}>
                      {msg.isPinned && <Pin size={12} className="absolute top-1.5 right-2.5 text-white/70" />}
                      {msg.text}
                      
                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {Object.entries(msg.reactions).map(([emoji, uids]) => (
                            uids.length > 0 && (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className={cn(
                                  "flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-all",
                                  uid && uids.includes(uid) 
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                                    : 'bg-black/20 border-white/20 hover:bg-black/40 text-white/80'
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold">{uids.length}</span>
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Actions Menu */}
                    <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-full bg-slate-800/80 border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      style={msg.fromUid === uid ? { left: '-3.5rem' } : { right: '-3.5rem' }}
                    >
                        <button
                          onClick={() => setActiveReactionMessageId(msg.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          title="React"
                        >
                          <SmilePlus size={16} />
                        </button>
                        <button
                          onClick={() => handlePinMessage(msg)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          title={msg.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin size={16} />
                        </button>
                    </div>

                    {/* Reaction Picker Popover */}
                    {activeReactionMessageId === msg.id && (
                      <div ref={reactionPickerRef} className="absolute bottom-full mb-2 z-50">
                          <div className="flex items-center gap-1 p-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-lg">
                            {PREDEFINED_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  handleToggleReaction(msg, emoji);
                                  setActiveReactionMessageId(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-xl hover:bg-slate-700 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => setShowFullReactionPicker(true)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors text-slate-300"
                            >
                              <Smile size={20}/>
                            </button>
                          </div>
                          {showFullReactionPicker && (
                            <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden border border-[var(--glass-border)]">
                              <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => {
                                  handleToggleReaction(msg, emojiData.emoji);
                                  setActiveReactionMessageId(null);
                                  setShowFullReactionPicker(false);
                                }}
                                theme={Theme.DARK}
                                open={showFullReactionPicker}
                              />
                            </div>
                          )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[var(--text-light)] text-[0.65rem]">
                        {msg.fromUsername}
                        {msg.createdAt ? ` · ${formatTime(msg.createdAt)}` : ''}
                      </span>
                      {msg.fromUid !== uid && (
                        <button 
                          onClick={() => handleReportMessage(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-500 hover:underline cursor-pointer font-medium"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="flex gap-3 p-4 border-t border-[var(--border-color)] relative">
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-[var(--text-light)] hover:text-[var(--text-main)] transition-colors p-2"
                >
                  <Smile size={24} />
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden border border-[var(--glass-border)]">
                    <EmojiPicker 
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        setMessageText(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      theme={Theme.DARK} // Assuming dark theme based on CSS vars, you can change to auto or light
                    />
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="bg-[var(--accent-color)] text-white w-10 h-10 rounded-[12px] flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-light)] text-sm">
            Select a friend to start chatting
          </div>
        )}
      </div>

      {/* ==================== MODAL ==================== */}
      {modalVisible && modalData && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalVisible(false);
              setModalData(null);
            }
          }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-8 relative">
            <button
              type="button"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
              onClick={() => {
                setModalVisible(false);
                setModalData(null);
              }}
            >
              &times;
            </button>

            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-[var(--accent-color)]/30">
              {modalData.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={modalData.photoURL}
                  alt={modalData.username}
                  width={80}
                  height={80}
                />
              ) : (
                <Image
                  src="/img/default-avatar.png"
                  alt={modalData.username}
                  width={80}
                  height={80}
                />
              )}
            </div>

            <h3 className="text-xl font-bold text-[var(--text-main)] text-center mb-1">{modalData.username}</h3>
            <p className="text-[var(--text-light)] text-sm text-center">{modalData.email}</p>

            <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-4 space-y-2 text-sm text-[var(--text-main)] my-5 border border-[var(--border-color)]">
              <div>
                <strong>Joined:</strong> {modalData.joinDate}
              </div>
              <div>
                <strong>Discoveries:</strong> {modalData.discoveryCount}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {blockedUsers.includes(modalData.uid) ? (
                <button
                  type="button"
                  className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                  onClick={handleUnblock}
                >
                  Unblock
                </button>
              ) : (
                <button
                  type="button"
                  className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  onClick={handleBlock}
                >
                  Block
                </button>
              )}
              <button
                type="button"
                className="flex-1 bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
                onClick={handleUnfriend}
              >
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}
      
       {/* ==================== PINNED MESSAGES MODAL ==================== */}
       {showPinnedMessagesModal && (
         <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]" onClick={() => setShowPinnedMessagesModal(false)}>
           <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-6 relative max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-[var(--text-main)]">Pinned Messages</h3>
               <button onClick={() => setShowPinnedMessagesModal(false)} className="text-[var(--text-light)] hover:text-red-500 transition-colors">&times;</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2">
               {messages.filter(m => m.isPinned).length === 0 ? (
                 <p className="text-[var(--text-light)] text-center py-8">No pinned messages in this chat.</p>
               ) : (
                 messages.filter(m => m.isPinned).map(msg => (
                   <div key={msg.id} className="p-3 bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-color)]">
                     <div className="flex justify-between items-start gap-2">
                       <div className="flex-1 min-w-0">
                         <span className="text-xs text-[var(--accent-color)] font-semibold">{msg.fromUsername}</span>
                         <p className="text-sm text-[var(--text-main)] truncate">{msg.text}</p>
                       </div>
                       <button 
                         onClick={() => handlePinMessage(msg)} 
                         className="text-[var(--text-light)] hover:text-[var(--accent-color)] flex-shrink-0"
                         title="Unpin"
                       >
                         <Pin size={16} className="fill-current" />
                       </button>
                     </div>
                     <span className="text-[0.6rem] text-[var(--text-light)] mt-1 block">
                       {msg.createdAt ? formatTime(msg.createdAt) : ''}
                     </span>
                   </div>
                 ))
               )}
             </div>
           </div>
         </div>
       )}
       
       {/* ==================== LOADING OVERLAY ==================== */}
       {isInitializingChat && (
        <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-center gap-4 bg-[#0f172a] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-emerald-500 animate-spin" />
          <span className="text-sm text-slate-100 opacity-60">Opening Chat…</span>
        </div>
      )}
    </div>
  );
}
