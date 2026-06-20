import { auth, db, firestore } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, set, get, child } from "firebase/database";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UserProfile {
  name: string;
  role: "admin" | "user";
  email: string;
}

export interface ProUserRegistrationData {
  email: string;
  password?: string;
  name: string;
  phone: string;
  dob: string;
  primaryRole: string;
  gamePlayed: string[];
  bio: string;
  username: string;
  photoURL: string;
  referralCode?: string;
}

// Ensure the user's document exists in the DB, and set referral roles if any.
async function ensureUserDocument(
  user: User,
  name: string,
  referralCode?: string,
  proData?: Omit<ProUserRegistrationData, "email" | "password" | "name" | "referralCode">
) {
  if (!firestore) return;
  const userRef = doc(firestore, `users/${user.uid}`);

  const role = referralCode === "KIXXIADMIN" ? "admin" : "user";
  
  const dataToSet = {
    name: name || user.displayName || "User",
    email: user.email,
    role: role,
    ...(proData || {})
  };

  await setDoc(userRef, dataToSet);
}

export async function checkUsernameUnique(username: string): Promise<boolean> {
  if (!firestore) return false;
  const usernameRef = doc(firestore, `usernames/${username.toLowerCase()}`);
  const snapshot = await getDoc(usernameRef);
  return !snapshot.exists();
}

export async function registerProUser(data: ProUserRegistrationData) {
  if (!auth) throw new Error("Auth not configured");
  if (!firestore) throw new Error("Firestore not configured");
  
  // Validate username uniqueness one last time
  if (!data.username) throw new Error("Username required");
  const isUnique = await checkUsernameUnique(data.username);
  if (!isUnique) throw new Error("Username is already taken");

  // Create user
  if (!data.password) throw new Error("Password required for email registration");
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  );
  
  // Update Profile
  await updateProfile(credential.user, { 
    displayName: data.name,
    photoURL: data.photoURL
  });
  
  // Save all fields to RTDB
  const { email, password, name, referralCode, ...proData } = data;
  await ensureUserDocument(credential.user, name, referralCode, proData);
  
  // Claim the username in Firestore
  const usernameRef = doc(firestore, `usernames/${data.username.toLowerCase()}`);
  await setDoc(usernameRef, { uid: credential.user.uid });
  
  return credential.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  referralCode?: string,
) {
  if (!auth) throw new Error("Auth not configured");
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await updateProfile(credential.user, { displayName: name });
  await ensureUserDocument(credential.user, name, referralCode);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Auth not configured");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(referralCode?: string) {
  if (!auth) throw new Error("Auth not configured");
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDocument(
    credential.user,
    credential.user.displayName || "User",
    referralCode,
  );
  return credential.user;
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}
