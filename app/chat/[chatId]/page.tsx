"use client";

import { useState, useEffect, useRef } from "react";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, getDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { ChevronLeft, Send, User as UserIcon, MessageSquare, MoreVertical, Trash2, Smile, Reply, Pencil, Forward, X } from "lucide-react";
import { sendMessage, markChatRead, setTypingStatus, acceptChat, denyChat, sendFriendRequest, reactToMessage, editMessage, unsendMessage, deleteMessageForMe, type Message, type UserProfile, type Chat } from "@/lib/chatUtils";
import { ForwardModal } from "./ForwardModal";
import { useParams, useRouter } from "next/navigation";

export default function DirectMessagePage() {
  const { chatId } = useParams() as { chatId: string };
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [chatData, setChatData] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openReactionMenuId, setOpenReactionMenuId] = useState<string | null>(null);
  const [openMoreMenuId, setOpenMoreMenuId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!auth || !chatId) return;
    
    let unsubMsgs: () => void;
    let unsubChat: () => void;
    
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        // Extract other user's uid from composite chatId
        const uids = chatId.split("_");
        const otherUid = uids.find(id => id !== u.uid);

        if (otherUid) {
          const userDoc = await getDoc(doc(firestore, "users", otherUid));
          if (userDoc.exists()) {
            setOtherUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
          }
        }

        const msgQ = query(collection(firestore, `chats/${chatId}/messages`), orderBy("timestamp", "asc"));
        unsubMsgs = onSnapshot(msgQ, (snap) => {
          const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
          setMessages(msgs);
          setLoading(false);
          // Scroll to bottom after state update
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        });

        unsubChat = onSnapshot(doc(firestore, "chats", chatId), (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Chat;
            setChatData(data);
            if (data.unreadBy && data.unreadBy.includes(u.uid)) {
              markChatRead(chatId, u.uid);
            }
          }
        });
      } else {
        setLoading(false);
        if (unsubMsgs) unsubMsgs();
        if (unsubChat) unsubChat();
      }
    });
    
    return () => {
      unsubAuth();
      if (unsubMsgs) unsubMsgs();
      if (unsubChat) unsubChat();
    };
  }, [chatId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !otherUser) return;
    
    const text = inputText.trim();
    setInputText("");
    
    // Clear typing status immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(chatId, user.uid, false);
    
    try {
      if (editingMessage) {
        await editMessage(chatId, editingMessage.id, text);
        setEditingMessage(null);
      } else {
        const replyContext = replyingTo ? {
          messageId: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        } : undefined;
        
        await sendMessage(chatId, user.uid, text, [user.uid, otherUser.uid], replyContext);
        setReplyingTo(null);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!user) return;
    
    setTypingStatus(chatId, user.uid, true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(chatId, user.uid, false);
    }, 2000);
  };

  const isRequest = chatData && chatData.acceptedBy && !chatData.acceptedBy.includes(user?.uid || "");

  const handleAccept = async () => {
    if (!user) return;
    await acceptChat(chatId, user.uid);
  };

  const handleDeny = async () => {
    if (!user) return;
    await denyChat(chatId, user.uid);
    router.push("/chat");
  };

  const handleAcceptAndAddFriend = async () => {
    if (!user || !otherUser) return;
    await acceptChat(chatId, user.uid);
    await sendFriendRequest(user.uid, otherUser.uid);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center bg-background">
        <p className="text-lg font-bold text-on-surface-variant">Please sign in to access messages.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 h-[72px] border-b border-outline bg-surface z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/chat" className="p-2 -ml-2 hover:bg-surface-variant rounded-full transition-colors md:hidden">
            <ChevronLeft size={24} />
          </Link>
          
          <div className="flex items-center gap-3">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover bg-surface-dim" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary">
                {otherUser?.name?.[0]?.toUpperCase() || <UserIcon size={20} />}
              </div>
            )}
            <div>
              <h2 className="font-black text-on-surface leading-tight">{otherUser?.name || "Unknown Player"}</h2>
              <p className="text-xs text-on-surface-variant">@{otherUser?.username || "unknown"}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -mr-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant"
          >
            <MoreVertical size={20} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-outline rounded-xl shadow-lg z-50 overflow-hidden">
              <button 
                onClick={handleDeny}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-surface-variant transition-colors text-left"
              >
                <Trash2 size={16} />
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-inverse-surface/5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-70">
              <MessageSquare size={40} className="mb-3" />
              <p className="font-bold">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              if (msg.deletedFor?.includes(user.uid)) return null;
              
              const isMine = msg.senderId === user.uid;
              const showTime = index === 0 || (msg.timestamp?.toMillis() - messages[index - 1].timestamp?.toMillis() > 5 * 60 * 1000);
              const isHovered = hoveredMessageId === msg.id;
              
              return (
                <div key={msg.id} className="flex flex-col" onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                  {showTime && msg.timestamp && (
                    <div className="text-[10px] text-center text-on-surface-variant my-3 uppercase font-bold tracking-widest opacity-60">
                      {msg.timestamp.toDate().toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className={`flex items-center w-full gap-2 ${isMine ? "justify-start flex-row-reverse" : "justify-start"}`}>
                    
                    <div className="flex flex-col relative max-w-[75%]">
                      {msg.replyTo && (
                        <div className={`text-xs opacity-70 mb-1 px-3 py-1 rounded-xl bg-surface-variant text-on-surface w-fit ${isMine ? "self-end" : "self-start"}`}>
                          Replying to {msg.replyTo.senderId === user.uid ? "yourself" : otherUser?.username}
                          <div className="truncate mt-0.5 font-bold">{msg.replyTo.text}</div>
                        </div>
                      )}
                      <div 
                        className={`px-4 py-2 rounded-2xl relative ${
                          msg.isUnsent 
                            ? "bg-surface-variant text-on-surface-variant italic border border-outline border-dashed"
                            : isMine 
                              ? "bg-primary text-on-primary rounded-br-sm" 
                              : "bg-surface-dim border border-outline text-on-surface rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.editedAt && !msg.isUnsent && (
                          <span className="text-[10px] opacity-60 ml-2">(edited)</span>
                        )}
                      </div>
                      
                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          {Object.entries(msg.reactions).map(([uid, emoji]) => (
                            <span key={uid} className="bg-surface border border-outline rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hover Actions */}
                    {isHovered && !msg.isUnsent && (
                      <div className={`flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ${isMine ? "mr-1" : "ml-1"}`}>
                        <div className="relative">
                          <button onClick={() => setOpenReactionMenuId(openReactionMenuId === msg.id ? null : msg.id)} className="p-1.5 hover:bg-surface-variant rounded-full text-on-surface">
                            <Smile size={16} />
                          </button>
                          {openReactionMenuId === msg.id && (
                            <div className={`absolute top-full mt-1 z-50 bg-surface border border-outline rounded-full shadow-lg p-1.5 flex gap-1 ${isMine ? "right-0" : "left-0"}`}>
                              {["❤️", "😂", "😮", "😢", "😡", "👍"].map(emoji => (
                                <button key={emoji} onClick={() => { 
                                  const newEmoji = msg.reactions?.[user.uid] === emoji ? null : emoji;
                                  reactToMessage(chatId, msg.id, user.uid, newEmoji); 
                                  setOpenReactionMenuId(null); 
                                }} className="hover:bg-surface-variant rounded-full p-1.5 text-lg transition-transform hover:scale-125">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setReplyingTo(msg); setTimeout(() => inputRef.current?.focus(), 0); }} className="p-1.5 hover:bg-surface-variant rounded-full text-on-surface">
                          <Reply size={16} />
                        </button>
                        <div className="relative">
                          <button onClick={() => setOpenMoreMenuId(openMoreMenuId === msg.id ? null : msg.id)} className="p-1.5 hover:bg-surface-variant rounded-full text-on-surface">
                            <MoreVertical size={16} />
                          </button>
                          {openMoreMenuId === msg.id && (
                            <div className={`absolute bottom-full mb-1 z-50 w-40 bg-surface border border-outline rounded-xl shadow-lg overflow-hidden ${isMine ? "right-0" : "left-0"}`}>
                              {isMine && (
                                <button onClick={() => { setEditingMessage(msg); setInputText(msg.text); setOpenMoreMenuId(null); setTimeout(() => inputRef.current?.focus(), 0); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors text-left">
                                  <Pencil size={14} /> Edit
                                </button>
                              )}
                              <button onClick={() => { setForwardMessage(msg); setOpenMoreMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors text-left">
                                <Forward size={14} /> Forward
                              </button>
                              {isMine && (
                                <button onClick={() => { unsendMessage(chatId, msg.id); setOpenMoreMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-surface-variant transition-colors text-left">
                                  <Trash2 size={14} /> Unsend
                                </button>
                              )}
                              <button onClick={() => { deleteMessageForMe(chatId, msg.id, user.uid); setOpenMoreMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-surface-variant transition-colors text-left">
                                  <Trash2 size={14} /> Delete for me
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                  </div>
                  {isMine && index === messages.length - 1 && chatData && otherUser && (
                    <div className="text-[10px] text-right mt-1 font-bold tracking-wider opacity-60">
                      {!chatData.acceptedBy?.includes(otherUser.uid) 
                        ? "Sent" 
                        : (chatData.unreadBy?.includes(otherUser.uid) ? "Delivered" : "Seen")}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {chatData?.typing?.[otherUser?.uid || ""] && (
            <div className="flex justify-start">
              <div className="bg-surface-dim border border-outline text-on-surface px-4 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isRequest ? (
          <div className="p-4 border-t border-outline bg-surface shrink-0">
            <p className="text-sm text-center font-bold text-on-surface mb-4">
              Accept message request from @{otherUser?.username}?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
              <button onClick={handleDeny} className="flex-1 py-3 rounded-xl font-bold text-sm bg-surface-dim hover:bg-surface-variant text-on-surface transition-colors border border-outline">
                Deny
              </button>
              <button onClick={handleAccept} className="flex-1 py-3 rounded-xl font-bold text-sm bg-primary hover:bg-primary-container text-on-primary transition-colors">
                Accept
              </button>
              <button onClick={handleAcceptAndAddFriend} className="flex-1 py-3 rounded-xl font-bold text-sm bg-inverse-surface hover:bg-inverse-surface/90 text-inverse-on-surface transition-colors">
                Accept & Add Friend
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-surface border-t border-outline">
            {(replyingTo || editingMessage) && (
              <div className="flex items-center justify-between px-4 py-2 bg-surface-variant/50 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-primary">
                    {editingMessage ? "Editing message" : `Replying to ${replyingTo?.senderId === user.uid ? "yourself" : otherUser?.username}`}
                  </span>
                  <span className="text-xs opacity-70 truncate max-w-sm">
                    {editingMessage ? editingMessage.text : replyingTo?.text}
                  </span>
                </div>
                <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setInputText(""); }} className="p-1 hover:bg-surface-dim rounded-full text-on-surface-variant">
                  <X size={16} />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="p-4">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Message..."
                  value={inputText}
                  onChange={handleInputChange}
                  className="flex-1 rounded-full bg-surface-dim border border-outline px-5 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50 hover:bg-primary-container transition-colors shrink-0"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Modals */}
        {forwardMessage && user && (
          <ForwardModal 
            user={user} 
            message={forwardMessage} 
            onClose={() => setForwardMessage(null)} 
          />
        )}
      </div>
  );
}
