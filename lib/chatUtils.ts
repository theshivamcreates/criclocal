import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { firestore } from "./firebase";
import type { User as FirebaseUser } from "firebase/auth";

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: "pending" | "accepted";
  timestamp: any;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: any;
  unreadBy?: string[];
  typing?: Record<string, boolean>;
  acceptedBy?: string[];
  deletedBy?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  reactions?: Record<string, string>;
  replyTo?: {
    messageId: string;
    text: string;
    senderId: string;
  };
  editedAt?: any;
  deletedFor?: string[];
  isUnsent?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  photoURL: string;
}

// Generate a unique 1-on-1 chat ID
export function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

// Friend Requests
export async function sendFriendRequest(fromUid: string, toUid: string) {
  const q = query(
    collection(firestore, "friendRequests"),
    where("from", "==", fromUid),
    where("to", "==", toUid)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // already sent

  await addDoc(collection(firestore, "friendRequests"), {
    from: fromUid,
    to: toUid,
    status: "pending",
    timestamp: serverTimestamp(),
  });
}

export async function acceptFriendRequest(requestId: string, fromUid: string, toUid: string) {
  // Update request status
  await updateDoc(doc(firestore, "friendRequests", requestId), {
    status: "accepted",
  });
  
  // Create symmetric friendship
  const friendshipId = getChatId(fromUid, toUid);
  await setDoc(doc(firestore, "friendships", friendshipId), {
    participants: [fromUid, toUid],
    timestamp: serverTimestamp(),
  });
}

export async function declineFriendRequest(requestId: string) {
  await deleteDoc(doc(firestore, "friendRequests", requestId));
}

// Check if two users are friends
export async function checkIsFriend(uid1: string, uid2: string): Promise<boolean> {
  const friendshipId = getChatId(uid1, uid2);
  const snap = await getDoc(doc(firestore, "friendships", friendshipId));
  return snap.exists();
}

// Check if a friend request is pending
export async function checkPendingRequest(fromUid: string, toUid: string): Promise<boolean> {
  const q = query(
    collection(firestore, "friendRequests"),
    where("from", "==", fromUid),
    where("to", "==", toUid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// Messages
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
  participants: string[],
  replyTo?: { messageId: string; text: string; senderId: string }
) {
  const chatRef = doc(firestore, "chats", chatId);
  
  // Create or update parent chat
  await setDoc(
    chatRef,
    {
      participants,
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      unreadBy: participants.filter(id => id !== senderId),
      acceptedBy: arrayUnion(senderId),
      deletedBy: [], // Reappear if previously deleted
    },
    { merge: true }
  );

  // Add message
  await addDoc(collection(firestore, `chats/${chatId}/messages`), {
    senderId,
    text,
    timestamp: serverTimestamp(),
    ...(replyTo && { replyTo }),
  });
}

export async function markChatRead(chatId: string, uid: string) {
  const chatRef = doc(firestore, "chats", chatId);
  const chatDoc = await getDoc(chatRef);
  if (chatDoc.exists()) {
    const data = chatDoc.data();
    
    // Do not mark as read if it's still a request for this user
    if (!data.acceptedBy?.includes(uid)) {
      return;
    }

    if (data.unreadBy && data.unreadBy.includes(uid)) {
      const newUnreadBy = data.unreadBy.filter((id: string) => id !== uid);
      await updateDoc(chatRef, { unreadBy: newUnreadBy });
    }
  }
}

export async function setTypingStatus(chatId: string, uid: string, isTyping: boolean) {
  const chatRef = doc(firestore, "chats", chatId);
  await setDoc(
    chatRef,
    {
      typing: { [uid]: isTyping },
    },
    { merge: true }
  );
}

export async function acceptChat(chatId: string, uid: string) {
  await updateDoc(doc(firestore, "chats", chatId), {
    acceptedBy: arrayUnion(uid)
  });
}

export async function denyChat(chatId: string, uid: string) {
  // Soft delete: hide the chat for this user
  await updateDoc(doc(firestore, "chats", chatId), {
    deletedBy: arrayUnion(uid)
  });
}

export async function reactToMessage(chatId: string, messageId: string, uid: string, emoji: string | null) {
  const msgRef = doc(firestore, `chats/${chatId}/messages`, messageId);
  const msgDoc = await getDoc(msgRef);
  if (!msgDoc.exists()) return;
  
  const currentReactions = msgDoc.data().reactions || {};
  if (emoji === null) {
    delete currentReactions[uid];
  } else {
    currentReactions[uid] = emoji;
  }
  
  await updateDoc(msgRef, { reactions: currentReactions });
}

export async function editMessage(chatId: string, messageId: string, newText: string) {
  const msgRef = doc(firestore, `chats/${chatId}/messages`, messageId);
  await updateDoc(msgRef, { 
    text: newText,
    editedAt: serverTimestamp() 
  });
}

export async function unsendMessage(chatId: string, messageId: string) {
  const msgRef = doc(firestore, `chats/${chatId}/messages`, messageId);
  await updateDoc(msgRef, { 
    isUnsent: true,
    text: "Message unsent",
    reactions: {},
    editedAt: null,
  });
}

export async function deleteMessageForMe(chatId: string, messageId: string, uid: string) {
  const msgRef = doc(firestore, `chats/${chatId}/messages`, messageId);
  await updateDoc(msgRef, {
    deletedFor: arrayUnion(uid)
  });
}

// Fetch user profiles by UIDs
export async function fetchUsersProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const profiles: Record<string, UserProfile> = {};
  if (!uids.length) return profiles;
  
  // Firestore 'in' queries are limited to 10
  const chunks = [];
  for (let i = 0; i < uids.length; i += 10) {
    chunks.push(uids.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const q = query(collection(firestore, "users"), where("__name__", "in", chunk));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      profiles[d.id] = { uid: d.id, ...d.data() } as UserProfile;
    });
  }
  return profiles;
}
