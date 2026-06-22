"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { fetchUsersProfiles, sendMessage, getChatId, type Message, type UserProfile } from "@/lib/chatUtils";
import type { User } from "firebase/auth";

interface ForwardModalProps {
  user: User;
  message: Message;
  onClose: () => void;
}

export function ForwardModal({ user, message, onClose }: ForwardModalProps) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadFriends() {
      try {
        if (!firestore) return;
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const friendUids = userDoc.data().friends || [];
          if (friendUids.length > 0) {
            const profilesMap = await fetchUsersProfiles(friendUids);
            setFriends(Object.values(profilesMap));
          }
        }
      } catch (err) {
        console.error("Failed to load friends:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFriends();
  }, [user.uid]);

  const toggleSelect = (uid: string) => {
    const newSet = new Set(selectedUids);
    if (newSet.has(uid)) newSet.delete(uid);
    else newSet.add(uid);
    setSelectedUids(newSet);
  };

  const handleForward = async () => {
    if (selectedUids.size === 0 || sending) return;
    setSending(true);

    try {
      const promises = Array.from(selectedUids).map(async (friendUid) => {
        const chatId = getChatId(user.uid, friendUid);
        await sendMessage(chatId, user.uid, message.text, [user.uid, friendUid]);
      });
      await Promise.all(promises);
      onClose();
    } catch (err) {
      console.error("Failed to forward message:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-outline">
        <div className="flex items-center justify-between p-4 px-6 border-b border-outline">
          <h2 className="text-xl font-bold text-on-surface">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-outline">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-dim border border-outline rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center p-8 text-on-surface-variant">
              <p className="font-bold">No friends yet</p>
              <p className="text-sm">Add some friends to forward messages</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center p-8 text-on-surface-variant">
              <p className="font-bold">No friends found</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.uid}
                onClick={() => toggleSelect(friend.uid)}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface-variant rounded-xl transition-colors text-left"
              >
                <div className="relative">
                  {friend.photoURL ? (
                    <img src={friend.photoURL} alt={friend.name} className="w-12 h-12 rounded-full object-cover bg-surface-dim" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {friend.name[0].toUpperCase()}
                    </div>
                  )}
                  {selectedUids.has(friend.uid) && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-on-primary rounded-full flex items-center justify-center border-2 border-surface">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface truncate">{friend.name}</p>
                  <p className="text-sm text-on-surface-variant truncate">@{friend.username}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedUids.has(friend.uid) ? 'bg-primary border-primary' : 'border-outline'}`}>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-outline bg-surface">
          <button
            onClick={handleForward}
            disabled={selectedUids.size === 0 || sending}
            className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-50 hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              `Send to ${selectedUids.size} ${selectedUids.size === 1 ? 'person' : 'people'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
