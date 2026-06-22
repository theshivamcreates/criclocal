"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Search, MessageSquare, User as UserIcon, Edit, X } from "lucide-react";
import { getChatId, type Chat, type UserProfile } from "@/lib/chatUtils";
import { useRouter, usePathname } from "next/navigation";

export function ChatSidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [friends, setFriends] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"friends" | "all">("friends");
  const [loading, setLoading] = useState(true);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");
  
  const router = useRouter();
  const pathname = usePathname();
  const isRoot = pathname === "/chat";

  useEffect(() => {
    if (!auth) return;
    let unsubChats: () => void;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        // Fetch current user profile
        const { getDoc, doc } = await import("firebase/firestore");
        const profileSnap = await getDoc(doc(firestore, "users", u.uid));
        if (profileSnap.exists()) {
          setUserProfile({ uid: profileSnap.id, ...profileSnap.data() } as UserProfile);
        }

        // Fetch all users for search & profile display
        const usersSnap = await getDocs(collection(firestore, "users"));
        const usersMap: Record<string, UserProfile> = {};
        usersSnap.forEach(d => {
          usersMap[d.id] = { uid: d.id, ...d.data() } as UserProfile;
        });
        setUsers(usersMap);

        // Fetch friendships
        const friendQ = query(collection(firestore, "friendships"), where("participants", "array-contains", u.uid));
        const friendSnap = await getDocs(friendQ);
        const friendsList = friendSnap.docs.map(d => {
          const p = d.data().participants as string[];
          return p.find(uid => uid !== u.uid)!;
        });
        setFriends(friendsList);

        // Subscribe to chats
        const chatQ = query(collection(firestore, "chats"), where("participants", "array-contains", u.uid));
        unsubChats = onSnapshot(chatQ, (snap) => {
          let chatList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
          
          // Filter out chats soft-deleted by this user
          chatList = chatList.filter(chat => !chat.deletedBy?.includes(u.uid));
          
          // Sort by lastMessageTime descending
          chatList.sort((a, b) => {
            const timeA = a.lastMessageTime?.toMillis() || 0;
            const timeB = b.lastMessageTime?.toMillis() || 0;
            return timeB - timeA;
          });
          setChats(chatList);
          setLoading(false);
        });
      } else {
        setLoading(false);
        if (unsubChats) unsubChats();
      }
    });
    return () => {
      unsubAuth();
      if (unsubChats) unsubChats();
    };
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !user) return [];
    
    const lowerQ = searchQuery.toLowerCase();
    const resultUids = searchMode === "friends" ? friends : Object.keys(users).filter(uid => uid !== user.uid);
    
    return resultUids
      .map(uid => users[uid])
      .filter(Boolean)
      .filter(u => u.name?.toLowerCase().includes(lowerQ) || u.username?.toLowerCase().includes(lowerQ));
  }, [searchQuery, searchMode, friends, users, user]);

  const handleStartChat = (otherUid: string) => {
    if (!user) return;
    const chatId = getChatId(user.uid, otherUid);
    router.push(`/chat/${chatId}`);
  };

  const normalMessages = useMemo(() => {
    return chats.filter(c => !c.acceptedBy || c.acceptedBy.includes(user?.uid || ""));
  }, [chats, user]);

  const requestsList = useMemo(() => {
    return chats.filter(c => c.acceptedBy && !c.acceptedBy.includes(user?.uid || ""));
  }, [chats, user]);

  const currentChats = activeTab === "messages" ? normalMessages : requestsList;

  return (
    <div className={`w-full md:w-[350px] lg:w-[400px] border-r border-outline flex-col h-full bg-surface ${isRoot ? "flex" : "hidden md:flex"} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 h-[72px] border-b border-outline shrink-0">
        <Link href="/chat" className="text-xl font-bold text-on-surface truncate pr-4 hover:opacity-80 transition-opacity">
          {userProfile?.username || userProfile?.name || "Messages"}
        </Link>
        <button 
          onClick={() => setIsNewMessageModalOpen(true)}
          className="text-on-surface hover:text-primary transition-colors"
        >
          <Edit size={22} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 
                onClick={() => setActiveTab("messages")}
                className={`font-bold text-lg cursor-pointer ${activeTab === "messages" ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Messages
              </h3>
              <div 
                onClick={() => setActiveTab("requests")}
                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${activeTab === "requests" ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}
              >
                <span>Requests</span>
                {requestsList.some(c => c.unreadBy?.includes(user?.uid || "")) && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : currentChats.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <MessageSquare className="mx-auto mb-3 opacity-50" size={32} />
                <p className="text-sm">No {activeTab} yet.</p>
              </div>
            ) : (
                <div className="flex flex-col">
                  {currentChats.map(chat => {
                    const otherUid = chat.participants.find(uid => uid !== user?.uid);
                    if (!otherUid) return null;
                    const otherUser = users[otherUid];
                    
                    const isUnread = chat.unreadBy?.includes(user?.uid || "");
                    const isActive = pathname === `/chat/${chat.id}`;

                    return (
                      <Link
                        key={chat.id}
                        href={`/chat/${chat.id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive ? "bg-surface-variant" : "hover:bg-surface-variant"}`}
                      >
                        {otherUser?.photoURL ? (
                          <img src={otherUser.photoURL} alt={otherUser.name} className="w-14 h-14 rounded-full object-cover shrink-0 bg-surface-dim" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-surface-dim flex items-center justify-center font-bold text-xl text-primary shrink-0">
                            {otherUser?.name?.[0]?.toUpperCase() || <UserIcon />}
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className={`text-sm truncate ${isUnread ? "font-bold text-on-surface" : "text-on-surface"}`}>
                            {otherUser?.name || "Unknown Player"}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className={`text-xs truncate ${isUnread ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>
                              {chat.lastMessage}
                            </p>
                            {chat.lastMessageTime && (
                              <span className="text-xs text-on-surface-variant shrink-0">
                                · {chat.lastMessageTime.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0"></div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {isNewMessageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-outline">
              <h2 className="text-lg font-bold text-on-surface w-full text-center">New message</h2>
              <button 
                onClick={() => setIsNewMessageModalOpen(false)}
                className="text-on-surface hover:text-primary absolute right-4"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Search Bar */}
            <div className="p-3 border-b border-outline flex items-center gap-3">
              <span className="text-on-surface font-bold text-sm ml-2">To:</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant py-1"
                autoFocus
              />
              {searchQuery.trim() && (
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as "friends" | "all")}
                  className="bg-transparent text-xs font-bold text-primary outline-none cursor-pointer shrink-0"
                >
                  <option value="friends">Friends</option>
                  <option value="all">All Players</option>
                </select>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {searchQuery.trim() ? (
                searchResults.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-8">No account found.</p>
                ) : (
                  <div className="flex flex-col">
                    {searchResults.map(p => (
                      <button
                        key={p.uid}
                        onClick={() => {
                          setIsNewMessageModalOpen(false);
                          setSearchQuery("");
                          handleStartChat(p.uid);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant transition-colors text-left"
                      >
                        {p.photoURL ? (
                          <img src={p.photoURL} alt={p.name} className="w-12 h-12 rounded-full object-cover shrink-0 bg-surface-dim" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary shrink-0">
                            {p.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-on-surface text-sm truncate">{p.name}</p>
                          <p className="text-xs text-on-surface-variant truncate">@{p.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-on-surface mt-2 mb-2 px-3">Suggested</h3>
                  {friends.length === 0 ? (
                    <p className="text-sm text-on-surface-variant px-3 py-4 text-center">No friends available.</p>
                  ) : (
                    <div className="flex flex-col">
                      {friends.slice(0, 5).map(uid => {
                        const p = users[uid];
                        if (!p) return null;
                        return (
                          <button
                            key={p.uid}
                            onClick={() => {
                              setIsNewMessageModalOpen(false);
                              handleStartChat(p.uid);
                            }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant transition-colors text-left"
                          >
                            {p.photoURL ? (
                              <img src={p.photoURL} alt={p.name} className="w-12 h-12 rounded-full object-cover shrink-0 bg-surface-dim" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary shrink-0">
                                {p.name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="font-bold text-on-surface text-sm truncate">{p.name}</p>
                              <p className="text-xs text-on-surface-variant truncate">@{p.username}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
