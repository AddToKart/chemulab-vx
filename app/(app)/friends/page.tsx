'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { useFriends, useGroups, useChat } from './hooks';
import { updateGroupInfo } from '@/lib/firebase/group-chats';
import {
  FriendsList,
  RequestsList,
  GroupsList,
  ChatView,
  GroupChatView,
  CreateGroupModal,
  GroupSettingsModal,
  FriendProfileModal,
  AddMembersModal,
} from './components';

export default function FriendsPage() {
  const { user, profile } = useAuthStore();
  const [friendEmail, setFriendEmail] = useState('');

  const friendsHook = useFriends();
  const groupsHook = useGroups();
  const chatHook = useChat();

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    statusMsg,
    modalVisible,
    setModalVisible,
    modalData,
    handleAccept,
    handleDecline,
    handleCancel,
    viewFriendProfile,
    handleUnfriend,
    handleBlock,
    handleUnblock,
  } = friendsHook;

  const {
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
    statusMsg: groupStatusMsg,
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
  } = groupsHook;

  const {
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
    openChat,
    handleSendMessage,
    handleToggleReaction,
    handlePinMessage,
    handleReportMessage,
    PREDEFINED_REACTIONS,
    reactionPickerRef,
  } = chatHook;

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'groups'>('friends');

  // Sync status messages
  useEffect(() => {
    if (groupStatusMsg) friendsHook.setStatus(groupStatusMsg);
  }, [groupStatusMsg]);

  // Handle direct chat from URL
  useEffect(() => {
    const targetChatId = chatHook.searchParams.get('chatId');
    if (!targetChatId) {
      if (isInitializingChat) setTimeout(() => setIsInitializingChat(false), 60);
      return;
    }
    if (friends.length > 0) {
      const friend = friends.find(f => f.chatId === targetChatId);
      if (friend) {
        openChat(friend);
        const params = new URLSearchParams(chatHook.searchParams.toString());
        params.delete('chatId');
        chatHook.router.replace(`/friends${params.toString() ? `?${params.toString()}` : ''}`);
        setTimeout(() => setIsInitializingChat(false), 60);
      } else {
        setTimeout(() => setIsInitializingChat(false), 60);
      }
    }
  }, [chatHook.searchParams, friends, chatHook.router]);

  const uid = user?.uid;

  if (!user) {
    return (
      <div className="flex flex-col gap-4 xl:h-[calc(100dvh-11rem)] xl:flex-row">
        <div className="flex w-full flex-col gap-3 overflow-hidden rounded-[20px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 backdrop-blur-[40px] xl:w-[20rem] xl:min-w-[20rem]">
          <p className="text-[var(--text-light)] text-sm text-center py-4">Please sign in to use Friends &amp; Chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 xl:h-[calc(100dvh-11rem)] xl:flex-row">
      {/* LEFT PANEL */}
      <div className={cn(
        "flex w-full flex-col gap-3 overflow-hidden rounded-[20px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-4 backdrop-blur-[40px] transition-all duration-300 sm:p-5 xl:w-[20rem] xl:min-w-[20rem]",
        "max-xl:max-h-[calc(100dvh-10rem)]",
        (activeChat || activeGroupChat) ? "max-xl:hidden" : "max-xl:flex"
      )}>
        <div className="flex gap-1 bg-[var(--bg-sidebar)] rounded-[12px] p-1">
          <button type="button" onClick={() => setActiveTab('friends')} className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer",
            activeTab === 'friends' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-light)] hover:text-[var(--text-main)]'
          )}>Friends</button>
          <button type="button" onClick={() => setActiveTab('requests')} className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer relative",
            activeTab === 'requests' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-light)] hover:text-[var(--text-main)]'
          )}>
            Requests
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setActiveTab('groups')} className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer",
            activeTab === 'groups' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-light)] hover:text-[var(--text-main)]'
          )}>Groups</button>
        </div>

        {activeTab === 'friends' && (
          <FriendsList
            friends={friends}
            activeChat={activeChat}
            uid={uid}
            username={profile?.username}
            friendEmail={friendEmail}
            setFriendEmail={setFriendEmail}
            onAddFriend={() => friendsHook.handleAddFriend(friendEmail, setFriendEmail)}
            onOpenChat={openChat}
            statusMsg={statusMsg}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsList
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onCancel={handleCancel}
          />
        )}

        {activeTab === 'groups' && (
          <GroupsList
            groupChats={groupChats}
            activeGroupChat={activeGroupChat}
            statusMsg={statusMsg}
            onCreateClick={() => setShowCreateGroupModal(true)}
            onOpenGroup={openGroupChat}
            getUserGroupRole={getUserGroupRole}
            getGroupMemberCount={getGroupMemberCount}
          />
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className={cn(
        "flex min-h-[26rem] flex-1 flex-col overflow-hidden rounded-[20px] border border-[var(--glass-border)] bg-[var(--bg-card)] backdrop-blur-[40px] transition-all duration-300 xl:min-h-0",
        (!activeChat && !activeGroupChat) ? "max-xl:hidden" : "max-xl:flex"
      )}>
        {activeGroupChat ? (
          <GroupChatView
            activeGroupChat={activeGroupChat}
            groupMessages={groupMessages}
            groupMessageText={groupMessageText}
            setGroupMessageText={setGroupMessageText}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            activeGroupReactionMessageId={activeGroupReactionMessageId}
            setActiveGroupReactionMessageId={setActiveGroupReactionMessageId}
            showGroupFullReactionPicker={showGroupFullReactionPicker}
            setShowGroupFullReactionPicker={setShowGroupFullReactionPicker}
            uid={uid}
            onSendMessage={handleSendGroupMessage}
            onToggleReaction={handleToggleGroupReaction}
            onPinMessage={handlePinGroupMessage}
            onOpenMembers={() => { setGroupModalData({ group: activeGroupChat, mode: 'members' }); setShowGroupModal(true); }}
            onOpenSettings={() => { setGroupModalData({ group: activeGroupChat, mode: 'info' }); setShowGroupModal(true); }}
            onBack={() => setActiveGroupChat(null)}
            groupChatMessagesRef={groupChatMessagesRef}
            groupReactionPickerRef={reactionPickerRef}
            PREDEFINED_REACTIONS={PREDEFINED_REACTIONS}
            getUserGroupRole={getUserGroupRole}
            canManageGroup={canManageGroup}
            canPinMessages={canPinMessages}
          />
        ) : activeChat ? (
          <ChatView
            activeChat={activeChat}
            messages={messages}
            messageText={messageText}
            setMessageText={setMessageText}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            activeReactionMessageId={activeReactionMessageId}
            setActiveReactionMessageId={setActiveReactionMessageId}
            showFullReactionPicker={showFullReactionPicker}
            setShowFullReactionPicker={setShowFullReactionPicker}
            uid={uid}
            blockedUsers={blockedUsers}
            onSendMessage={() => handleSendMessage(blockedUsers)}
            onToggleReaction={handleToggleReaction}
            onPinMessage={handlePinMessage}
            onReportMessage={handleReportMessage}
            onViewProfile={() => {
              const friend = friends.find((f) => f.uid === activeChat.friendUid);
              if (friend) viewFriendProfile(friend);
            }}
            onBack={() => setActiveChat(null)}
            chatMessagesRef={chatMessagesRef}
            reactionPickerRef={reactionPickerRef}
            PREDEFINED_REACTIONS={PREDEFINED_REACTIONS}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-light)] text-sm">
            Select a friend or group to start chatting
          </div>
        )}
      </div>

      {/* MODALS */}
      <FriendProfileModal
        isOpen={modalVisible}
        onClose={() => { setModalVisible(false); }}
        modalData={modalData}
        pinnedMessages={messages.filter(m => m.isPinned)}
        onUnfriend={() => handleUnfriend(activeChat?.friendUid, setActiveChat, () => {})}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        isBlocked={modalData ? blockedUsers.includes(modalData.uid) : false}
        onUnpinMessage={handlePinMessage}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => { setShowCreateGroupModal(false); setSelectedFriendsForGroup([]); setGroupAvatar(''); }}
        onSubmit={handleCreateGroup}
        friends={friends}
        selectedFriends={selectedFriendsForGroup}
        setSelectedFriends={setSelectedFriendsForGroup}
        groupAvatar={groupAvatar}
        setGroupAvatar={setGroupAvatar}
        groupAvatarSource={groupAvatarSource}
        setGroupAvatarSource={setGroupAvatarSource}
      />

      <GroupSettingsModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setGroupModalData(null); }}
        group={activeGroupChat!}
        mode={groupModalData?.mode || 'members'}
        uid={uid}
        onAddMembers={() => { setShowGroupModal(false); setShowAddMembersModal(true); }}
        onLeaveGroup={handleLeaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onPromoteToAdmin={handlePromoteToAdmin}
        onDemoteFromAdmin={handleDemoteFromAdmin}
        onRemoveMember={handleRemoveMemberFromGroup}
        onUpdateGroup={async (name, desc, avatar) => {
          if (activeGroupChat) {
            try {
              await updateGroupInfo(activeGroupChat.id, { name, description: desc, avatar });
              setShowGroupModal(false);
            } catch (e: unknown) {
              const errorCode = (e as { code?: string })?.code;
              console.error('[UpdateGroup] Failed:', e);
              if (errorCode === 'permission-denied') {
                alert('Permission denied. You must be a member of the group to update it.');
              } else {
                alert('Failed to update group. Please try again.');
              }
            }
          }
        }}
        getUserGroupRole={getUserGroupRole}
        canManageMembers={canManageMembers}
        canPromoteToAdmin={canPromoteToAdmin}
      />

      <AddMembersModal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        friends={friends}
        currentMemberIds={activeGroupChat?.members?.map(m => m.uid) || []}
        onAddMember={handleAddMemberToGroup}
      />

      {/* LOADING OVERLAY */}
      {isInitializingChat && (
        <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-center gap-4 bg-[#0f172a] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-emerald-500 animate-spin" />
          <span className="text-sm text-slate-100 opacity-60">Opening Chat...</span>
        </div>
      )}
    </div>
  );
}
