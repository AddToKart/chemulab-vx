'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import { FriendData, FriendRequest, ModalData } from '../types';

function makeChatId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ChatData {
  lastMessage?: string;
  lastMessageFrom?: string;
  lastMessageAt?: { seconds: number; nanoseconds: number };
  unreadBy?: string[];
}

export function useFriends() {
  const { user, profile } = useAuthStore();

  const [friendProfiles, setFriendProfiles] = useState<FriendData[]>([]);
  const [chatDataMap, setChatDataMap] = useState<Record<string, ChatData>>({});
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const uid = user?.uid;

  const setStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (msg) statusTimerRef.current = setTimeout(() => setStatusMsg(''), 6000);
  }, []);

  // Real-time friends list profiles
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
    
    const unsubBlocked = onSnapshot(collection(db, 'users', uid, 'blocked'), (snap) => {
      setBlockedUsers(snap.docs.map(d => d.id));
    }, (err) => console.error('[Friends] blocked listener error:', err));

    return () => { unsub(); unsubBlocked(); };
  }, [uid]);

  // Real-time chats list for last messages
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
    const unsub = onSnapshot(q, (snap) => {
      const chatMap: Record<string, ChatData> = {};
      snap.docs.forEach(d => { chatMap[d.id] = d.data() as ChatData; });
      setChatDataMap(chatMap);
    }, (err) => console.error('[Friends] chats listener error:', err));
    return () => unsub();
  }, [uid]);

  // Merge profiles and chats into friends list
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
    merged.sort((a, b) => {
      const aTime = a.lastMessageAt ? (a.lastMessageAt as { seconds: number }).seconds : 0;
      const bTime = b.lastMessageAt ? (b.lastMessageAt as { seconds: number }).seconds : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.username.localeCompare(b.username);
    });
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setFriends(merged), 0);
  }, [friendProfiles, chatDataMap]);

  // Real-time friend requests
  useEffect(() => {
    if (!uid) return;
    const inQ = query(collection(db, 'friendRequests'), where('toUid', '==', uid));
    const unsubIn = onSnapshot(inQ, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)).filter((r) => !r.acceptedAt));
    }, (err) => console.error('[Friends] incoming requests error:', err));

    const outQ = query(collection(db, 'friendRequests'), where('fromUid', '==', uid));
    const unsubOut = onSnapshot(outQ, (snap) => {
      setOutgoingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)).filter((r) => !r.acceptedAt));
    }, (err) => console.error('[Friends] outgoing requests error:', err));

    return () => { unsubIn(); unsubOut(); };
  }, [uid]);

  const handleAddFriend = async (friendEmail: string, setFriendEmail: (v: string) => void) => {
    if (!uid || !profile) return;
    const email = friendEmail.trim().toLowerCase();
    if (!email) { setStatus('Please enter an email address.'); return; }
    if (!validateEmail(email)) { setStatus('Please enter a valid email address.'); return; }
    if (email === profile.email?.toLowerCase()) { setStatus("You can't add yourself as a friend."); return; }

    setStatus('Searching...');
    try {
      let targetUid: string | null = null;
      let targetUsername = '';
      let targetEmail = email;

      try {
        const usersQ = query(collection(db, 'users'), where('email', '==', email), limit(1));
        const usersSnap = await getDocs(usersQ);
        if (!usersSnap.empty) {
          const userData = usersSnap.docs[0].data();
          targetUid = userData.uid ?? usersSnap.docs[0].id;
          targetUsername = userData.username || email;
          targetEmail = userData.email || email;
        }
      } catch (e) { console.error('[AddFriend] users collection query failed:', e); }

      if (!targetUid) { setStatus('User not found. Make sure the email is correct.'); return; }
      if (blockedUsers.includes(targetUid)) { setStatus('You have blocked this user.'); return; }
      if (friends.find((f) => f.uid === targetUid)) { setStatus('You are already friends with this user.'); return; }
      if (outgoingRequests.find((r) => r.toUid === targetUid)) { setStatus('You already have a pending request.'); return; }

      const chatId = makeChatId(uid, targetUid);
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: uid, toUid: targetUid, fromEmail: profile.email || '', fromUsername: profile.username || '',
        toEmail: targetEmail, chatId, createdAt: serverTimestamp(),
      });

      setStatus(`Friend request sent to ${targetUsername}!`);
      setFriendEmail('');
    } catch (e) {
      console.error('[AddFriend] Failed to send request:', e);
      setStatus('Failed to send request.');
    }
  };

  const handleAccept = async (req: FriendRequest) => {
    if (!uid || !profile) return;
    try {
      const senderSnap = await getDoc(doc(db, 'users', req.fromUid));
      const senderData = senderSnap.exists() ? senderSnap.data() : {};
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'friends', req.fromUid), {
        uid: req.fromUid, email: req.fromEmail, username: senderData.username ?? req.fromUsername ?? req.fromEmail,
        photoURL: senderData.photoURL ?? '', chatId: req.chatId, createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', req.fromUid, 'friends', uid), {
        uid, email: profile.email || '', username: profile.username || '', photoURL: '', chatId: req.chatId, createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'chats', req.chatId), { participants: [uid, req.fromUid], createdAt: serverTimestamp() }, { merge: true });
      batch.delete(doc(db, 'friendRequests', req.id));
      await batch.commit();
    } catch (e) { console.error('[Accept] Failed:', e); }
  };

  const handleDecline = async (req: FriendRequest) => {
    try { await deleteDoc(doc(db, 'friendRequests', req.id)); } catch (e) { console.error('[Decline] Failed:', e); }
  };

  const handleCancel = async (req: FriendRequest) => {
    try { await deleteDoc(doc(db, 'friendRequests', req.id)); } catch (e) { console.error('[Cancel] Failed:', e); }
  };

  const viewFriendProfile = async (friend: FriendData) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', friend.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      let joinDate = 'Unknown';
      const regDate = userData.registrationDate || userData.createdAt;
      if (regDate) {
        if (typeof regDate === 'string') joinDate = new Date(regDate).toLocaleDateString();
        else if (regDate.seconds) joinDate = new Date(regDate.seconds * 1000).toLocaleDateString();
      }
      let discoveryCount = 0;
      try {
        const progressSnap = await getDoc(doc(db, 'progress', friend.uid));
        if (progressSnap.exists()) {
          const pData = progressSnap.data();
          discoveryCount = pData.discoveryCount ?? pData.totalDiscoveries ?? (Array.isArray(pData.discoveries) ? pData.discoveries.length : 0);
        }
      } catch { /* best-effort */ }
      setModalData({
        uid: friend.uid, username: userData.username ?? friend.username, email: userData.email ?? friend.email,
        photoURL: userData.photoURL ?? friend.photoURL, joinDate, discoveryCount, chatId: friend.chatId,
      });
      setModalVisible(true);
    } catch { /* best-effort */ }
  };

  const handleUnfriend = async (activeChatUid?: string, setActiveChat?: (v: null) => void, setMessages?: (v: []) => void) => {
    if (!uid || !modalData) return;
    if (!window.confirm(`Are you sure you want to unfriend ${modalData.username}?`)) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', uid, 'friends', modalData.uid));
      batch.delete(doc(db, 'users', modalData.uid, 'friends', uid));
      batch.delete(doc(db, 'chats', modalData.chatId));
      await batch.commit();
      if (activeChatUid === modalData.uid) { setActiveChat?.(null); setMessages?.([]); }
      setModalVisible(false); setModalData(null);
    } catch (e) { console.error('[Unfriend] Failed:', e); }
  };

  const handleBlock = async () => {
    if (!uid || !modalData) return;
    if (!window.confirm(`Are you sure you want to block ${modalData.username}?`)) return;
    try {
      await setDoc(doc(db, 'users', uid, 'blocked', modalData.uid), {
        uid: modalData.uid, email: modalData.email, username: modalData.username, blockedAt: serverTimestamp(),
      });
      setModalVisible(false); setModalData(null);
      setStatus(`Blocked ${modalData.username}.`);
    } catch (e) { console.error('[Block] Failed:', e); setStatus('Failed to block user.'); }
  };

  const handleUnblock = async () => {
    if (!uid || !modalData) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'blocked', modalData.uid));
      setModalVisible(false); setModalData(null);
      setStatus(`Unblocked ${modalData.username}.`);
    } catch (e) { console.error('[Unblock] Failed:', e); setStatus('Failed to unblock user.'); }
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    statusMsg,
    setStatus,
    modalVisible,
    setModalVisible,
    modalData,
    setModalData,
    handleAddFriend,
    handleAccept,
    handleDecline,
    handleCancel,
    viewFriendProfile,
    handleUnfriend,
    handleBlock,
    handleUnblock,
  };
}
