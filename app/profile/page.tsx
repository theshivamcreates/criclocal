"use client";

import { useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, type User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { LogOut, Save, Camera, Check } from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadToImageKit } from "@/lib/imagekitUpload";
import { logout } from "@/lib/firebaseAuth";
import { checkUsernameUnique } from "@/lib/firebaseAuth";
import { ProfilePhotoCropper } from "@/components/ProfilePhotoCropper";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user">("user");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gamePlayed, setGamePlayed] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState("");
  const [bio, setBio] = useState("");
  const [dob, setDob] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameEdits, setUsernameEdits] = useState<number[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setName(u.displayName || "");
        if (firestore) {
          try {
            const snap = await getDoc(doc(firestore, `users/${u.uid}`));
            if (snap.exists()) {
              const data = snap.data();
              setRole(data.role || "user");
              setPhone(data.phone || "");
              setGamePlayed(Array.isArray(data.gamePlayed) ? data.gamePlayed : (data.gamePlayed ? [data.gamePlayed] : []));
              setPrimaryRole(data.primaryRole || "");
              setBio(data.bio || "");
              setDob(data.dob || "");
              setUsername(data.username || "");
              setOriginalUsername(data.username || "");
              setUsernameEdits(data.usernameEdits || []);
            }
          } catch (err) {
            console.warn("Could not fetch user profile details.");
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

  useEffect(() => {
    if (username.trim() === "" || username === originalUsername) {
      setUsernameStatus("idle");
      return;
    }
    const check = async () => {
      setUsernameStatus("checking");
      try {
        const isUnique = await checkUsernameUnique(username.trim());
        setUsernameStatus(isUnique ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    };
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  }, [username, originalUsername]);

  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
  const recentEdits = usernameEdits.filter(time => Date.now() - time < FOURTEEN_DAYS);
  const canEditUsername = recentEdits.length < 2;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawPhotoUrl(url);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setRawPhotoUrl(null);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(croppedFile, options);
      setPhotoFile(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error(err);
      setMessage("Failed to compress image.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setSaving(true);
    setMessage("");
    try {
      if (username !== originalUsername) {
        if (!canEditUsername) {
          setMessage("Error: Username can only be changed twice every 14 days.");
          setSaving(false);
          return;
        }
        if (usernameStatus === "taken") {
          setMessage("Error: Please choose an available username.");
          setSaving(false);
          return;
        }
      }

      let finalPhotoUrl = user.photoURL;

      if (photoFile) {
        finalPhotoUrl = await uploadToImageKit(photoFile, `profile_${name}_${Date.now()}.jpg`);
      }

      // Update Firebase Auth
      await updateProfile(user, { displayName: name, photoURL: finalPhotoUrl });

      let finalUsernameEdits = usernameEdits;
      if (username !== originalUsername) {
        if (originalUsername) {
          await deleteDoc(doc(firestore, `usernames/${originalUsername.toLowerCase()}`));
        }
        await setDoc(doc(firestore, `usernames/${username.toLowerCase()}`), { uid: user.uid });
        finalUsernameEdits = [...recentEdits, Date.now()];
        setOriginalUsername(username);
        setUsernameEdits(finalUsernameEdits);
      }

      // Update Firestore DB
      await updateDoc(doc(firestore, `users/${user.uid}`), { 
        name,
        gamePlayed,
        primaryRole,
        bio,
        ...(username !== originalUsername ? { username: username.toLowerCase(), usernameEdits: finalUsernameEdits } : {})
      });
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
    return <div className="flex h-screen items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <AppShell>
      {rawPhotoUrl && (
        <ProfilePhotoCropper
          imageSrc={rawPhotoUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setRawPhotoUrl(null)}
        />
      )}
      <div className="mx-auto max-w-4xl px-4 py-12">
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
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-variant text-3xl font-black text-on-surface border-4 border-surface shadow-sm group">
              {photoPreview || user?.photoURL ? (
                <img
                  src={photoPreview || user?.photoURL || ""}
                  alt="Profile"
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-50"
                />
              ) : (
                <span className="transition-opacity group-hover:opacity-50">
                  {name.substring(0, 2).toUpperCase()}
                </span>
              )}
              
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={24} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </label>
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-outline-variant pt-6"
          >
            <div className="md:col-span-2">
              <h3 className="text-lg font-black text-on-surface">Edit Details</h3>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-bold text-on-surface">
                Display Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-outline bg-surface-dim text-on-surface px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {role !== "admin" && (
              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">
                  Username
                </label>
                <input
                  disabled={!canEditUsername}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  className={`w-full rounded-md border bg-surface-dim text-on-surface px-3 py-2 outline-none transition-colors ${
                    !canEditUsername ? "opacity-70 cursor-not-allowed border-outline"
                    : usernameStatus === "taken" ? "border-red-500 focus:border-red-500"
                    : usernameStatus === "available" ? "border-emerald-500 focus:border-emerald-500"
                    : "border-outline focus:border-primary focus:ring-1 focus:ring-primary"
                  }`}
                  maxLength={20}
                />
                {!canEditUsername && <p className="text-[10px] text-on-surface-variant mt-1">You have reached the limit of 2 username changes per 14 days.</p>}
                {canEditUsername && usernameStatus === "checking" && <p className="text-[10px] text-on-surface-variant mt-1">Checking availability...</p>}
                {canEditUsername && usernameStatus === "available" && <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1"><Check size={12} /> Username is available!</p>}
                {canEditUsername && usernameStatus === "taken" && <p className="text-[10px] text-red-500 mt-1">Username is already taken.</p>}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-bold text-on-surface opacity-70">
                Phone Number (Cannot be changed)
              </label>
              <input
                disabled
                type="text"
                value={phone ? `+91 ${phone}` : ""}
                className="w-full rounded-md border border-outline bg-surface-variant text-on-surface-variant px-3 py-2 outline-none opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-on-surface opacity-70">
                Date of Birth (Cannot be changed)
              </label>
              <input
                disabled
                type="date"
                value={dob}
                className="w-full rounded-md border border-outline bg-surface-variant text-on-surface-variant px-3 py-2 outline-none uppercase opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-on-surface">
                Primary Role
              </label>
              <select
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                className="w-full rounded-md border border-outline bg-surface-dim text-on-surface px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Role</option>
                <option value="Player">Player</option>
                <option value="Coach">Coach</option>
                <option value="Sponsor">Sponsor</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-on-surface">
                Primary Sports
              </label>
              <div className="flex flex-wrap gap-3">
                {["Cricket", "Football", "Basketball"].map(sport => {
                  const isSelected = gamePlayed.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => {
                        const newSports = isSelected
                          ? gamePlayed.filter(s => s !== sport)
                          : [...gamePlayed, sport];
                        setGamePlayed(newSports);
                      }}
                      className={`px-4 py-2 rounded-md border text-sm font-bold transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-outline bg-surface-dim text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {sport} {isSelected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-on-surface">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-outline bg-surface-dim text-on-surface px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              {message && (
                <p
                  className={`text-sm font-bold ${message.startsWith("Error") ? "text-red-500" : "text-emerald-500"}`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-black text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
