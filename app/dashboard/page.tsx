"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { onValue, ref as dbRef } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Eye, LogIn, LogOut, MonitorUp, Plus, Smartphone, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { auth, db, storage, isFirebaseConfigured } from "@/lib/firebase";
import { saveMatch } from "@/lib/firebaseMatches";
import { buildNewMatch } from "@/lib/matchUtils";
import type { Match } from "@/types/match";
import { v4 as uuidv4 } from "uuid";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [form, setForm] = useState({ 
    team1: "Mumbai Indians", 
    team2: "Chennai Super Kings", 
    overs: 20, 
    toss: "team1", 
    elected: "bat",
    team1Color: "#004ba0",
    team2Color: "#ffff3c",
    team1Roster: "Rohit, Kishan, Surya, Hardik, Tilak, David, Nabi, Shepherd, Coetzee, Bumrah, Madhwal",
    team2Roster: "Ruturaj, Rachin, Rahane, Mitchell, Dube, Jadeja, Dhoni, Thakur, Chahar, Deshpande, Pathirana"
  });
  const [team1LogoFile, setTeam1LogoFile] = useState<File | null>(null);
  const [team2LogoFile, setTeam2LogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!db) return;
    return onValue(
      dbRef(db, "matches"),
      (snapshot) => setMatches(snapshot.val() ?? {}),
      (error) => setMessage(`Error reading matches: ${error.message}`)
    );
  }, []);

  const visibleMatches = useMemo(() => {
    return Object.entries(matches)
      .filter(([, match]) => !user || match.meta.createdBy === user.uid || match.meta.createdBy === "demo-user")
      .sort(([, a], [, b]) => b.meta.createdAt - a.meta.createdAt);
  }, [matches, user]);

  async function handleLogin() {
    if (!auth) return setMessage("Add Firebase config before signing in.");
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFirebaseConfigured) return setMessage("Add Firebase config in .env.local before creating live matches.");
    const matchId = uuidv4();
    if (!user) return setMessage("Sign in with Google before creating a live match.");
    const createdBy = user.uid;

    setIsUploading(true);
    setMessage("Uploading logos and creating match...");

    try {
      let team1LogoUrl = "";
      let team2LogoUrl = "";

      if (team1LogoFile && storage) {
        const logo1Ref = storageRef(storage, `logos/${matchId}_team1`);
        await uploadBytes(logo1Ref, team1LogoFile);
        team1LogoUrl = await getDownloadURL(logo1Ref);
      }
      
      if (team2LogoFile && storage) {
        const logo2Ref = storageRef(storage, `logos/${matchId}_team2`);
        await uploadBytes(logo2Ref, team2LogoFile);
        team2LogoUrl = await getDownloadURL(logo2Ref);
      }

      const t1Roster = form.team1Roster.split(",").map(s => s.trim()).filter(Boolean);
      const t2Roster = form.team2Roster.split(",").map(s => s.trim()).filter(Boolean);

      const match = buildNewMatch(
        form.team1, form.team2, Number(form.overs), form.toss as "team1" | "team2", form.elected as "bat" | "field", createdBy,
        team1LogoUrl || undefined, team2LogoUrl || undefined, t1Roster, t2Roster, form.team1Color, form.team2Color
      );

      await saveMatch(matchId, match);
      setMessage(`Match created. Open /match/${matchId}/score to start scoring.`);
    } catch (err: any) {
      setMessage(`Error creating match: ${err.message}. Ensure your Realtime Database and Storage are created and rules are deployed.`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[26rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Dashboard</h1>
              <p className="text-sm text-slate-500">{user ? user.displayName : "Firebase Google sign-in"}</p>
            </div>
            {user ? (
              <button className="rounded-md border border-slate-300 p-2" onClick={() => auth && signOut(auth)} title="Sign out">
                <LogOut size={18} />
              </button>
            ) : (
              <button className="rounded-md border border-slate-300 p-2" onClick={handleLogin} title="Sign in">
                <LogIn size={18} />
              </button>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input type="color" value={form.team1Color} onChange={(e) => setForm({ ...form, team1Color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-md border-0 p-0" title="Team 1 Color" />
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 font-bold" value={form.team1} onChange={(event) => setForm({ ...form, team1: event.target.value })} placeholder="Team 1 Name" />
              </div>
              <label className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                <Upload size={16} />
                {team1LogoFile ? team1LogoFile.name : "Upload Team 1 Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setTeam1LogoFile(e.target.files?.[0] || null)} />
              </label>
              <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" rows={2} value={form.team1Roster} onChange={(e) => setForm({ ...form, team1Roster: e.target.value })} placeholder="Player 1, Player 2..." title="Team 1 Roster (comma separated)" />
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input type="color" value={form.team2Color} onChange={(e) => setForm({ ...form, team2Color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-md border-0 p-0" title="Team 2 Color" />
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 font-bold" value={form.team2} onChange={(event) => setForm({ ...form, team2: event.target.value })} placeholder="Team 2 Name" />
              </div>
              <label className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                <Upload size={16} />
                {team2LogoFile ? team2LogoFile.name : "Upload Team 2 Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setTeam2LogoFile(e.target.files?.[0] || null)} />
              </label>
              <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" rows={2} value={form.team2Roster} onChange={(e) => setForm({ ...form, team2Roster: e.target.value })} placeholder="Player 1, Player 2..." title="Team 2 Roster (comma separated)" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm font-bold">
                Overs
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" min={1} max={50} type="number" value={form.overs} onChange={(event) => setForm({ ...form, overs: Number(event.target.value) })} />
              </label>
              <label className="block text-sm font-bold">
                Toss
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.toss} onChange={(event) => setForm({ ...form, toss: event.target.value })}>
                  <option value="team1">Team 1</option>
                  <option value="team2">Team 2</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Elected
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.elected} onChange={(event) => setForm({ ...form, elected: event.target.value })}>
                  <option value="bat">Bat</option>
                  <option value="field">Field</option>
                </select>
              </label>
            </div>
            
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-pitch px-4 py-3 font-black text-white disabled:opacity-50" disabled={!isFirebaseConfigured || !user || isUploading}>
              <Plus size={18} />
              {isUploading ? "Creating..." : "Create Match"}
            </button>
            {message ? <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}
          </form>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Matches</h2>
            <span className="text-sm font-bold text-slate-500">{visibleMatches.length} total</span>
          </div>
          <div className="space-y-3">
            {visibleMatches.length ? (
              visibleMatches.map(([id, match]) => (
                <article key={id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {match.meta.team1Logo ? (
                          <img src={match.meta.team1Logo} alt={match.meta.team1} className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-black shadow-sm" style={{ backgroundColor: match.meta.team1Color }}>{match.meta.team1.substring(0, 3).toUpperCase()}</div>
                        )}
                        {match.meta.team2Logo ? (
                          <img src={match.meta.team2Logo} alt={match.meta.team2} className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-black shadow-sm" style={{ backgroundColor: match.meta.team2Color }}>{match.meta.team2.substring(0, 3).toUpperCase()}</div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-black leading-tight">
                          {match.meta.team1} vs {match.meta.team2}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {match.meta.overs} overs · <span className="capitalize">{match.meta.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-black text-white" href={`/match/${id}/score`}>
                        <Smartphone size={16} /> Score
                      </Link>
                      <Link className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-black" href={`/match/${id}/live`}>
                        <Eye size={16} /> Live
                      </Link>
                      <Link className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-black" href={`/match/${id}/overlay`}>
                        <MonitorUp size={16} /> Overlay
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                Created matches will appear here after Firebase is connected.
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
