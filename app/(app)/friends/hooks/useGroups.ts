'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  canDeleteGroup,
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
import { CreateGroupFormValues, GroupModalData } from '../types';

export function useGroups() {
  const { user, profile } = useAuthStore();

  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [activeGroupChatId, setActiveGroupChatId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupModalData | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [activeGroupReactionMessageId, setActiveGroupReactionMessageId] = useState<string | null>(null);
  const [showGroupFullReactionPicker, setShowGroupFullReactionPicker] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupMessagesUnsubRef = useRef<(() => void) | undefined>(undefined);
  const groupChatMessagesRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid;
  const activeGroupChat = activeGroupChatId
    ? groupChats.find((group) => group.id === activeGroupChatId) ?? null
    : null;

  const setActiveGroupChat = useCallback((group: GroupChat | null) => {
    setActiveGroupChatId(group?.id ?? null);
  }, []);

  const setStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    if (msg) {
      statusTimerRef.current = setTimeout(() => setStatusMsg(''), 6000);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeToUserGroups(uid, setGroupChats);
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    groupMessagesUnsubRef.current?.();
    groupMessagesUnsubRef.current = undefined;

    if (!activeGroupChatId || !uid) {
      setTimeout(() => setGroupMessages([]), 0);
      return;
    }

    const unsubscribe = subscribeToGroupMessages(activeGroupChatId, (messages) => {
      setGroupMessages(messages);
      setTimeout(() => {
        if (groupChatMessagesRef.current) {
          groupChatMessagesRef.current.scrollTop = groupChatMessagesRef.current.scrollHeight;
        }
      }, 50);
    });

    groupMessagesUnsubRef.current = unsubscribe;
    return () => {
      groupMessagesUnsubRef.current?.();
      groupMessagesUnsubRef.current = undefined;
    };
  }, [activeGroupChatId, uid]);

  useEffect(() => {
    return () => {
      groupMessagesUnsubRef.current?.();
    };
  }, []);

  const handleCreateGroup = async (values: CreateGroupFormValues) => {
    if (!uid || !profile) {
      return;
    }

    const name = values.name.trim();
    const description = values.description.trim();

    if (!name) {
      setStatus('Please enter a group name.');
      return;
    }

    if (values.selectedFriendIds.length < 1) {
      setStatus('Please select at least one friend.');
      return;
    }

    try {
      await createGroupChat(
        uid,
        profile.username,
        profile.photoURL,
        name,
        values.selectedFriendIds,
        description,
        values.avatar.trim(),
      );
      setShowCreateGroupModal(false);
      setStatus('Group created successfully!');
    } catch (error) {
      console.error('[CreateGroup] Failed:', error);
      setStatus('Failed to create group.');
    }
  };

  const handleSendGroupMessage = async () => {
    if (!uid || !profile || !activeGroupChat) {
      return;
    }

    const text = groupMessageText.trim();
    if (!text) {
      return;
    }

    const filteredText = filterProfanity(text);
    setGroupMessageText('');

    try {
      await sendGroupMessage(activeGroupChat.id, uid, profile.username, profile.photoURL, filteredText);
    } catch (error) {
      console.error('[SendGroupMessage] Failed:', error);
      setGroupMessageText(text);
      setStatus("Couldn't send message.");
    }
  };

  const handleToggleGroupReaction = async (message: GroupMessage, emoji: string) => {
    if (!uid || !activeGroupChat) {
      return;
    }

    try {
      await toggleGroupMessageReaction(activeGroupChat.id, message.id, uid, emoji);
    } catch (error) {
      console.error('[GroupReaction] Failed:', error);
    }
  };

  const handlePinGroupMessage = async (message: GroupMessage) => {
    if (!activeGroupChat) {
      return;
    }

    try {
      await pinGroupMessage(activeGroupChat.id, message.id, !message.isPinned);
    } catch (error) {
      console.error('[PinGroup] Failed:', error);
    }
  };

  const handleAddMemberToGroup = async (memberUid: string) => {
    if (!uid || !profile || !activeGroupChat) {
      return;
    }

    try {
      await addMemberToGroup(activeGroupChat.id, memberUid, profile.username, uid);
      setStatus('Member added successfully!');
    } catch (error) {
      console.error('[AddMember] Failed:', error);
      setStatus('Failed to add member.');
    }
  };

  const handleRemoveMemberFromGroup = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) {
      return;
    }

    try {
      await removeMemberFromGroup(activeGroupChat.id, memberUid, memberUsername);
      setStatus(`${memberUsername} removed.`);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      console.error('[RemoveMember] Failed:', error);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Make sure you are a member of this group.');
      } else {
        setStatus('Failed to remove member.');
      }
      throw error;
    }
  };

  const handlePromoteToAdmin = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) {
      return;
    }

    try {
      await promoteToAdmin(activeGroupChat.id, memberUid);
      setStatus(`${memberUsername} promoted to admin.`);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      console.error('[PromoteToAdmin] Failed:', error);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Only creators can promote members.');
      } else {
        setStatus('Failed to promote.');
      }
      throw error;
    }
  };

  const handleDemoteFromAdmin = async (memberUid: string, memberUsername: string): Promise<void> => {
    if (!uid || !activeGroupChat) {
      return;
    }

    try {
      await demoteFromAdmin(activeGroupChat.id, memberUid);
      setStatus(`${memberUsername} is now a member.`);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      console.error('[DemoteFromAdmin] Failed:', error);
      if (errorCode === 'permission-denied') {
        setStatus('Permission denied. Only creators can demote admins.');
      } else {
        setStatus('Failed to remove admin role.');
      }
      throw error;
    }
  };

  const handleLeaveGroup = async () => {
    if (!uid || !profile || !activeGroupChat) {
      return;
    }

    if (!window.confirm(`Leave ${activeGroupChat.name}?`)) {
      return;
    }

    try {
      await leaveGroupChat(activeGroupChat.id, uid, profile.username);
      setActiveGroupChatId(null);
      setGroupMessages([]);
      setShowGroupModal(false);
      setGroupModalData(null);
      setStatus('You left the group.');
    } catch (error) {
      console.error('[LeaveGroup] Failed:', error);
      setStatus('Failed to leave group.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!uid || !activeGroupChat) {
      return;
    }

    if (!window.confirm(`Delete ${activeGroupChat.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteGroupChat(activeGroupChat.id);
      setActiveGroupChatId(null);
      setGroupMessages([]);
      setShowGroupModal(false);
      setGroupModalData(null);
      setStatus('Group deleted.');
    } catch (error) {
      console.error('[DeleteGroup] Failed:', error);
      setStatus('Failed to delete group.');
    }
  };

  const openGroupChat = useCallback((group: GroupChat) => {
    setActiveGroupChatId(group.id);
  }, []);

  const getGroupMemberCount = useCallback((group: GroupChat) => group.members?.length || 0, []);

  const getUserGroupRole = useCallback(
    (group: GroupChat): GroupRole | null => (uid ? getUserRole(group, uid) : null),
    [uid],
  );

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
    canDeleteGroup,
    canManageGroup,
    canManageMembers,
    canPromoteToAdmin,
    canPinMessages,
  };
}
