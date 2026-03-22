'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToUserGroups,
  subscribeToGroupMessages,
  createGroupChat,
  addMemberToGroup,
  removeMemberFromGroup,
  promoteToAdmin,
  demoteFromAdmin,
  deleteGroupChat,
  leaveGroupChat,
  sendGroupMessage,
  toggleGroupMessageReaction,
  pinGroupMessage,
  getUserRole,
  canManageGroup,
  canManageMembers,
  canPromoteToAdmin,
  canPinMessages,
  GroupChat,
  GroupMessage,
  GroupRole,
} from '@/lib/firebase/group-chats';
import { useAuthStore } from '@/store/auth-store';
import { filterProfanity } from '@/lib/utils';
import { GroupModalData } from '../types';

export function useGroups() {
  const { user, profile } = useAuthStore();

  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [activeGroupChat, setActiveGroupChat] = useState<GroupChat | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupModalData | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const [groupAvatar, setGroupAvatar] = useState('');
  const [groupAvatarSource, setGroupAvatarSource] = useState('');
  const [activeGroupReactionMessageId, setActiveGroupReactionMessageId] = useState<string | null>(null);
  const [showGroupFullReactionPicker, setShowGroupFullReactionPicker] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupMessagesUnsubRef = useRef<(() => void) | undefined>(undefined);
  const groupChatMessagesRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid;

  const setStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (msg) statusTimerRef.current = setTimeout(() => setStatusMsg(''), 6000);
  }, []);

  // Real-time group chats subscription
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUserGroups(uid, setGroupChats);
    return () => unsub();
  }, [uid]);

  // Sync activeGroupChat with updated groupChats data
  useEffect(() => {
    if (activeGroupChat && groupChats.length > 0) {
      const updatedGroup = groupChats.find(g => g.id === activeGroupChat.id);
      if (updatedGroup && JSON.stringify(updatedGroup) !== JSON.stringify(activeGroupChat)) {
        setActiveGroupChat(updatedGroup);
      }
    }
  }, [groupChats, activeGroupChat?.id]);

  // Group chat messages listener
  useEffect(() => {
    groupMessagesUnsubRef.current?.();
    groupMessagesUnsubRef.current = undefined;

    if (!activeGroupChat || !uid) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setGroupMessages([]), 0);
      return;
    }

    const unsub = subscribeToGroupMessages(activeGroupChat.id, (messages) => {
      setGroupMessages(messages);
      setTimeout(() => {
        if (groupChatMessagesRef.current) groupChatMessagesRef.current.scrollTop = groupChatMessagesRef.current.scrollHeight;
      }, 50);
    });

    groupMessagesUnsubRef.current = unsub;
    return () => { groupMessagesUnsubRef.current?.(); groupMessagesUnsubRef.current = undefined; };
  }, [activeGroupChat, uid]);

  useEffect(() => {
    return () => { groupMessagesUnsubRef.current?.(); };
  }, []);

  const handleCreateGroup = async () => {
    if (!uid || !profile) return;
    const nameInput = (document.getElementById('groupName') as HTMLInputElement)?.value?.trim();
    const descInput = (document.getElementById('groupDesc') as HTMLTextAreaElement)?.value?.trim();
    if (!nameInput) { setStatus('Please enter a group name.'); return; }
    if (selectedFriendsForGroup.length < 1) { setStatus('Please select at least one friend.'); return; }
    try {
      await createGroupChat(uid, profile.username, profile.photoURL, nameInput, selectedFriendsForGroup, descInput, groupAvatar);
      setShowCreateGroupModal(false); setSelectedFriendsForGroup([]); setGroupAvatar('');
      setStatus('Group created successfully!');
    } catch (e) { console.error('[CreateGroup] Failed:', e); setStatus('Failed to create group.'); }
  };

  const handleSendGroupMessage = async () => {
    if (!uid || !profile || !activeGroupChat) return;
    const text = groupMessageText.trim();
    if (!text) return;
    const filteredText = filterProfanity(text);
    setGroupMessageText('');
    try {
      await sendGroupMessage(activeGroupChat.id, uid, profile.username, profile.photoURL, filteredText);
    } catch (e) {
      console.error('[SendGroupMessage] Failed:', e);
      setGroupMessageText(text);
      setStatus("Couldn't send message.");
    }
  };

  const handleToggleGroupReaction = async (message: GroupMessage, emoji: string) => {
    if (!uid || !activeGroupChat) return;
    try { await toggleGroupMessageReaction(activeGroupChat.id, message.id, uid, emoji); } catch (e) { console.error("[GroupReaction] Failed:", e); }
  };

  const handlePinGroupMessage = async (message: GroupMessage) => {
    if (!activeGroupChat) return;
    try { await pinGroupMessage(activeGroupChat.id, message.id, !message.isPinned); } catch (e) { console.error("[PinGroup] Failed:", e); }
  };

  const handleAddMemberToGroup = async (memberUid: string) => {
    if (!uid || !profile || !activeGroupChat) return;
    try {
      await addMemberToGroup(activeGroupChat.id, memberUid, profile.username, uid);
      setStatus('Member added successfully!');
    } catch (e) { console.error('[AddMember] Failed:', e); setStatus('Failed to add member.'); }
  };

  const handleRemoveMemberFromGroup = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) return;
    try {
      await removeMemberFromGroup(activeGroupChat.id, memberUid, memberUsername);
      setStatus(`${memberUsername} removed.`);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string })?.code;
      console.error('[RemoveMember] Failed:', e);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Make sure you are a member of this group.');
      } else {
        setStatus('Failed to remove member.');
      }
      throw e;
    }
  };

  const handlePromoteToAdmin = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) return;
    try {
      await promoteToAdmin(activeGroupChat.id, memberUid);
      setStatus(`${memberUsername} promoted to admin.`);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string })?.code;
      console.error('[PromoteToAdmin] Failed:', e);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Only creators can promote members.');
      } else {
        setStatus('Failed to promote.');
      }
      throw e;
    }
  };

  const handleDemoteFromAdmin = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) return;
    try {
      await demoteFromAdmin(activeGroupChat.id, memberUid);
      setStatus(`${memberUsername} is now a member.`);
    } catch (e: unknown) {
      const errorCode = (e as { code?: string })?.code;
      console.error('[DemoteFromAdmin] Failed:', e);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Only creators can demote admins.');
      } else {
        setStatus('Failed to remove admin role.');
      }
      throw e;
    }
  };

  const handleLeaveGroup = async () => {
    if (!uid || !profile || !activeGroupChat) return;
    if (!window.confirm(`Leave ${activeGroupChat.name}?`)) return;
    try {
      await leaveGroupChat(activeGroupChat.id, uid, profile.username);
      setActiveGroupChat(null); setGroupMessages([]); setShowGroupModal(false); setGroupModalData(null);
      setStatus('You left the group.');
    } catch (e) { console.error('[LeaveGroup] Failed:', e); setStatus('Failed to leave group.'); }
  };

  const handleDeleteGroup = async () => {
    if (!uid || !activeGroupChat) return;
    if (!window.confirm(`Delete ${activeGroupChat.name}? This cannot be undone.`)) return;
    try {
      await deleteGroupChat(activeGroupChat.id);
      setActiveGroupChat(null); setGroupMessages([]); setShowGroupModal(false); setGroupModalData(null);
      setStatus('Group deleted.');
    } catch (e) { console.error('[DeleteGroup] Failed:', e); setStatus('Failed to delete group.'); }
  };

  const openGroupChat = (group: GroupChat) => {
    setActiveGroupChat(group);
  };

  const getGroupMemberCount = (group: GroupChat): number => group.members?.length || 0;
  const getUserGroupRole = (group: GroupChat): GroupRole | null => uid ? getUserRole(group, uid) : null;

  return {
    groupChats,
    activeGroupChat,
    setActiveGroupChat,
    groupMessages,
    groupMessageText,
    setGroupMessageText,
    showCreateGroupModal,
    setShowCreateGroupModal,
    showGroupModal,
    setShowGroupModal,
    groupModalData,
    setGroupModalData,
    showAddMembersModal,
    setShowAddMembersModal,
    selectedFriendsForGroup,
    setSelectedFriendsForGroup,
    groupAvatar,
    setGroupAvatar,
    groupAvatarSource,
    setGroupAvatarSource,
    activeGroupReactionMessageId,
    setActiveGroupReactionMessageId,
    showGroupFullReactionPicker,
    setShowGroupFullReactionPicker,
    groupChatMessagesRef,
    statusMsg,
    setStatus,
    handleCreateGroup,
    handleSendGroupMessage,
    handleToggleGroupReaction,
    handlePinGroupMessage,
    handleAddMemberToGroup,
    handleRemoveMemberFromGroup,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleLeaveGroup,
    handleDeleteGroup,
    openGroupChat,
    getGroupMemberCount,
    getUserGroupRole,
    canManageGroup,
    canManageMembers,
    canPromoteToAdmin,
    canPinMessages,
  };
}
