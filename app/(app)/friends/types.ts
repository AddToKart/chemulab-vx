export interface FriendData {
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

export interface FriendRequest {
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

export interface ChatMessage {
  id: string;
  text: string;
  fromUid: string;
  fromEmail: string;
  fromUsername: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
}

export interface ModalData {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  joinDate?: string;
  discoveryCount?: number;
  chatId: string;
}

export interface GroupModalData {
  group: GroupChatType;
  mode: 'info' | 'members';
}

export interface GroupFormValues {
  name: string;
  description: string;
  avatar: string;
}

export interface CreateGroupFormValues extends GroupFormValues {
  selectedFriendIds: string[];
}

export type GroupChatType = import('@/lib/firebase/group-chats').GroupChat;
export type GroupMessageType = import('@/lib/firebase/group-chats').GroupMessage;
export type GroupRoleType = import('@/lib/firebase/group-chats').GroupRole;
