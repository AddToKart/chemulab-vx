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
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

export type GroupRole = 'creator' | 'admin' | 'member';

export interface GroupMember {
  uid: string;
  username: string;
  photoURL?: string;
  role: GroupRole;
  joinedAt: Timestamp;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageFrom?: string;
  lastMessageFromUid?: string;
  members: GroupMember[];
}

export interface GroupMessage {
  id: string;
  text: string;
  fromUid: string;
  fromUsername: string;
  fromPhotoURL?: string;
  createdAt: Timestamp | null;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
}

export function getUserRole(group: GroupChat | null, uid: string): GroupRole | null {
  if (!group || !group.members) return null;
  const member = group.members.find((m) => m.uid === uid);
  return member?.role ?? null;
}

export function canManageGroup(role: GroupRole | null): boolean {
  return role === 'creator' || role === 'admin';
}

export function canManageMembers(role: GroupRole | null): boolean {
  return role === 'creator' || role === 'admin';
}

export function canPromoteToAdmin(role: GroupRole | null): boolean {
  return role === 'creator';
}

export function canDeleteGroup(role: GroupRole | null): boolean {
  return role === 'creator';
}

export function canPinMessages(role: GroupRole | null): boolean {
  return role === 'creator' || role === 'admin';
}

export async function createGroupChat(
  creatorUid: string,
  creatorUsername: string,
  creatorPhotoURL: string | undefined,
  name: string,
  memberIds: string[],
  description?: string,
  avatar?: string
): Promise<string> {
  const members: GroupMember[] = [
    {
      uid: creatorUid,
      username: creatorUsername,
      photoURL: creatorPhotoURL,
      role: 'creator',
      joinedAt: Timestamp.now(),
    },
  ];

  // Create memberUids array for querying
  const memberUids: string[] = [creatorUid];

  const batch = writeBatch(db);

  for (const uid of memberIds) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    const userData = userSnap.exists() ? userSnap.data() : {};
    members.push({
      uid,
      username: userData.username || uid,
      photoURL: userData.photoURL || '',
      role: 'member',
      joinedAt: Timestamp.now(),
    });
    memberUids.push(uid);
  }

  const groupRef = doc(collection(db, 'groupChats'));
  batch.set(groupRef, {
    name,
    description: description || '',
    avatar: avatar || '',
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    members,
    memberUids, // Store UIDs separately for querying
    lastMessage: '',
    lastMessageFrom: '',
    lastMessageFromUid: '',
  });

  await batch.commit();
  return groupRef.id;
}

export function subscribeToUserGroups(
  uid: string,
  callback: (groups: GroupChat[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Use memberUids field for querying (simpler array of strings)
  const q = query(
    collection(db, 'groupChats'),
    where('memberUids', 'array-contains', uid)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const groups: GroupChat[] = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data } as GroupChat;
      });

      groups.sort((a, b) => {
        const aTime = a.lastMessageAt ? (a.lastMessageAt as Timestamp).seconds : 0;
        const bTime = b.lastMessageAt ? (b.lastMessageAt as Timestamp).seconds : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });

      callback(groups);
    },
    (err) => {
      console.error('[GroupChats] subscribe error:', err);
      onError?.(err);
    }
  );

  return unsub;
}

export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, 'groupChats', groupId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const messages: GroupMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GroupMessage[];
      callback(messages);
    },
    (err) => {
      console.error('[GroupMessages] subscribe error:', err);
      onError?.(err);
    }
  );

  return unsub;
}

export async function addMemberToGroup(
  groupId: string,
  uid: string,
  inviterUsername: string,
  inviterUid?: string
): Promise<void> {
  // Check if user is already a member
  const groupSnap = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupSnap.exists()) throw new Error('Group not found');
  
  const groupData = groupSnap.data();
  const existingMembers: GroupMember[] = groupData.members || [];
  const existingUids: string[] = groupData.memberUids || [];
  
  // Check if already a member by UID - return silently instead of throwing
  if (existingUids.includes(uid) || existingMembers.some(m => m.uid === uid)) {
    console.log('[AddMember] User is already a member, skipping');
    return;
  }

  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  const newMember: GroupMember = {
    uid,
    username: userData.username || uid,
    photoURL: userData.photoURL || '',
    role: 'member',
    joinedAt: Timestamp.now(),
  };

  await updateDoc(doc(db, 'groupChats', groupId), {
    members: [...existingMembers, newMember],
    memberUids: arrayUnion(uid),
  });

  // Create notification only if we have a valid inviterUid
  if (inviterUid) {
    await addDoc(collection(db, 'notifications'), {
      type: 'groupInvite',
      fromUid: inviterUid,
      toUid: uid,
      fromUsername: inviterUsername,
      message: `You have been added to a group by ${inviterUsername}`,
      groupId,
      createdAt: serverTimestamp(),
    });
  }
}

export async function removeMemberFromGroup(
  groupId: string,
  uid: string,
  memberUsername: string
): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupSnap.exists()) return;

  const groupData = groupSnap.data();
  const members = (groupData.members || []).filter(
    (m: GroupMember) => m.uid !== uid
  );

  await updateDoc(doc(db, 'groupChats', groupId), { 
    members,
    memberUids: arrayRemove(uid), // Also remove from the UIDs array
  });
}

export async function promoteToAdmin(
  groupId: string,
  uid: string
): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupSnap.exists()) return;

  const groupData = groupSnap.data();
  const members: GroupMember[] = (groupData.members || []).map((m: GroupMember) =>
    m.uid === uid ? { ...m, role: 'admin' as GroupRole } : m
  );

  await updateDoc(doc(db, 'groupChats', groupId), { members });
}

export async function demoteFromAdmin(
  groupId: string,
  uid: string
): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupSnap.exists()) return;

  const groupData = groupSnap.data();
  const members: GroupMember[] = (groupData.members || []).map((m: GroupMember) =>
    m.uid === uid ? { ...m, role: 'member' as GroupRole } : m
  );

  await updateDoc(doc(db, 'groupChats', groupId), { members });
}

export async function updateGroupInfo(
  groupId: string,
  data: { name?: string; description?: string; avatar?: string }
): Promise<void> {
  await updateDoc(doc(db, 'groupChats', groupId), data);
}

export async function deleteGroupChat(groupId: string): Promise<void> {
  const groupSnap = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupSnap.exists()) return;

  const messagesSnap = await getDoc(
    doc(db, 'groupChats', groupId, 'messages', '__placeholder__')
  );

  const batch = writeBatch(db);
  batch.delete(doc(db, 'groupChats', groupId));

  await batch.commit();
}

export async function leaveGroupChat(
  groupId: string,
  uid: string,
  username: string
): Promise<void> {
  await removeMemberFromGroup(groupId, uid, username);
}

export async function sendGroupMessage(
  groupId: string,
  senderUid: string,
  senderUsername: string,
  senderPhotoURL: string | undefined,
  text: string
): Promise<void> {
  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'groupChats', groupId, 'messages'));
  batch.set(messageRef, {
    text,
    fromUid: senderUid,
    fromUsername: senderUsername,
    fromPhotoURL: senderPhotoURL || '',
    createdAt: serverTimestamp(),
    reactions: {},
    isPinned: false,
  });

  batch.update(doc(db, 'groupChats', groupId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastMessageFrom: senderUsername,
    lastMessageFromUid: senderUid,
  });

  await batch.commit();

  // Create notifications for all group members (except sender)
  const groupDoc = await getDoc(doc(db, 'groupChats', groupId));
  if (!groupDoc.exists()) return;

  const groupData = groupDoc.data();
  const memberUids = groupData.members.map((m: GroupMember) => m.uid).filter((uid: string) => uid !== senderUid);

  // Create notifications in parallel
  const notificationPromises = memberUids.map((toUid: string) => 
    addDoc(collection(db, 'notifications'), {
      type: 'groupMessage',
      fromUid: senderUid,
      toUid,
      fromUsername: senderUsername,
      fromPhotoURL: senderPhotoURL || '',
      message: text.length > 100 ? text.substring(0, 100) + '...' : text,
      groupId,
      groupName: groupData.name,
      createdAt: serverTimestamp(),
    })
  );

  await Promise.all(notificationPromises);
}

export async function toggleGroupMessageReaction(
  groupId: string,
  messageId: string,
  uid: string,
  emoji: string
): Promise<void> {
  const messageRef = doc(db, 'groupChats', groupId, 'messages', messageId);
  const messageSnap = await getDoc(messageRef);
  if (!messageSnap.exists()) return;

  const messageData = messageSnap.data();
  const currentReactions = messageData.reactions || {};
  const existingReaction = currentReactions[emoji] || [];

  const newReactions = { ...currentReactions };

  if (existingReaction.includes(uid)) {
    newReactions[emoji] = existingReaction.filter((id: string) => id !== uid);
    if (newReactions[emoji].length === 0) {
      delete newReactions[emoji];
    }
  } else {
    newReactions[emoji] = [...existingReaction, uid];
  }

  await updateDoc(messageRef, { reactions: newReactions });
}

export async function pinGroupMessage(
  groupId: string,
  messageId: string,
  isPinned: boolean
): Promise<void> {
  await updateDoc(doc(db, 'groupChats', groupId, 'messages', messageId), {
    isPinned,
  });
}
