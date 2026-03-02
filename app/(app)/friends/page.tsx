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
import styles from './page.module.css';

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
      <div className={styles.friendsPage}>
        <div className={styles.friendsPanel}>
          <p className={styles.muted}>Please sign in to use Friends &amp; Chat.</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className={styles.friendsPage}>
      {/* ==================== LEFT PANEL ==================== */}
      <div className={styles.friendsPanel}>
        <h3 className={styles.panelTitle}>Friends</h3>

        {/* Add friend */}
        <div className={styles.addFriend}>
          <input
            type="email"
            placeholder="Friend's email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddFriend();
            }}
          />
          <button type="button" onClick={handleAddFriend}>
            Add
          </button>
        </div>

        {statusMsg && <div className={styles.statusMsg}>{statusMsg}</div>}

        {/* Friends list */}
        <div className={styles.friendsList}>
          {friends.length === 0 && (
            <p className={styles.muted}>
              No friends yet. Add someone by email!
            </p>
          )}
          {friends.map((friend) => (
            <div
              key={friend.uid}
              className={`${styles.friend} ${
                activeChat?.friendUid === friend.uid ? styles.friendActive : ''
              }`}
              onClick={() => openChat(friend)}
            >
              <div className={styles.friendIcon}>
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
              <div className={styles.friendInfo}>
                <strong>{friend.username}</strong>
                <span className={styles.muted}>{friend.email}</span>
              </div>
              <button
                type="button"
                className={styles.viewBtn}
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
        <div className={styles.requestsSection}>
          {incomingRequests.length > 0 && (
            <>
              <h4>Incoming Requests</h4>
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`${styles.friend} ${styles.pendingRequest}`}
                >
                  <div className={styles.friendIcon}>
                    <Image
                      src="/img/default-avatar.png"
                      alt={req.fromUsername}
                      width={44}
                      height={44}
                    />
                  </div>
                  <div className={styles.friendInfo}>
                    <strong>{req.fromUsername}</strong>
                    <span className={styles.muted}>{req.fromEmail}</span>
                  </div>
                  <div className={styles.friendActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => handleAccept(req)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.declineBtn}
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
              <h4>Outgoing Requests</h4>
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`${styles.friend} ${styles.pendingRequest}`}
                >
                  <div className={styles.friendIcon}>
                    <Image
                      src="/img/default-avatar.png"
                      alt={req.toEmail}
                      width={44}
                      height={44}
                    />
                  </div>
                  <div className={styles.friendInfo}>
                    <strong>{req.toEmail}</strong>
                    <span className={styles.muted}>Pending...</span>
                  </div>
                  <div className={styles.friendActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
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
      <div className={styles.chatPanel}>
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className={styles.chatHeader}>
              <span>{activeChat.friendName}</span>
              <button
                type="button"
                className={styles.viewBtn}
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
              className={styles.chatMessages}
              ref={chatMessagesRef}
            >
              {messages.length === 0 && (
                <p className={styles.muted} style={{ textAlign: 'center' }}>
                  No messages yet. Say hello!
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.chatMessage} ${
                    msg.fromUid === uid ? styles.me : styles.them
                  }`}
                >
                  <div className={styles.chatMessageText}>{msg.text}</div>
                  <div className={styles.chatMessageMeta}>
                    {msg.fromUsername}
                    {msg.createdAt ? ` · ${formatTime(msg.createdAt)}` : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className={styles.chatInput}>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <button type="button" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className={styles.chatPlaceholder}>
            Select a friend to start chatting
          </div>
        )}
      </div>

      {/* ==================== MODAL ==================== */}
      {modalVisible && modalData && (
        <div
          className={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalVisible(false);
              setModalData(null);
            }
          }}
        >
          <div className={styles.modalContent}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => {
                setModalVisible(false);
                setModalData(null);
              }}
            >
              &times;
            </button>

            <div className={styles.profileIcon}>
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

            <h3>{modalData.username}</h3>
            <p className={styles.muted}>{modalData.email}</p>

            <div className={styles.statsBox}>
              <div>
                <strong>Joined:</strong> {modalData.joinDate}
              </div>
              <div>
                <strong>Discoveries:</strong> {modalData.discoveryCount}
              </div>
            </div>

            <button
              type="button"
              className={styles.unfriendBtn}
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
