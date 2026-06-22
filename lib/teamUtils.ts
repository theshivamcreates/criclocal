import { firestore } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, addDoc, deleteDoc } from "firebase/firestore";
import type { Team, TeamRequest, AppNotification } from "@/types/team";

export async function createTeam(teamData: Omit<Team, "id" | "createdAt">): Promise<string> {
  if (!firestore) throw new Error("Firestore not initialized");
  
  const teamRef = doc(collection(firestore, "teams"));
  await setDoc(teamRef, {
    ...teamData,
    createdAt: Date.now(),
  });
  return teamRef.id;
}

export async function getTeamsBySport(sport: string): Promise<Team[]> {
  if (!firestore) return [];
  const q = query(collection(firestore, "teams"), where("sport", "==", sport));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
}

export async function getUserTeam(userId: string, sport: string): Promise<Team | null> {
  if (!firestore) return null;
  const q = query(
    collection(firestore, "teams"), 
    where("sport", "==", sport),
    where("players", "array-contains", userId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Team;
  }
  return null;
}

export async function updateTeam(teamId: string, updates: Partial<Team>) {
  if (!firestore) throw new Error("Firestore not initialized");
  await updateDoc(doc(firestore, `teams/${teamId}`), updates);
}

export async function sendTeamInvite(teamId: string, teamName: string, sport: string, fromId: string, toId: string) {
  if (!firestore) throw new Error("Firestore not initialized");
  
  const reqRef = doc(collection(firestore, "teamRequests"));
  await setDoc(reqRef, {
    teamId,
    teamName,
    sport,
    from: fromId,
    to: toId,
    status: "pending",
    createdAt: Date.now()
  });
}

export async function sendNotification(notification: Omit<AppNotification, "id" | "createdAt" | "read">) {
  if (!firestore) throw new Error("Firestore not initialized");
  
  const notifRef = doc(collection(firestore, "notifications"));
  await setDoc(notifRef, {
    ...notification,
    read: false,
    createdAt: Date.now()
  });
}

export async function markNotificationRead(notifId: string) {
  if (!firestore) throw new Error("Firestore not initialized");
  await updateDoc(doc(firestore, `notifications/${notifId}`), { read: true });
}

export async function acceptTeamInvite(requestId: string, teamId: string, userId: string, ownerId: string, teamName: string) {
  if (!firestore) throw new Error("Firestore not initialized");
  
  // Update request status
  await updateDoc(doc(firestore, `teamRequests/${requestId}`), { status: "accepted" });
  
  // Add player to team
  const teamSnap = await getDoc(doc(firestore, `teams/${teamId}`));
  if (teamSnap.exists()) {
    const teamData = teamSnap.data() as Team;
    const newPlayers = [...(teamData.players || []), userId];
    await updateDoc(doc(firestore, `teams/${teamId}`), { players: newPlayers });
  }

  // Fetch the accepting user's name for the notification
  const userSnap = await getDoc(doc(firestore, `users/${userId}`));
  const userName = userSnap.exists() ? userSnap.data().name : "A player";
  
  // Send notification to owner
  await sendNotification({
    userId: ownerId,
    title: "Team Invite Accepted",
    message: `${userName} has joined ${teamName}!`,
    type: "team_invite_response"
  });
}

export async function declineTeamInvite(requestId: string, ownerId: string, teamName: string, userId: string) {
  if (!firestore) throw new Error("Firestore not initialized");
  
  // Update request status
  await updateDoc(doc(firestore, `teamRequests/${requestId}`), { status: "declined" });

  // Fetch user name
  const userSnap = await getDoc(doc(firestore, `users/${userId}`));
  const userName = userSnap.exists() ? userSnap.data().name : "A player";

  // Send notification to owner
  await sendNotification({
    userId: ownerId,
    title: "Team Invite Declined",
    message: `${userName} declined your invite to join ${teamName}.`,
    type: "team_invite_response"
  });
}
