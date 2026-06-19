"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, type User } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/firebaseAuth";
import { LogOut, Save } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user">("user");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setName(u.displayName || "");
        if (db) {
          try {
            const snap = await get(ref(db, `users/${u.uid}/role`));
            if (snap.exists()) setRole(snap.val());
          } catch (err) {
            console.warn("Could not fetch user role (rules might not be deployed yet). Defaulting to 'user'.");
            setRole("user");
          }
        }
      } else {
        router.push("/auth");
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    setSaving(true);
    setMessage("");
    try {
      // Update Firebase Auth
      await updateProfile(user, { displayName: name });
      // Update Realtime DB
      await update(ref(db, `users/${user.uid}`), { name });
      setMessage("Profile updated successfully!");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center font-bold text-on-surface-variant">
          Loading profile...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black text-on-background">My Profile</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md border border-outline px-4 py-2 font-bold text-on-background hover:bg-surface-variant transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="rounded-xl border border-outline bg-surface p-6 shadow-sm">
          <div className="mb-8 flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-variant text-3xl font-black text-on-surface border-4 border-surface shadow-sm">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-on-surface">{name || "User"}</h2>
              <p className="text-on-surface-variant">{user?.email}</p>
              <div className="mt-2 inline-flex items-center rounded-full bg-surface-variant px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                {role} ROLE
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="space-y-4 border-t border-outline-variant pt-6"
          >
            <h3 className="text-lg font-black text-on-surface">Edit Details</h3>
            <div>
              <label className="mb-1 block text-sm font-bold text-on-surface">
                Display Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-md rounded-md border border-outline bg-surface-dim text-on-surface px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {message && (
              <p
                className={`text-sm font-bold ${message.startsWith("Error") ? "text-red-500" : "text-emerald-500"}`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !name.trim() || name === user?.displayName}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-black text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
