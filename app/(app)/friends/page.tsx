'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';


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
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [activeChat, setActiveChat] = useState<{
    friendUid: string;
    friendName: string;
    chatId: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  /* Refs */
  const messagesUnsubRef = useRef<(() => void) | undefined>(undefined);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  /* Derived */
  const uid = user?.uid;

  /* ---------------------------------------------------------------- */
  /*  Load friends list                                                */
  /* ---------------------------------------------------------------- */

  const loadFriends = useCallback(async () => {
    if (!uid) return;
    const snap = await getDocs(collection(db, 'users', uid, 'friends'));
    const list: FriendData[] = [];
    for (const friendDoc of snap.docs) {
      const data = friendDoc.data() as FriendData;
      // Fetch latest profile info
      try {
        const profileSnap = await getDoc(doc(db, 'users', data.uid));
        if (profileSnap.exists()) {
          const p = profileSnap.data();
          data.username = p.username ?? data.username;
          data.photoURL = p.photoURL ?? data.photoURL;
        }
      } catch {
        // keep existing data
      }
      list.push(data);
    }
    setFriends(list);
  }, [uid]);

  /* ---------------------------------------------------------------- */
  /*  Real-time listeners for friend requests                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!uid) return;

    loadFriends();

    // Incoming requests
    const inQ = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', uid),
    );
    const unsubIn = onSnapshot(inQ, (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach((d) => {
        reqs.push({ id: d.id, ...d.data() } as FriendRequest);
      });
      setIncomingRequests(reqs);
    });

    // Outgoing requests
    const outQ = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', uid),
    );
    const unsubOut = onSnapshot(outQ, (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach((d) => {
        const req = { id: d.id, ...d.data() } as FriendRequest;
        reqs.push(req);
      });
      setOutgoingRequests(reqs);

      // Process accepted requests
      reqs.forEach(async (req) => {
        if (req.acceptedAt && uid && profile) {
          try {
            // Add recipient to sender's friend list
            const recipientSnap = await getDoc(doc(db, 'users', req.toUid));
            const recipientData = recipientSnap.exists() ? recipientSnap.data() : {};
            await setDoc(doc(db, 'users', uid, 'friends', req.toUid), {
              uid: req.toUid,
              email: req.toEmail,
              username: recipientData.username ?? req.toEmail,
              photoURL: recipientData.photoURL ?? '',
              chatId: req.chatId,
              createdAt: serverTimestamp(),
            });
            // Delete the request
            await deleteDoc(doc(db, 'friendRequests', req.id));
            loadFriends();
          } catch {
            // best-effort
          }
        }
      });
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [uid, profile, loadFriends]);

  /* ---------------------------------------------------------------- */
  /*  Chat message listener                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    // Cleanup previous listener
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = undefined;
    }

    if (!activeChat || !uid) {
      setMessages([]);
      return;
    }

    const { chatId, friendUid } = activeChat;

    // Primary: chats/{chatId}/messages
    const messagesQ = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    const unsub = onSnapshot(
      messagesQ,
      (snap) => {
        const msgs: ChatMessage[] = [];
        snap.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() } as ChatMessage);
        });
        setMessages(msgs);
        // Scroll to bottom
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
          }
        }, 50);
      },
      () => {
        // Fallback: users/{uid}/friends/{friendUid}/messages
        const fallbackQ = query(
          collection(db, 'users', uid, 'friends', friendUid, 'messages'),
          orderBy('createdAt', 'asc'),
        );
        const fallbackUnsub = onSnapshot(fallbackQ, (snap) => {
          const msgs: ChatMessage[] = [];
          snap.forEach((d) => {
            msgs.push({ id: d.id, ...d.data() } as ChatMessage);
          });
          setMessages(msgs);
          setTimeout(() => {
            if (chatMessagesRef.current) {
              chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
            }
          }, 50);
        });
        messagesUnsubRef.current = fallbackUnsub;
      },
    );

    messagesUnsubRef.current = unsub;

    return () => {
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
        messagesUnsubRef.current = undefined;
      }
    };
  }, [activeChat, uid]);

  /* ---------------------------------------------------------------- */
  /*  Cleanup on unmount                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
      }
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Add friend                                                       */
  /* ---------------------------------------------------------------- */

  const handleAddFriend = async () => {
    if (!uid || !profile) return;

    const email = friendEmail.trim().toLowerCase();
    if (!email) {
      setStatusMsg('Please enter an email address.');
      return;
    }
    if (!validateEmail(email)) {
      setStatusMsg('Please enter a valid email address.');
      return;
    }
    if (email === profile.email?.toLowerCase()) {
      setStatusMsg("You can't add yourself as a friend.");
      return;
    }

    setStatusMsg('Searching...');

    try {
      // Try indexed query first
      let targetUid: string | null = null;
      let targetUsername = '';
      let targetEmail = email;

      const usernamesQ = query(
        collection(db, 'usernames'),
        where('email', '==', email),
      );
      const usernamesSnap = await getDocs(usernamesQ);

      if (!usernamesSnap.empty) {
        const d = usernamesSnap.docs[0].data();
        targetUid = d.uid;
        targetUsername = usernamesSnap.docs[0].id || d.username || email;
        targetEmail = d.email || email;
      } else {
        // Fallback: scan all usernames docs
        const allSnap = await getDocs(collection(db, 'usernames'));
        allSnap.forEach((d) => {
          const data = d.data();
          if (data.email?.toLowerCase() === email) {
            targetUid = data.uid;
            targetUsername = d.id || data.username || email;
            targetEmail = data.email || email;
          }
        });
      }

      if (!targetUid) {
        setStatusMsg('User not found. Make sure the email is correct.');
        return;
      }

      // Check if already friends
      const existingFriend = friends.find((f) => f.uid === targetUid);
      if (existingFriend) {
        setStatusMsg('You are already friends with this user.');
        return;
      }

      // Check if request already pending
      const existingOutgoing = outgoingRequests.find(
        (r) => r.toUid === targetUid,
      );
      if (existingOutgoing) {
        setStatusMsg('You already have a pending request to this user.');
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

      setStatusMsg(`Friend request sent to ${targetUsername}!`);
      setFriendEmail('');
    } catch {
      setStatusMsg('Failed to send request. Please try again.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Accept / Decline / Cancel requests                               */
  /* ---------------------------------------------------------------- */

  const handleAccept = async (req: FriendRequest) => {
    if (!uid || !profile) return;
    try {
      // Add sender to my friends
      const senderSnap = await getDoc(doc(db, 'users', req.fromUid));
      const senderData = senderSnap.exists() ? senderSnap.data() : {};

      await setDoc(doc(db, 'users', uid, 'friends', req.fromUid), {
        uid: req.fromUid,
        email: req.fromEmail,
        username: senderData.username ?? req.fromUsername ?? req.fromEmail,
        photoURL: senderData.photoURL ?? '',
        chatId: req.chatId,
        createdAt: serverTimestamp(),
      });

      // Create chat doc
      await setDoc(
        doc(db, 'chats', req.chatId),
        { createdAt: serverTimestamp() },
        { merge: true },
      );

      // Mark as accepted
      await updateDoc(doc(db, 'friendRequests', req.id), {
        acceptedAt: serverTimestamp(),
      });

      loadFriends();
    } catch {
      // best-effort
    }
  };

  const handleDecline = async (req: FriendRequest) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch {
      // best-effort
    }
  };

  const handleCancel = async (req: FriendRequest) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch {
      // best-effort
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

  /* ---------------------------------------------------------------- */
  /*  Send message                                                     */
  /* ---------------------------------------------------------------- */

  const handleSendMessage = async () => {
    if (!uid || !profile || !activeChat) return;
    const text = messageText.trim();
    if (!text) return;

    const { chatId, friendUid } = activeChat;

    const payload = {
      text,
      fromUid: uid,
      fromEmail: profile.email || '',
      fromUsername: profile.username || '',
      createdAt: serverTimestamp(),
    };

    setMessageText('');

    try {
      // Write to chats/{chatId}/messages
      await addDoc(collection(db, 'chats', chatId, 'messages'), payload);

      // Local copy: users/{myUid}/friends/{friendUid}/messages
      try {
        await addDoc(
          collection(db, 'users', uid, 'friends', friendUid, 'messages'),
          payload,
        );
      } catch {
        // best-effort
      }

      // Mirror: users/{friendUid}/friends/{myUid}/messages
      try {
        await addDoc(
          collection(db, 'users', friendUid, 'friends', uid, 'messages'),
          payload,
        );
      } catch {
        // best-effort
      }
    } catch {
      // Restore message on failure
      setMessageText(text);
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
      // Delete my friend doc
      batch.delete(doc(db, 'users', uid, 'friends', modalData.uid));
      // Delete their friend doc
      batch.delete(doc(db, 'users', modalData.uid, 'friends', uid));
      // Delete chat doc
      batch.delete(doc(db, 'chats', modalData.chatId));
      await batch.commit();

      // Clear active chat if we were chatting with this friend
      if (activeChat?.friendUid === modalData.uid) {
        setActiveChat(null);
        setMessages([]);
      }

      setModalVisible(false);
      setModalData(null);
      loadFriends();
    } catch {
      // best-effort
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render: loading / unauthenticated                                */
  /* ---------------------------------------------------------------- */

  if (!user) {
    return (
      <div className="flex gap-4 h-[calc(100vh-130px)] max-[900px]:flex-col max-[900px]:h-auto">
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
    <div className="flex gap-4 h-[calc(100vh-130px)] max-[900px]:flex-col max-[900px]:h-auto">
      {/* ==================== LEFT PANEL ==================== */}
      <div className="w-[300px] max-[900px]:w-full flex flex-col gap-3 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] p-5 overflow-hidden">
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
                <span className="text-[var(--text-light)] text-xs truncate">{friend.email}</span>
              </div>
              <button
                type="button"
                className="text-[var(--accent-color)] text-xs font-semibold px-3 py-1 rounded-[8px] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.2)] transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  viewFriendProfile(friend);
                }}
              >
                View
              </button>
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
      <div className="flex-1 flex flex-col bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[20px] overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] font-semibold text-[var(--text-main)]">
              <span>{activeChat.friendName}</span>
              <button
                type="button"
                className="text-[var(--accent-color)] text-xs font-semibold px-3 py-1 rounded-[8px] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.2)] transition-colors cursor-pointer"
                onClick={() => {
                  const friend = friends.find(
                    (f) => f.uid === activeChat.friendUid,
                  );
                  if (friend) viewFriendProfile(friend);
                }}
              >
                View Profile
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[70%]${msg.fromUid === uid ? ' self-end items-end' : ' self-start items-start'}`}
                >
                  <div className={msg.fromUid === uid ? 'bg-[var(--accent-color)] text-white px-4 py-2.5 rounded-[16px] rounded-br-[4px] text-sm' : 'bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-[var(--border-color)] px-4 py-2.5 rounded-[16px] rounded-bl-[4px] text-sm'}>
                    {msg.text}
                  </div>
                  <div className="text-[var(--text-light)] text-[0.65rem] mt-1 px-1">
                    {msg.fromUsername}
                    {msg.createdAt ? ` · ${formatTime(msg.createdAt)}` : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-3 p-4 border-t border-[var(--border-color)]">
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

            <button
              type="button"
              className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-semibold px-6 py-2.5 rounded-[12px] hover:bg-red-500/20 transition-colors cursor-pointer"
              onClick={handleUnfriend}
            >
              Unfriend
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
