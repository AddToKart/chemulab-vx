'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Send, Check } from 'lucide-react';
import Image from 'next/image';

interface FriendData {
  uid: string;
  email: string;
  username: string;
  photoURL?: string;
  chatId: string;
}

interface ShareGameScoreProps {
  score?: number | string;
  gameName: string;
  className?: string;
  customMessage?: string;
}

export function ShareGameScore({ score, gameName, className, customMessage }: ShareGameScoreProps) {
  const { user, profile } = useAuthStore();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sendingTo, setSendingTo] = useState<Record<string, boolean>>({}); // track sending state per friend
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({}); // track sent state per friend

  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const unsub = onSnapshot(collection(db, 'users', user.uid, 'friends'), async (snap) => {
      // We need to fetch fresh profile data for each friend to get current username/photo
      // Note: In a real app with many friends, we might want to paginate or optimize this.
      const promises = snap.docs.map(async (d) => {
        const data = d.data() as FriendData;
        try {
          const profileSnap = await getDoc(doc(db, 'users', data.uid));
          if (profileSnap.exists()) {
            const p = profileSnap.data();
            return {
              ...data,
              username: p.username ?? data.username,
              photoURL: p.photoURL ?? data.photoURL,
            };
          }
        } catch {
          // ignore error, use existing data
        }
        return data;
      });

      const results = await Promise.all(promises);
      setFriends(results);
    });

    return () => unsub();
  }, [user?.uid, isOpen]);

  const handleShare = async (friend: FriendData) => {
    if (!user || !profile) return;

    setSendingTo((prev) => ({ ...prev, [friend.uid]: true }));

    try {
      const messageText = customMessage 
        ? customMessage 
        : `I just scored ${score} points in ${gameName}! 🎮`;

      await addDoc(collection(db, 'chats', friend.chatId, 'messages'), {
        text: messageText,
        fromUid: user.uid,
        fromEmail: profile.email || '',
        fromUsername: profile.username || '',
        createdAt: serverTimestamp(),
      });

      setSentTo((prev) => ({ ...prev, [friend.uid]: true }));
    } catch (error) {
      console.error('Failed to share score:', error);
      alert('Failed to share score. Please try again.');
    } finally {
      setSendingTo((prev) => ({ ...prev, [friend.uid]: false }));
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Score
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your score</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2 max-h-[60vh] overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              You don&apos;t have any friends to share with yet.
            </p>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                    {friend.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={friend.photoURL}
                        alt={friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src="/img/default-avatar.png"
                        alt={friend.username}
                        width={40}
                        height={40}
                      />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{friend.username}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {friend.email}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={sentTo[friend.uid] ? "secondary" : "default"}
                  disabled={sendingTo[friend.uid] || sentTo[friend.uid]}
                  onClick={() => handleShare(friend)}
                  className="shrink-0"
                >
                  {sentTo[friend.uid] ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
