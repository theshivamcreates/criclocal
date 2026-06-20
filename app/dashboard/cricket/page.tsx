"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { onValue, ref as dbRef, get } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  Eye,
  LogIn,
  LogOut,
  MonitorUp,
  Plus,
  Smartphone,
  Upload,
  Trash2,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, storage, isFirebaseConfigured, firestore } from "@/lib/firebase";
import { saveMatch } from "@/lib/firebaseMatches";
import { buildNewMatch } from "@/lib/matchUtils";
import type { Match, Player } from "@/types/match";
import { v4 as uuidv4 } from "uuid";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "tournaments">(
    "matches",
  );
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [tournaments, setTournaments] = useState<Record<string, any>>({});
  const [form, setForm] = useState<{
    team1: string;
    team1Short: string;
    team2: string;
    team2Short: string;
    overs: number;
    toss: string;
    elected: string;
    team1Color: string;
    team2Color: string;
    team1Roster: Player[];
    team2Roster: Player[];
  }>({
    team1: "Mumbai Indians",
    team1Short: "MI",
    team2: "Chennai Super Kings",
    team2Short: "CSK",
    overs: 20,
    toss: "team1",
    elected: "bat",
    team1Color: "#004ba0",
    team2Color: "#ffff3c",
    team1Roster:
      "Rohit, Kishan, Surya, Hardik, Tilak, David, Nabi, Shepherd, Coetzee, Bumrah, Madhwal"
        .split(",")
        .map((name) => ({ name, role: "Player" })),
    team2Roster:
      "Ruturaj, Rachin, Rahane, Mitchell, Dube, Jadeja, Dhoni, Thakur, Chahar, Deshpande, Pathirana"
        .split(",")
        .map((name) => ({ name, role: "Player" })),
  });
  const [tournamentName, setTournamentName] = useState("");
  const [tEntryFee, setTEntryFee] = useState("");
  const [tMaxTeams, setTMaxTeams] = useState("16");
  const [tStartDate, setTStartDate] = useState("");
  const [tLocation, setTLocation] = useState("");
  const [tSkillLevel, setTSkillLevel] = useState("Open");
  const [tStatus, setTStatus] = useState("Upcoming");
  const [tBannerUrl, setTBannerUrl] = useState("");  const [team1LogoFile, setTeam1LogoFile] = useState<File | null>(null);
  const [team2LogoFile, setTeam2LogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        try {
          const snap = await getDoc(doc(firestore, `users/${u.uid}`));
          if (snap.exists() && snap.data()?.role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsRoleLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubMatches = onValue(
      dbRef(db, "matches"),
      (snapshot) => setMatches(snapshot.val() ?? {}),
      (error) => setMessage(`Error reading matches: ${error.message}`),
    );
    const unsubTournaments = onValue(
      dbRef(db, "tournaments"),
      (snapshot) => setTournaments(snapshot.val() ?? {}),
      (error) => setMessage(`Error reading tournaments: ${error.message}`),
    );
    return () => {
      unsubMatches();
      unsubTournaments();
    };
  }, []);

  const visibleMatches = useMemo(() => {
    return Object.entries(matches)
      .filter(
        ([, match]) =>
          !user ||
          isAdmin ||
          match.meta.createdBy === user.uid ||
          match.meta.createdBy === "demo-user",
      )
      .sort(([, a], [, b]) => b.meta.createdAt - a.meta.createdAt);
  }, [matches, user, isAdmin]);

  const visibleTournaments = useMemo(() => {
    return Object.entries(tournaments)
      .filter(([, t]) => !user || isAdmin || t.createdBy === user.uid)
      .sort(([, a], [, b]) => b.createdAt - a.createdAt);
  }, [tournaments, user, isAdmin]);

  if (isRoleLoaded && !isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-on-surface">Access Denied</h1>
          <p className="text-on-surface-variant max-w-md">
            You do not have administrative privileges to manage Kixxi League matches.
          </p>
          <Link href="/" className="mt-8 px-6 py-2 bg-inverse-surface text-white font-bold rounded-lg hover:bg-inverse-surface">
            Return Home
          </Link>
        </div>
      </AppShell>
    );
  }

  async function handleLogin() {
    if (!auth) return setMessage("Add Firebase config before signing in.");
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function handleCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFirebaseConfigured)
      return setMessage(
        "Add Firebase config in .env.local before creating live tournaments.",
      );
    const tId = uuidv4();
    if (!user)
      return setMessage("Sign in with Google before creating a tournament.");

    setIsUploading(true);
    setMessage("Creating tournament...");

    try {
      const { set } = await import("firebase/database");
      await set(dbRef(requireDb(), `tournaments/${tId}`), {
        name: tournamentName,
        entryFee: tEntryFee,
        maxTeams: Number(tMaxTeams),
        startDate: tStartDate,
        location: tLocation,
        skillLevel: tSkillLevel,
        status: tStatus,
        bannerUrl: tBannerUrl,
        sport: "cricket",
        createdBy: user.uid,
        createdAt: Date.now(),
        teams: {},
        settings: { maxPlayersPerTeam: 15, defaultOvers: 20 },
      });
      setTournamentName("");
      setTEntryFee("");
      setTStartDate("");
      setTLocation("");
      setTBannerUrl("");
      setMessage(`Tournament created. Check the list.`);
    } catch (err: any) {
      setMessage(`Error creating tournament: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFirebaseConfigured)
      return setMessage(
        "Add Firebase config in .env.local before creating live matches.",
      );
    const matchId = uuidv4();
    if (!user)
      return setMessage("Sign in with Google before creating a live match.");
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

      const t1Roster = form.team1Roster.filter((p) => p.name.trim());
      const t2Roster = form.team2Roster.filter((p) => p.name.trim());

      const match = buildNewMatch(
        form.team1,
        form.team2,
        Number(form.overs),
        form.toss as "team1" | "team2",
        form.elected as "bat" | "field",
        createdBy,
        team1LogoUrl || undefined,
        team2LogoUrl || undefined,
        t1Roster,
        t2Roster,
        form.team1Color,
        form.team2Color,
      );

      if (form.team1Short) match.meta.team1Short = form.team1Short;
      if (form.team2Short) match.meta.team2Short = form.team2Short;

      await saveMatch(matchId, match);
      setMessage(
        `Match created. Open /match/${matchId}/score to start scoring.`,
      );
    } catch (err: any) {
      setMessage(
        `Error creating match: ${err.message}. Ensure your Realtime Database and Storage are created and rules are deployed.`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  function requireDb() {
    if (!db) throw new Error("Firebase is not configured.");
    return db;
  }

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[26rem_1fr]">
        <aside className="rounded-lg border border-outline bg-surface p-4 shadow-sm h-fit">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Dashboard</h1>
              <p className="text-sm text-on-surface-variant">
                {user ? user.displayName : "Firebase Google sign-in"}
              </p>
            </div>
            {user ? (
              <button
                className="rounded-md border border-outline p-2"
                onClick={() => auth && signOut(auth)}
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button
                className="rounded-md border border-outline p-2"
                onClick={handleLogin}
                title="Sign in"
              >
                <LogIn size={18} />
              </button>
            )}
          </div>

          <div className="mb-6 flex gap-2 border-b border-outline">
            <button
              className={`pb-2 px-2 text-sm font-black border-b-2 ${activeTab === "matches" ? "border-slate-900 text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setActiveTab("matches")}
            >
              Matches
            </button>
            <button
              className={`pb-2 px-2 text-sm font-black border-b-2 ${activeTab === "tournaments" ? "border-slate-900 text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setActiveTab("tournaments")}
            >
              Tournaments
            </button>
          </div>

          {activeTab === "matches" ? (
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="rounded-lg border border-outline-variant bg-surface-dim p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.team1Color}
                    onChange={(e) =>
                      setForm({ ...form, team1Color: e.target.value })
                    }
                    className="h-8 w-8 cursor-pointer rounded-md border-0 p-0"
                    title="Team 1 Color"
                  />
                  <div className="flex flex-1 gap-2">
                    <input
                      className="w-full rounded-md border border-outline px-3 py-2 font-bold"
                      value={form.team1}
                      onChange={(event) =>
                        setForm({ ...form, team1: event.target.value })
                      }
                      placeholder="Team 1 Name"
                    />
                    <input
                      className="w-20 shrink-0 rounded-md border border-outline px-3 py-2 font-bold text-center uppercase"
                      value={form.team1Short}
                      onChange={(event) =>
                        setForm({ ...form, team1Short: event.target.value.substring(0, 3).toUpperCase() })
                      }
                      placeholder="SHR"
                      maxLength={3}
                      title="3-letter Short Form for Logo"
                    />
                  </div>
                </div>
                <label className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-dim">
                  <Upload size={16} />
                  {team1LogoFile ? team1LogoFile.name : "Upload Team 1 Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setTeam1LogoFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold">
                      Roster ({form.team1Roster.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          team1Roster: [
                            ...form.team1Roster,
                            { name: "", role: "Player" },
                          ],
                        })
                      }
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      + Add Player
                    </button>
                  </div>
                  {form.team1Roster.map((player, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        required
                        className="w-full rounded-md border border-outline px-3 py-2 text-sm"
                        value={player.name}
                        onChange={(e) => {
                          const newRoster = [...form.team1Roster];
                          newRoster[idx].name = e.target.value;
                          setForm({ ...form, team1Roster: newRoster });
                        }}
                        placeholder={`Player ${idx + 1}`}
                      />
                      <select
                        className="rounded-md border border-outline px-2 py-2 text-sm"
                        value={player.role}
                        onChange={(e) => {
                          const newRoster = [...form.team1Roster];
                          newRoster[idx].role = e.target
                            .value as Player["role"];
                          setForm({ ...form, team1Roster: newRoster });
                        }}
                      >
                        <option value="Player">Player</option>
                        <option value="Batsman">Batsman</option>
                        <option value="Bowler">Bowler</option>
                        <option value="All-Rounder">All-Rounder</option>
                        <option value="Wicket-Keeper">Wicket-Keeper</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newRoster = [...form.team1Roster];
                          newRoster.splice(idx, 1);
                          setForm({ ...form, team1Roster: newRoster });
                        }}
                        className="text-on-surface-variant hover:text-primary"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-outline-variant bg-surface-dim p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.team2Color}
                    onChange={(e) =>
                      setForm({ ...form, team2Color: e.target.value })
                    }
                    className="h-8 w-8 cursor-pointer rounded-md border-0 p-0"
                    title="Team 2 Color"
                  />
                  <div className="flex flex-1 gap-2">
                    <input
                      className="w-full rounded-md border border-outline px-3 py-2 font-bold"
                      value={form.team2}
                      onChange={(event) =>
                        setForm({ ...form, team2: event.target.value })
                      }
                      placeholder="Team 2 Name"
                    />
                    <input
                      className="w-20 shrink-0 rounded-md border border-outline px-3 py-2 font-bold text-center uppercase"
                      value={form.team2Short}
                      onChange={(event) =>
                        setForm({ ...form, team2Short: event.target.value.substring(0, 3).toUpperCase() })
                      }
                      placeholder="SHR"
                      maxLength={3}
                      title="3-letter Short Form for Logo"
                    />
                  </div>
                </div>
                <label className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-dim">
                  <Upload size={16} />
                  {team2LogoFile ? team2LogoFile.name : "Upload Team 2 Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setTeam2LogoFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold">
                      Roster ({form.team2Roster.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          team2Roster: [
                            ...form.team2Roster,
                            { name: "", role: "Player" },
                          ],
                        })
                      }
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      + Add Player
                    </button>
                  </div>
                  {form.team2Roster.map((player, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        required
                        className="w-full rounded-md border border-outline px-3 py-2 text-sm"
                        value={player.name}
                        onChange={(e) => {
                          const newRoster = [...form.team2Roster];
                          newRoster[idx].name = e.target.value;
                          setForm({ ...form, team2Roster: newRoster });
                        }}
                        placeholder={`Player ${idx + 1}`}
                      />
                      <select
                        className="rounded-md border border-outline px-2 py-2 text-sm"
                        value={player.role}
                        onChange={(e) => {
                          const newRoster = [...form.team2Roster];
                          newRoster[idx].role = e.target
                            .value as Player["role"];
                          setForm({ ...form, team2Roster: newRoster });
                        }}
                      >
                        <option value="Player">Player</option>
                        <option value="Batsman">Batsman</option>
                        <option value="Bowler">Bowler</option>
                        <option value="All-Rounder">All-Rounder</option>
                        <option value="Wicket-Keeper">Wicket-Keeper</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newRoster = [...form.team2Roster];
                          newRoster.splice(idx, 1);
                          setForm({ ...form, team2Roster: newRoster });
                        }}
                        className="text-on-surface-variant hover:text-primary"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="block text-sm font-bold">
                  Overs
                  <input
                    className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                    min={1}
                    max={50}
                    type="number"
                    value={form.overs}
                    onChange={(event) =>
                      setForm({ ...form, overs: Number(event.target.value) })
                    }
                  />
                </label>
              </div>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pitch px-4 py-3 font-black text-white disabled:opacity-50"
                disabled={!isFirebaseConfigured || !user || isUploading}
              >
                <Plus size={18} />
                {isUploading ? "Creating..." : "Create Match"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCreateTournament}>
              <div className="rounded-lg border border-outline-variant bg-surface-dim p-3 space-y-3">
                <label className="block text-sm font-bold">
                  Tournament Name
                  <input required className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} placeholder="e.g. Summer Cup 2026" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold">Entry Fee
                    <input className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tEntryFee} onChange={(e) => setTEntryFee(e.target.value)} placeholder="e.g. $5,000" />
                  </label>
                  <label className="block text-sm font-bold">Max Teams
                    <input type="number" className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tMaxTeams} onChange={(e) => setTMaxTeams(e.target.value)} />
                  </label>
                  <label className="block text-sm font-bold">Start Date
                    <input className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tStartDate} onChange={(e) => setTStartDate(e.target.value)} placeholder="e.g. Oct 15, 2026" />
                  </label>
                  <label className="block text-sm font-bold">Location
                    <input className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tLocation} onChange={(e) => setTLocation(e.target.value)} placeholder="e.g. Downtown Arena" />
                  </label>
                  <label className="block text-sm font-bold">Skill Level
                    <select className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tSkillLevel} onChange={(e) => setTSkillLevel(e.target.value)}>
                      <option value="Pro">Pro</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Open">Open</option>
                      <option value="U18">U18</option>
                    </select>
                  </label>
                  <label className="block text-sm font-bold">Status
                    <select className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
                      <option value="Registering">Registering</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-bold">Banner Image URL
                  <input className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal" value={tBannerUrl} onChange={(e) => setTBannerUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
                </label>
              </div>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pitch px-4 py-3 font-black text-white disabled:opacity-50"
                disabled={
                  !isFirebaseConfigured ||
                  !user ||
                  isUploading ||
                  !tournamentName.trim()
                }
              >
                <Plus size={18} />
                {isUploading ? "Creating..." : "Create Tournament"}
              </button>
            </form>
          )}
          {message ? (
            <p className="mt-4 rounded-md bg-surface-variant p-3 text-sm font-medium text-on-surface">
              {message}
            </p>
          ) : null}
        </aside>

        <section>
          {activeTab === "matches" ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Matches</h2>
                <span className="text-sm font-bold text-on-surface-variant">
                  {visibleMatches.length} total
                </span>
              </div>
              <div className="space-y-3">
                {visibleMatches.length ? (
                  visibleMatches.map(([id, match]) => (
                    <article
                      key={id}
                      className="rounded-lg border border-outline bg-surface p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {match.meta.team1Logo ? (
                              <img
                                src={match.meta.team1Logo}
                                alt={match.meta.team1}
                                className="h-10 w-10 rounded-full border-2 border-surface object-cover shadow-sm bg-surface-variant"
                              />
                            ) : (
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-surface-variant text-xs font-black shadow-sm"
                                style={{
                                  backgroundColor: match.meta.team1Color,
                                }}
                              >
                                {match.meta.team1.substring(0, 3).toUpperCase()}
                              </div>
                            )}
                            {match.meta.team2Logo ? (
                              <img
                                src={match.meta.team2Logo}
                                alt={match.meta.team2}
                                className="h-10 w-10 rounded-full border-2 border-surface object-cover shadow-sm bg-surface-variant"
                              />
                            ) : (
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-surface-variant text-xs font-black shadow-sm"
                                style={{
                                  backgroundColor: match.meta.team2Color,
                                }}
                              >
                                {match.meta.team2.substring(0, 3).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-black leading-tight">
                              {match.meta.team1} vs {match.meta.team2}
                            </h3>
                            <p className="text-sm text-on-surface-variant">
                              {match.meta.overs} overs ·{" "}
                              <span className="capitalize">
                                {match.meta.status}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            className="flex items-center gap-1 rounded-md bg-inverse-surface px-3 py-2 text-sm font-black text-white"
                            href={`/match/${id}/score`}
                          >
                            <Smartphone size={16} /> {match.meta.status === "completed" ? "Edit Stats" : "Score"}
                          </Link>
                          {match.meta.status !== "completed" && (
                            <>
                              <Link
                                className="flex items-center gap-1 rounded-md border border-outline px-3 py-2 text-sm font-black"
                                href={`/match/${id}/live`}
                              >
                                <Eye size={16} /> Live
                              </Link>
                              <Link
                                className="flex items-center gap-1 rounded-md border border-outline px-3 py-2 text-sm font-black"
                                href={`/match/${id}/overlay`}
                              >
                                <MonitorUp size={16} /> Overlay
                              </Link>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this match?",
                                )
                              ) {
                                import("@/lib/firebaseMatches").then(
                                  ({ deleteMatch }) =>
                                    deleteMatch(id)
                                      .then(() => setMessage("Match deleted."))
                                      .catch((e) =>
                                        setMessage(`Error: ${e.message}`),
                                      ),
                                );
                              }
                            }}
                            className="flex items-center gap-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-black"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-outline bg-surface p-8 text-center text-on-surface-variant">
                    Created matches will appear here after Firebase is
                    connected.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Tournaments</h2>
                <span className="text-sm font-bold text-on-surface-variant">
                  {visibleTournaments.length} total
                </span>
              </div>
              <div className="space-y-3">
                {visibleTournaments.length ? (
                  visibleTournaments.map(([id, t]) => (
                    <article
                      key={id}
                      className="rounded-lg border border-outline bg-surface p-4 shadow-sm hover:border-outline transition-colors"
                    >
                      <Link href={`/tournament/${id}`} className="block">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black">{t.name}</h3>
                            <p className="text-sm text-on-surface-variant">
                              {Object.keys(t.teams || {}).length} teams
                            </p>
                          </div>
                          <div className="text-primary font-bold text-sm bg-surface-variant px-3 py-1.5 rounded-full">
                            Manage &rarr;
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-outline bg-surface p-8 text-center text-on-surface-variant">
                    Your tournaments will appear here.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </section>
    </AppShell>
  );
}
