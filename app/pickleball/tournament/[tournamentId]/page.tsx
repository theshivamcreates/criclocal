"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, use } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { onValue, ref as dbRef, remove } from "firebase/database";
import {
  Eye,
  LogIn,
  MonitorUp,
  Plus,
  Smartphone,
  Users,
  Trophy,
  Calendar,
  Upload,
  Pencil,
  Trash2,
  Play,
  ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { auth, db, storage, isFirebaseConfigured } from "@/lib/firebase";
import {
  deletePickleballMatch,
  savePickleballMatch,
  savePickleballTournament,
  subscribeToPickleballTournament,
  updatePickleballMatchMeta,
} from "@/lib/firebasePickleball";
import type {
  PickleballMatch,
  PickleballPlayer,
  PickleballTournament,
} from "@/types/pickleball";
import { v4 as uuidv4 } from "uuid";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function PickleballTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const tournamentId = resolvedParams.tournamentId;
  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<PickleballTournament | null>(null);
  const [matches, setMatches] = useState<Record<string, PickleballMatch>>({});
  const [activeTab, setActiveTab] = useState<"teams" | "matches" | "settings">(
    "matches",
  );

  // Team creation state
  const [teamForm, setTeamForm] = useState<{
    name: string;
    color: string;
    roster: PickleballPlayer[];
  }>({ name: "", color: "#1e40af", roster: [] });
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Match creation state
  const [matchForm, setMatchForm] = useState({
    team1: "",
    team2: "",
    scheduledDate: "",
    scheduledTime: "",
  });
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    entryFee: "",
    maxTeams: "16",
    startDate: "",
    location: "",
    skillLevel: "Open",
    status: "Upcoming",
    bannerUrl: "",
    format: "Doubles",
    maxSets: 3,
    pointsToWin: 11,
  });
  const [hasInitializedSettings, setHasInitializedSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubTournament = subscribeToPickleballTournament(tournamentId, (t) => {
      setTournament(t);
      setIsLoading(false);
    });
    const unsubMatches = onValue(
      dbRef(db, "pickleball/matches"),
      (snapshot) => setMatches(snapshot.val() ?? {}),
      (error) => setMessage(`Error reading matches: ${error.message}`),
    );
    return () => {
      unsubTournament();
      unsubMatches();
    };
  }, [tournamentId]);

  const tournamentMatches = useMemo(() => {
    return Object.entries(matches)
      .filter(([, match]) => match.meta.tournamentId === tournamentId)
      .sort(([, a], [, b]) => b.meta.createdAt - a.meta.createdAt);
  }, [matches, tournamentId]);

  const teamList = useMemo(() => {
    if (!tournament) return [];
    return Object.entries(tournament.teams || {}).map(([id, team]) => ({
      id,
      ...team,
    }));
  }, [tournament]);

  useEffect(() => {
    if (teamList.length >= 2 && !matchForm.team1 && !matchForm.team2) {
      setMatchForm((prev) => ({
        ...prev,
        team1: teamList[0].id,
        team2: teamList[1].id,
      }));
    }
  }, [teamList, matchForm.team1, matchForm.team2]);

  useEffect(() => {
    if (tournament && !hasInitializedSettings) {
      const s = tournament.settings || {
        format: "Doubles" as const,
        maxSets: 3,
        pointsToWin: 11,
      };
      setSettingsForm({
        name: tournament.name || "",
        entryFee: tournament.entryFee || "",
        maxTeams: tournament.maxTeams?.toString() || "16",
        startDate: tournament.startDate || "",
        location: tournament.location || "",
        skillLevel: tournament.skillLevel || "Open",
        status: tournament.status || "Upcoming",
        bannerUrl: tournament.bannerUrl || "",
        format: s.format || "Doubles",
        maxSets: s.maxSets || 3,
        pointsToWin: s.pointsToWin || 11,
      });
      setHasInitializedSettings(true);
    }
  }, [tournament, hasInitializedSettings]);

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!tournament) return;
    setIsUploading(true);
    setMessage("Saving settings...");
    try {
      await savePickleballTournament(tournamentId, {
        ...tournament,
        name: settingsForm.name,
        entryFee: settingsForm.entryFee,
        maxTeams: Number(settingsForm.maxTeams),
        startDate: settingsForm.startDate,
        location: settingsForm.location,
        skillLevel: settingsForm.skillLevel,
        status: settingsForm.status,
        bannerUrl: settingsForm.bannerUrl,
        settings: {
          format: settingsForm.format as "Singles" | "Doubles",
          maxSets: Number(settingsForm.maxSets),
          pointsToWin: Number(settingsForm.pointsToWin),
        },
      });
      setMessage("Settings saved!");
    } catch (err: any) {
      setMessage(`Error saving settings: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteTournament() {
    if (!confirm("Are you sure you want to delete this tournament? This action cannot be undone.")) return;
    try {
      await remove(dbRef(db, `pickleball/tournaments/${tournamentId}`));
      router.push("/dashboard/pickleball");
    } catch (err: any) {
      setMessage(`Error deleting tournament: ${err.message}`);
    }
  }

  async function handleAddTeam(e: FormEvent) {
    e.preventDefault();
    if (!tournament) return;
    if (!teamForm.name.trim()) return setMessage("Team name is required.");

    setIsUploading(true);
    setMessage(editingTeamId ? "Updating team..." : "Adding team...");

    try {
      const teamId = editingTeamId || uuidv4();
      let logoUrl = "";

      if (teamLogoFile && storage) {
        const logoRef = storageRef(storage, `logos/${tournamentId}_${teamId}`);
        await uploadBytes(logoRef, teamLogoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      const updatedTournament = {
        ...tournament,
        teams: {
          ...(tournament.teams || {}),
          [teamId]: {
            name: teamForm.name,
            color: teamForm.color,
            ...(logoUrl
              ? { logo: logoUrl }
              : editingTeamId && tournament.teams[editingTeamId]?.logo
                ? { logo: tournament.teams[editingTeamId].logo }
                : {}),
            roster: tournament.settings?.format === "Singles" ? [{ name: teamForm.name }] : teamForm.roster,
          },
        },
      };

      await savePickleballTournament(tournamentId, updatedTournament);
      setTeamForm({ name: "", color: "#1e40af", roster: [] });
      setTeamLogoFile(null);
      setEditingTeamId(null);
      setMessage(
        editingTeamId
          ? "Team updated successfully."
          : "Team added successfully.",
      );
    } catch (err: any) {
      setMessage(`Error saving team: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!tournament || !confirm("Are you sure you want to delete this team?"))
      return;
    try {
      const updatedTeams = { ...tournament.teams };
      delete updatedTeams[teamId];
      await savePickleballTournament(tournamentId, {
        ...tournament,
        teams: updatedTeams,
      });
      setMessage("Team deleted.");
    } catch (err: any) {
      setMessage(`Error deleting team: ${err.message}`);
    }
  }

  function handleEditTeamClick(teamId: string, team: any) {
    setEditingTeamId(teamId);
    setTeamForm({
      name: team.name,
      color: team.color || "#1e40af",
      roster: Array.isArray(team.roster) ? team.roster : [],
    });
    setTeamLogoFile(null);
    setActiveTab("teams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateMatch(e: FormEvent) {
    e.preventDefault();
    if (!user) return setMessage("Must be logged in.");
    if (!tournament) return;
    if (
      !matchForm.team1 ||
      !matchForm.team2 ||
      matchForm.team1 === matchForm.team2
    ) {
      return setMessage("Select two different teams.");
    }

    const t1 = tournament.teams[matchForm.team1];
    const t2 = tournament.teams[matchForm.team2];

    if (!t1 || !t2) return setMessage("Selected teams not found.");

    setIsUploading(true);
    setMessage(editingMatchId ? "Updating match..." : "Creating match...");

    try {
      const matchId = editingMatchId || uuidv4();
      let scheduledAt: number | undefined = undefined;

      if (matchForm.scheduledDate && matchForm.scheduledTime) {
        scheduledAt = new Date(
          `${matchForm.scheduledDate}T${matchForm.scheduledTime}`,
        ).getTime();
      }

      if (editingMatchId) {
        await updatePickleballMatchMeta(matchId, {
          team1: t1.name,
          team2: t2.name,
          team1Logo: t1.logo || "",
          team2Logo: t2.logo || "",
          team1Roster: t1.roster || [],
          team2Roster: t2.roster || [],
          team1Color: t1.color || "",
          team2Color: t2.color || "",
          ...(scheduledAt ? { scheduledAt } : {}),
        });
      } else {
        const match: PickleballMatch = {
          meta: {
            team1: t1.name,
            team2: t2.name,
            ...(t1.logo ? { team1Logo: t1.logo } : {}),
            ...(t2.logo ? { team2Logo: t2.logo } : {}),
            team1Roster: t1.roster || [],
            team2Roster: t2.roster || [],
            team1Color: t1.color || "",
            team2Color: t2.color || "",
            status: "scheduled",
            createdBy: user.uid,
            createdAt: Date.now(),
            tournamentId,
            ...(scheduledAt ? { scheduledAt } : {}),
            settings: {
              format: tournament.settings?.format || "Doubles",
              maxSets: tournament.settings?.maxSets || 3,
              pointsToWin: tournament.settings?.pointsToWin || 11,
            },
          },
          score: { team1: { points: 0, sets: 0 }, team2: { points: 0, sets: 0 } },
          timer: { isRunning: false, seconds: 0, lastUpdated: Date.now() },
          result: null,
        };
        await savePickleballMatch(matchId, match);
      }

      setMessage(editingMatchId ? "Match updated!" : "Match created!");
      setEditingMatchId(null);
      setMatchForm((prev) => ({
        ...prev,
        scheduledDate: "",
        scheduledTime: "",
      }));
    } catch (err: any) {
      setMessage(`Error saving match: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteMatchAction(matchId: string) {
    if (!confirm("Are you sure you want to delete this match?")) return;
    try {
      await deletePickleballMatch(matchId);
      setMessage("Match deleted.");
    } catch (err: any) {
      setMessage(`Error deleting match: ${err.message}`);
    }
  }

  async function handleGoLive(matchId: string) {
    try {
      await updatePickleballMatchMeta(matchId, { status: "live" });
      setMessage("Match is now LIVE!");
    } catch (err: any) {
      setMessage(`Error starting match: ${err.message}`);
    }
  }

  function handleEditMatchClick(matchId: string, match: PickleballMatch) {
    const t1Id =
      Object.keys(tournament?.teams || {}).find(
        (k) => tournament?.teams[k].name === match.meta.team1,
      ) || "";
    const t2Id =
      Object.keys(tournament?.teams || {}).find(
        (k) => tournament?.teams[k].name === match.meta.team2,
      ) || "";

    setEditingMatchId(matchId);
    setMatchForm({
      team1: t1Id,
      team2: t2Id,
      scheduledDate: match.meta.scheduledAt
        ? new Date(match.meta.scheduledAt).toISOString().split("T")[0]
        : "",
      scheduledTime: match.meta.scheduledAt
        ? new Date(match.meta.scheduledAt)
            .toISOString()
            .split("T")[1]
            .substring(0, 5)
        : "",
    });
    setActiveTab("matches");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-on-surface-variant font-medium mt-10">
          Loading tournament data...
        </div>
      </AppShell>
    );
  }

  if (!tournament) {
    return (
      <AppShell>
        <div className="p-8 text-center mt-10">
          <h2 className="text-2xl font-black mb-2">Tournament Not Found</h2>
          <p className="text-on-surface-variant mb-6">
            This tournament may have been deleted, or the URL is incorrect.
          </p>
          <Link
            href="/dashboard/pickleball"
            className="px-6 py-3 bg-primary text-white rounded-lg font-black inline-flex items-center gap-2"
          >
            Return to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="bg-surface-dim border-b border-outline py-8">
        <div className="mx-auto max-w-6xl px-4 flex items-center gap-4">
          <div className="bg-primary-container p-4 rounded-xl border border-outline-variant">
            <Trophy size={48} className="text-primary" />
          </div>
          <div>
            <div className="mb-2">
              <Link
                href="/dashboard/pickleball"
                className="text-sm font-bold text-on-surface-variant hover:text-primary flex items-center gap-1"
              >
                <ArrowLeft size={16} /> Back to dashboard
              </Link>
            </div>
            <h1 className="text-4xl font-black text-on-surface">{tournament.name}</h1>
            <p className="text-on-surface-variant font-medium mt-1">
              Created {new Date(tournament.createdAt).toLocaleDateString()} ·{" "}
              {teamList.length} Teams
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-4 mb-8">
          <button
            className={`px-6 py-3 font-black rounded-lg transition-colors ${activeTab === "matches" ? "bg-primary text-white" : "bg-surface text-on-surface-variant border border-outline hover:bg-surface-dim"}`}
            onClick={() => setActiveTab("matches")}
          >
            Schedule & Matches
          </button>
          <button
            className={`px-6 py-3 font-black rounded-lg transition-colors ${activeTab === "teams" ? "bg-primary text-white" : "bg-surface text-on-surface-variant border border-outline hover:bg-surface-dim"}`}
            onClick={() => setActiveTab("teams")}
          >
            {tournament.settings?.format === "Singles" ? "Players" : "Teams Roster"}
          </button>
          <button
            className={`px-6 py-3 font-black rounded-lg transition-colors ${activeTab === "settings" ? "bg-primary text-white" : "bg-surface text-on-surface-variant border border-outline hover:bg-surface-dim"}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {activeTab === "teams" ? (
          <div className="grid lg:grid-cols-[24rem_1fr] gap-6">
            <aside className="rounded-lg border border-outline bg-surface p-5 shadow-sm h-fit">
              <h2 className="text-lg font-black mb-4">
                {tournament.settings?.format === "Singles" ? (editingTeamId ? "Edit Player" : "Add Player") : (editingTeamId ? "Edit Team" : "Add Team")}
              </h2>

              {message && (
                <div
                  className={`mb-4 rounded-md p-3 text-sm font-medium ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                >
                  {message}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleAddTeam}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, color: e.target.value })
                    }
                    className="h-10 w-10 cursor-pointer rounded-md border-0 p-0"
                    title="Team Color"
                  />
                  <input
                    required
                    className="w-full rounded-md border border-outline px-3 py-2 font-bold"
                    value={teamForm.name}
                    onChange={(event) =>
                      setTeamForm({ ...teamForm, name: event.target.value })
                    }
                    placeholder={tournament.settings?.format === "Singles" ? "Player Name" : "Team Name"}
                  />
                </div>

                <label className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-dim">
                  <Upload size={16} />
                  {teamLogoFile ? teamLogoFile.name : (tournament.settings?.format === "Singles" ? "Upload Photo (Optional)" : "Upload Logo (Optional)")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setTeamLogoFile(e.target.files?.[0] || null)
                    }
                  />
                </label>

                {tournament.settings?.format !== "Singles" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold">
                        Squad ({teamForm.roster.length}/25)
                      </label>
                      {teamForm.roster.length < 25 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTeamForm({
                              ...teamForm,
                              roster: [
                                ...teamForm.roster,
                                { name: "" },
                              ],
                            })
                          }
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          + Add Player
                        </button>
                      )}
                    </div>
                    {teamForm.roster.map((player, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          required
                          className="w-full rounded-md border border-outline px-3 py-2 text-sm"
                          value={player.name}
                          onChange={(e) => {
                            const newRoster = [...teamForm.roster];
                            newRoster[idx].name = e.target.value;
                            setTeamForm({ ...teamForm, roster: newRoster });
                          }}
                          placeholder={`Player ${idx + 1}`}
                        />
                        <span className="rounded-md border border-outline bg-surface-dim px-3 py-2 text-sm text-on-surface-variant flex items-center justify-center">Player</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newRoster = [...teamForm.roster];
                            newRoster.splice(idx, 1);
                            setTeamForm({ ...teamForm, roster: newRoster });
                          }}
                          className="text-on-surface-variant hover:text-primary"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {editingTeamId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeamId(null);
                        setTeamForm({ name: "", color: "#1e40af", roster: [] });
                      }}
                      className="w-full rounded-lg bg-slate-200 px-4 py-3 font-black text-on-surface"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-container px-4 py-3 font-black text-white disabled:opacity-50"
                    disabled={isUploading || !teamForm.name}
                  >
                    {editingTeamId ? (
                      tournament.settings?.format === "Singles" ? "Update Player" : "Update Team"
                    ) : (
                      <>
                        <Plus size={18} /> {tournament.settings?.format === "Singles" ? "Add Player" : "Add Team"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </aside>
            <section className="grid sm:grid-cols-2 gap-4 h-fit">
              {teamList.map((team) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-outline bg-surface p-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm bg-surface-variant flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-surface-variant font-black shadow-sm text-white"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.name.substring(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-lg">{team.name}</h3>
                        {tournament.settings?.format !== "Singles" && (
                          <p className="text-sm text-on-surface-variant mt-1">
                            {team.roster?.length || 0} players registered
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTeamClick(team.id, team)}
                        className="text-on-surface-variant hover:text-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-on-surface-variant hover:text-primary"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {teamList.length === 0 && (
                <div className="sm:col-span-2 rounded-lg border border-dashed border-outline bg-surface p-8 text-center text-on-surface-variant">
                  {tournament.settings?.format === "Singles" ? "No players added yet. Add players to start scheduling matches." : "No teams added yet. Add teams to start scheduling matches."}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === "matches" ? (
          <div className="grid lg:grid-cols-[26rem_1fr] gap-6">
            <aside className="rounded-lg border border-outline bg-surface p-5 shadow-sm h-fit">
              <h2 className="text-lg font-black mb-4">Schedule Match</h2>
              {teamList.length < 2 ? (
                <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 font-medium">
                  {tournament.settings?.format === "Singles" ? "Add at least 2 players in the Players tab to schedule a match." : "Add at least 2 teams in the Teams tab to schedule a match."}
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleCreateMatch}>
                  <div className="space-y-3 p-4 rounded-lg bg-surface-dim border border-outline-variant">
                    <label className="block text-sm font-bold">
                      {tournament.settings?.format === "Singles" ? "Player 1" : "Home Team (Team 1)"}
                      <select
                        required
                        className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                        value={matchForm.team1}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, team1: e.target.value })
                        }
                      >
                        <option value="">{tournament.settings?.format === "Singles" ? "Select Player" : "Select Team"}</option>
                        {teamList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-center font-black text-on-surface-variant text-sm">
                      VS
                    </div>
                    <label className="block text-sm font-bold">
                      {tournament.settings?.format === "Singles" ? "Player 2" : "Away Team (Team 2)"}
                      <select
                        required
                        className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                        value={matchForm.team2}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, team2: e.target.value })
                        }
                      >
                        <option value="">{tournament.settings?.format === "Singles" ? "Select Player" : "Select Team"}</option>
                        {teamList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <label className="block text-sm font-bold">
                      Scheduled Date
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                        value={matchForm.scheduledDate}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            scheduledDate: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm font-bold">
                      Scheduled Time
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                        value={matchForm.scheduledTime}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            scheduledTime: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    {editingMatchId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMatchId(null);
                          setMatchForm((prev) => ({
                            ...prev,
                            scheduledDate: "",
                            scheduledTime: "",
                          }));
                        }}
                        className="w-full rounded-lg bg-slate-200 px-4 py-3 font-black text-on-surface"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-container px-4 py-3 font-black text-white disabled:opacity-50"
                      disabled={isUploading}
                    >
                      <Calendar size={18} />{" "}
                      {editingMatchId ? "Update Match" : "Schedule Match"}
                    </button>
                  </div>
                </form>
              )}
            </aside>

            <section className="space-y-4">
              {tournamentMatches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline bg-surface p-8 text-center text-on-surface-variant">
                  No matches scheduled yet.
                </div>
              ) : (
                tournamentMatches.map(([id, match]) => (
                  <article
                    key={id}
                    className="rounded-lg border border-outline bg-surface p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {match.meta.team1Logo ? (
                            <img
                              src={match.meta.team1Logo}
                              alt={match.meta.team1}
                              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm bg-surface-variant"
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-surface-variant text-xs font-black shadow-sm text-white"
                              style={{ backgroundColor: match.meta.team1Color }}
                            >
                              {match.meta.team1.substring(0, 3).toUpperCase()}
                            </div>
                          )}
                          {match.meta.team2Logo ? (
                            <img
                              src={match.meta.team2Logo}
                              alt={match.meta.team2}
                              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm bg-surface-variant"
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-surface-variant text-xs font-black shadow-sm text-white"
                              style={{ backgroundColor: match.meta.team2Color }}
                            >
                              {match.meta.team2.substring(0, 3).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-black leading-tight">
                            {match.meta.team1} vs {match.meta.team2}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wide ${match.meta.status === "live" ? "bg-red-100 text-red-700" : match.meta.status === "completed" ? "bg-emerald-100 text-emerald-700" : match.meta.status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-primary text-primary"}`}
                            >
                              {match.meta.status}
                            </span>
                            {match.meta.scheduledAt && (
                              <span className="text-sm text-on-surface-variant font-medium ml-2">
                                •{" "}
                                {new Date(
                                  match.meta.scheduledAt,
                                ).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.meta.status === "scheduled" && (
                          <>
                            <button
                              onClick={() => handleGoLive(id)}
                              className="flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 px-3 py-2 text-sm font-black text-white"
                            >
                              <Play size={16} /> Go Live
                            </button>
                            <button
                              onClick={() => handleEditMatchClick(id, match)}
                              className="flex items-center gap-1 rounded-md border border-outline hover:bg-surface-dim px-3 py-2 text-sm font-black"
                            >
                              <Pencil size={16} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMatchAction(id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-black"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </>
                        )}
                        {(match.meta.status === "upcoming" ||
                          match.meta.status === "live") && (
                          <>
                            <Link
                              className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-black text-white"
                              href={`/pickleball/match/${id}/score`}
                            >
                              <Smartphone size={16} /> Controller
                            </Link>
                            <button
                              onClick={() => handleEditMatchClick(id, match)}
                              className="flex items-center gap-1 rounded-md border border-outline hover:bg-surface-dim px-3 py-2 text-sm font-black"
                            >
                              <Pencil size={16} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMatchAction(id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-black"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </>
                        )}
                        {match.meta.status === "completed" && (
                          <>
                            <button
                              onClick={() => handleDeleteMatchAction(id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-black"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {match.meta.status === "completed" && match.score && (
                      <div className="bg-surface-dim rounded-lg p-4 border border-outline-variant flex justify-center items-center gap-8">
                        <div className="text-center">
                          <h4 className="font-bold text-on-surface">
                            {match.meta.team1}
                          </h4>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Sets: {match.score.team1?.sets ?? 0}</span>
                            <span className="font-black text-3xl text-primary">
                              {match.score.team1?.points ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="font-black text-outline-variant text-2xl">
                          -
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-on-surface">
                            {match.meta.team2}
                          </h4>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Sets: {match.score.team2?.sets ?? 0}</span>
                            <span className="font-black text-3xl text-primary">
                              {match.score.team2?.points ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          </div>
        ) : activeTab === "settings" ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-black">Tournament Settings</h2>

            {message && (
              <div
                className={`rounded-md p-3 text-sm font-medium ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-primary-container text-emerald-700"}`}
              >
                {message}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSaveSettings}>
              <div className="rounded-lg border border-outline bg-surface p-6 space-y-6">
                <h3 className="text-lg font-black uppercase text-on-surface-variant tracking-wider">Configuration</h3>
                <label className="block text-sm font-bold">
                  Tournament Name
                  <input
                    required
                    className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="block text-sm font-bold">
                    Format
                    <select
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.format}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          format: e.target.value,
                        })
                      }
                    >
                      <option value="Singles">Singles</option>
                      <option value="Doubles">Doubles</option>
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Max Sets
                    <select
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.maxSets}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          maxSets: Number(e.target.value),
                        })
                      }
                    >
                      <option value="1">1</option>
                      <option value="3">Best of 3</option>
                      <option value="5">Best of 5</option>
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Points to Win
                    <select
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.pointsToWin}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          pointsToWin: Number(e.target.value),
                        })
                      }
                    >
                      <option value="11">11</option>
                      <option value="15">15</option>
                      <option value="21">21</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-outline bg-surface p-6 space-y-6">
                <h3 className="text-lg font-black uppercase text-on-surface-variant tracking-wider">Tournament Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="block text-sm font-bold">
                    Entry Fee
                    <input
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.entryFee}
                      onChange={(e) => setSettingsForm({ ...settingsForm, entryFee: e.target.value })}
                      placeholder="e.g. $1,500"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Max Teams
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.maxTeams}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxTeams: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Start Date
                    <input
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.startDate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                      placeholder="e.g. Nov 01, 2026"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Location
                    <input
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.location}
                      onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                      placeholder="e.g. Westside Courts"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Skill Level
                    <select
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.skillLevel}
                      onChange={(e) => setSettingsForm({ ...settingsForm, skillLevel: e.target.value })}
                    >
                      <option value="Pro">Pro</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Open">Open</option>
                      <option value="U18">U18</option>
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                      value={settingsForm.status}
                      onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                    >
                      <option value="Registering">Registering</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-bold">
                  Banner Image URL
                  <input
                    className="mt-1 w-full rounded-md border border-outline px-3 py-2 font-normal"
                    value={settingsForm.bannerUrl}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bannerUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                  />
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="rounded-lg bg-inverse-surface px-6 py-3 font-black text-white hover:bg-surface-variant hover:text-on-surface"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTournament}
                  className="rounded-lg bg-primary px-6 py-3 font-black text-white hover:bg-primary-container"
                >
                  Delete Tournament
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
