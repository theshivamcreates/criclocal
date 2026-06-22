"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import {
  ChevronLeft,
  Flag,
  Play,
  Pause,
  RotateCcw,
  MonitorUp,
  Settings,
  Plus,
  Minus,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  subscribeToPickleballMatch,
  updatePickleballScore,
  updatePickleballPlayerScore,
  completePickleballMatch,
  addPickleballEvent,
  reopenPickleballMatch,
  updatePickleballMatchMeta,
} from "@/lib/firebasePickleball";
import { useAdmin } from "@/hooks/useAdmin";
import type { PickleballMatch } from "@/types/pickleball";

export default function PickleballScorePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const [match, setMatch] = useState<PickleballMatch | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTeam, setEventTeam] = useState<"team1" | "team2" | null>(null);
  const [scorerName, setScorerName] = useState("");
  const [eventType, setEventType] = useState<"point" | "fault" | "timeout">("point");
  const [eventTime, setEventTime] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    return subscribeToPickleballMatch(matchId, setMatch);
  }, [matchId]);

  const handleUpdateScore = async (team: "team1" | "team2", type: "points" | "sets", delta: number) => {
    updatePickleballScore(matchId, team, type, delta);
    if (type === "points" && delta > 0 && match) {
      addPickleballEvent(matchId, {
        team,
        type: "point",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scorerName: match.meta[team],
      });
    }
  };

  const handleUpdatePlayerScore = async (team: "team1" | "team2", playerName: string, delta: number) => {
    updatePickleballPlayerScore(matchId, team, playerName, delta);
    if (delta > 0 && match) {
      addPickleballEvent(matchId, {
        team,
        type: "point",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scorerName: playerName,
      });
    }
  };

  const handleOpenEventModal = (team: "team1" | "team2") => {
    setEventTeam(team);
    setEventTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setScorerName("");
    setEventType("point");
    setEventModalOpen(true);
  };

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !eventTeam) return;
    
    const eventData: any = {
      team: eventTeam,
      time: eventTime,
      type: eventType,
      setNumber: match.score.team1.sets + match.score.team2.sets + 1,
    };
    if (scorerName) eventData.scorerName = scorerName;

    if (eventType === "point") {
      if (scorerName) {
        updatePickleballPlayerScore(matchId, eventTeam, scorerName, 1);
      } else {
        updatePickleballScore(matchId, eventTeam, "points", 1);
      }
    }

    addPickleballEvent(matchId, eventData);
    setEventModalOpen(false);
  };

  if (!match || loading) {
    return (
      <AppShell>
        <div className="min-h-[85vh] flex items-center justify-center bg-inverse-surface">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-surface-bright font-black uppercase tracking-widest text-xs animate-pulse">Loading Match Data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-variant">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline bg-surface px-4 py-3 shadow-sm">
        <Link
          href="/dashboard/pickleball"
          className="flex items-center gap-1 font-bold text-primary"
        >
          <ChevronLeft size={20} /> Dashboard
        </Link>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
            Match Control Center
          </p>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${match.meta.status === "live" ? "bg-primary animate-pulse" : "bg-slate-300"}`}
            ></span>
            <h1 className="text-sm font-black">
              {match.meta.team1} vs {match.meta.team2}
            </h1>
          </div>
        </div>
        <Link
          href={`/pickleball/match/${matchId}/overlay`}
          target="_blank"
          className="flex items-center gap-1 rounded-md bg-inverse-surface px-3 py-1.5 text-sm font-bold text-white shadow-sm"
        >
          <MonitorUp size={16} /> Overlay
        </Link>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        {match.meta.status === "completed" ? (
          <div className="bg-surface rounded-2xl shadow-xl border border-outline overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white flex flex-col items-center">
              <h2 className="text-sm font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-6">Full Time</h2>
              <div className="flex items-center justify-center gap-3 sm:gap-8 w-full">
                <div className="flex flex-col items-center flex-1">
                  {match.meta.team1Logo && match.meta.settings.format !== "Singles" ? (
                    <img src={match.meta.team1Logo} alt={match.meta.team1} className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 shadow-lg mb-2 sm:mb-3 object-cover bg-surface" style={{ borderColor: match.meta.team1Color }} />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full shadow-lg mb-2 sm:mb-3 flex items-center justify-center text-white font-black text-xl sm:text-3xl" style={{ backgroundColor: match.meta.team1Color || "#1e40af" }}>
                      {match.meta.team1.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-black text-xs sm:text-xl text-center">{match.meta.team1}</h3>
                  {match.meta.settings.format === "Doubles" && (
                    <div className="mt-4 flex flex-col gap-1 w-full max-w-[150px]">
                      {(match.meta.team1Roster || []).map((player, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-surface/10 rounded px-2 py-1">
                          <span className="font-bold opacity-80 truncate">{player.name || `Player ${idx+1}`}</span>
                          <span className="font-black">{match.score.team1.playerPoints?.[player.name] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-xl sm:text-3xl font-black tabular-nums tracking-tighter shrink-0 flex flex-col items-center justify-center gap-1 sm:gap-2">
                  <div className="text-sm font-bold text-on-surface-variant uppercase">Sets</div>
                  <div className="flex items-center gap-2">
                    <span>{match.score.team1.sets}</span>
                    <span className="text-on-surface-variant">-</span>
                    <span>{match.score.team2.sets}</span>
                  </div>
                  <div className="text-sm font-bold text-on-surface-variant uppercase mt-2">Points</div>
                  <div className="flex items-center gap-2 text-4xl sm:text-6xl text-primary">
                    <span>{match.score.team1.points}</span>
                    <span className="text-on-surface-variant">-</span>
                    <span>{match.score.team2.points}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center flex-1">
                  {match.meta.team2Logo && match.meta.settings.format !== "Singles" ? (
                    <img src={match.meta.team2Logo} alt={match.meta.team2} className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 shadow-lg mb-2 sm:mb-3 object-cover bg-surface" style={{ borderColor: match.meta.team2Color }} />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full shadow-lg mb-2 sm:mb-3 flex items-center justify-center text-white font-black text-xl sm:text-3xl" style={{ backgroundColor: match.meta.team2Color || "#e11d48" }}>
                      {match.meta.team2.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-black text-xs sm:text-xl text-center">{match.meta.team2}</h3>
                  {match.meta.settings.format === "Doubles" && (
                    <div className="mt-4 flex flex-col gap-1 w-full max-w-[150px]">
                      {(match.meta.team2Roster || []).map((player, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-surface/10 rounded px-2 py-1">
                          <span className="font-bold opacity-80 truncate">{player.name || `Player ${idx+1}`}</span>
                          <span className="font-black">{match.score.team2.playerPoints?.[player.name] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-surface">
              <h3 className="text-center font-black text-on-surface uppercase tracking-widest text-sm mb-6 border-b border-outline-variant pb-4">Match Events</h3>
              <div className="flex flex-col gap-4 max-w-lg mx-auto relative before:absolute before:inset-0 before:left-1/2 before:-ml-px before:h-full before:w-0.5 before:bg-surface-variant">
                {(!match.events || Object.keys(match.events).length === 0) ? (
                  <p className="text-center text-on-surface-variant italic py-4 bg-surface relative z-10">No events recorded.</p>
                ) : (
                  Object.values(match.events)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((evt) => (
                      <div key={evt.id} className="flex items-center w-full bg-surface relative z-10 my-2">
                        <div className="w-1/2 pr-6">
                          {evt.team === "team1" && (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-on-surface">
                                {evt.scorerName || "Unknown Player"} {evt.type === "point" ? "🏓" : evt.type === "fault" ? "❌" : "⏱️"}
                              </span>
                              <span className="text-xs text-on-surface-variant font-medium capitalize">{evt.type}</span>
                            </div>
                          )}
                        </div>
                        <div className="w-14 h-8 rounded-full bg-surface-variant border border-outline flex items-center justify-center font-mono text-xs font-bold text-on-surface-variant shrink-0 z-10 shadow-sm relative left-[-2px]">
                          {evt.time}
                        </div>
                        <div className="w-1/2 pl-6">
                          {evt.team === "team2" && (
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-on-surface">
                                {evt.type === "point" ? "🏓" : evt.type === "fault" ? "❌" : "⏱️"} {evt.scorerName || "Unknown Player"}
                              </span>
                              <span className="text-xs text-on-surface-variant font-medium capitalize">{evt.type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="bg-surface-dim p-4 border-t border-outline flex justify-center gap-4">
              <Link href="/dashboard/pickleball" className="px-6 py-2 rounded-lg bg-inverse-surface text-white font-bold text-sm shadow-md hover:bg-inverse-surface">
                Exit to Dashboard
              </Link>
              <button onClick={() => { if(confirm("Are you sure you want to reopen this match for editing?")) reopenPickleballMatch(matchId); }} className="px-6 py-2 rounded-lg border border-outline text-on-surface-variant font-bold text-sm bg-surface hover:bg-surface-dim shadow-sm">
                Edit Match
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* SCORE CONTROL SECTION */}
        <div className="bg-surface rounded-2xl shadow-sm border border-outline overflow-hidden">
          <div className="bg-surface-dim p-3 border-b border-outline flex justify-between items-center">
            <h2 className="font-black text-on-surface uppercase text-sm tracking-wider flex items-center gap-2">
              <Flag size={16} /> Score Control
            </h2>
            <div className="flex flex-col items-center gap-1 font-mono font-black text-center bg-surface px-4 py-1 rounded-md border border-outline shadow-inner">
              <span className="text-xs text-on-surface-variant tracking-widest uppercase">Sets</span>
              <span className="text-xl">{match.score.team1.sets} - {match.score.team2.sets}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Team 1 */}
            <div className="p-6 flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                {match.meta.team1Logo && match.meta.settings.format !== "Singles" ? (
                  <img
                    src={match.meta.team1Logo}
                    alt={match.meta.team1}
                    className="w-16 h-16 rounded-full border-2 shadow-sm mb-2"
                    style={{ borderColor: match.meta.team1Color }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full shadow-sm mb-2 flex items-center justify-center text-white font-black text-xl"
                    style={{
                      backgroundColor: match.meta.team1Color || "#1e40af",
                    }}
                  >
                    {match.meta.team1.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="font-black text-xl text-center">
                  {match.meta.team1}
                </h3>
              </div>

              {/* Team 1 Sets */}
              {match.meta.settings.maxSets > 1 && (
                <div className="flex items-center justify-between w-full max-w-[200px] mb-4 bg-surface-dim rounded-full p-1 border border-outline">
                  <button
                    onClick={() => handleUpdateScore("team1", "sets", -1)}
                    disabled={match.score.team1.sets <= 0}
                    className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center hover:bg-slate-300 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Sets</span>
                    <span className="text-2xl font-black leading-none">{match.score.team1.sets}</span>
                  </div>
                  <button
                    onClick={() => handleUpdateScore("team1", "sets", 1)}
                    className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center hover:bg-slate-300"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Team 1 Points */}
              <div className="flex flex-col w-full items-center">
                <div className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Points</div>
                <div className="text-6xl font-black text-on-surface w-20 text-center text-primary mb-4">
                  {match.score.team1.points}
                </div>
                <div className="flex items-center justify-center gap-2 w-full">
                  <button
                    onClick={() => handleUpdateScore("team1", "points", -1)}
                    disabled={match.score.team1.points <= 0}
                    className="w-12 h-12 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus size={20} />
                  </button>
                  
                  {match.meta.settings.format === "Doubles" ? (
                    <div className="flex flex-col gap-2">
                      {(match.meta.team1Roster || []).map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleUpdatePlayerScore("team1", p.name, 1)}
                          className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-container shadow-sm whitespace-nowrap"
                        >
                          + {p.name || `Player ${i+1}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpdateScore("team1", "points", 1)}
                      className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container shadow-md"
                    >
                      <Plus size={20} />
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEventModal("team1")}
                    className="w-12 h-12 rounded-full bg-surface-variant text-primary flex items-center justify-center hover:bg-slate-200 shadow-sm ml-2"
                    title="Record Event"
                  >
                    <Flag size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Team 2 */}
            <div className="p-6 flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                {match.meta.team2Logo && match.meta.settings.format !== "Singles" ? (
                  <img
                    src={match.meta.team2Logo}
                    alt={match.meta.team2}
                    className="w-16 h-16 rounded-full border-2 shadow-sm mb-2"
                    style={{ borderColor: match.meta.team2Color }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full shadow-sm mb-2 flex items-center justify-center text-white font-black text-xl"
                    style={{
                      backgroundColor: match.meta.team2Color || "#e11d48",
                    }}
                  >
                    {match.meta.team2.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="font-black text-xl text-center">
                  {match.meta.team2}
                </h3>
              </div>

              {/* Team 2 Sets */}
              {match.meta.settings.maxSets > 1 && (
                <div className="flex items-center justify-between w-full max-w-[200px] mb-4 bg-surface-dim rounded-full p-1 border border-outline">
                  <button
                    onClick={() => handleUpdateScore("team2", "sets", -1)}
                    disabled={match.score.team2.sets <= 0}
                    className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center hover:bg-slate-300 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Sets</span>
                    <span className="text-2xl font-black leading-none">{match.score.team2.sets}</span>
                  </div>
                  <button
                    onClick={() => handleUpdateScore("team2", "sets", 1)}
                    className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center hover:bg-slate-300"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Team 2 Points */}
              <div className="flex flex-col w-full items-center">
                <div className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-2">Points</div>
                <div className="text-6xl font-black text-on-surface w-20 text-center text-primary mb-4">
                  {match.score.team2.points}
                </div>
                <div className="flex items-center justify-center gap-2 w-full">
                  <button
                    onClick={() => handleUpdateScore("team2", "points", -1)}
                    disabled={match.score.team2.points <= 0}
                    className="w-12 h-12 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus size={20} />
                  </button>
                  
                  {match.meta.settings.format === "Doubles" ? (
                    <div className="flex flex-col gap-2">
                      {(match.meta.team2Roster || []).map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleUpdatePlayerScore("team2", p.name, 1)}
                          className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-container shadow-sm whitespace-nowrap"
                        >
                          + {p.name || `Player ${i+1}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpdateScore("team2", "points", 1)}
                      className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container shadow-md"
                    >
                      <Plus size={20} />
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEventModal("team2")}
                    className="w-12 h-12 rounded-full bg-surface-variant text-primary flex items-center justify-center hover:bg-slate-200 shadow-sm ml-2"
                    title="Record Event"
                  >
                    <Flag size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OVERLAY SETTINGS */}
        <div className="bg-surface rounded-2xl shadow-sm border border-outline overflow-hidden mt-6">
          <div className="bg-surface-dim p-3 border-b border-outline">
            <h2 className="font-black text-on-surface uppercase text-sm tracking-wider flex items-center gap-2">
              <MonitorUp size={16} /> Overlay Settings
            </h2>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold mb-1">Match Title</label>
              <input 
                className="w-full rounded-md border border-outline px-3 py-2"
                value={match.meta.matchTitle || ""}
                onChange={(e) => updatePickleballMatchMeta(matchId, { matchTitle: e.target.value })}
                placeholder="e.g. Finals - Match 1"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Overlay Logo</label>
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-dim">
                <Upload size={16} />
                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingLogo(true);
                    try {
                      const imageCompression = (await import("browser-image-compression")).default;
                      const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 800,
                        useWebWorker: true,
                      };
                      const compressedFile = await imageCompression(file, options);
                      
                      // Get ImageKit Auth
                      const authResponse = await fetch("/api/imagekit/auth");
                      if (!authResponse.ok) throw new Error("Failed to authenticate ImageKit");
                      const authData = await authResponse.json();
                      
                      if (authData.error) throw new Error(authData.error);
                      
                      const formData = new FormData();
                      formData.append("file", compressedFile);
                      formData.append("fileName", `overlay_${matchId}_${Date.now()}.png`);
                      formData.append("publicKey", process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "");
                      formData.append("signature", authData.signature);
                      formData.append("expire", authData.expire.toString());
                      formData.append("token", authData.token);
                      formData.append("folder", "/pickleball_logos"); 

                      const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (!uploadResponse.ok) throw new Error("Upload failed");
                      const uploadResult = await uploadResponse.json();
                      const optimizedUrl = `${uploadResult.url}?tr=w-800,f-auto`;
                      
                      await updatePickleballMatchMeta(matchId, { overlayLogo: optimizedUrl });
                      setUploadSuccess("Upload successful!");
                      setTimeout(() => setUploadSuccess(""), 3000);
                    } catch (err) {
                      console.error("Upload error:", err);
                      alert("Upload failed.");
                    } finally {
                      setIsUploadingLogo(false);
                    }
                  }}
                />
              </label>
              <div className="flex items-center gap-3 mt-3">
                {match.meta.overlayLogo && (
                  <>
                    <div className="h-12 w-auto bg-surface-dim border border-outline rounded p-1">
                      <img src={match.meta.overlayLogo} className="h-full object-contain" alt="Overlay Logo" />
                    </div>
                    <button
                      onClick={() => updatePickleballMatchMeta(matchId, { overlayLogo: null })}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Remove Logo
                    </button>
                  </>
                )}
                {uploadSuccess && <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-md">{uploadSuccess}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* MATCH ACTIONS */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to complete this match?")) {
                const isPoints = match.meta.settings?.maxSets === 1;
                const t1Score = isPoints ? match.score.team1.points : match.score.team1.sets;
                const t2Score = isPoints ? match.score.team2.points : match.score.team2.sets;
                let resultString = "";
                if (t1Score > t2Score) {
                  resultString = `${match.meta.team1} WON (${t1Score} - ${t2Score})`;
                } else if (t2Score > t1Score) {
                  resultString = `${match.meta.team2} WON (${t2Score} - ${t1Score})`;
                } else {
                  resultString = `MATCH TIED (${t1Score} - ${t2Score})`;
                }
                completePickleballMatch(
                  matchId,
                  resultString,
                );
              }
            }}
            className="px-6 py-3 rounded-lg bg-inverse-surface text-white font-black"
          >
            End Match
          </button>
        </div>
        </>
        )}
      </main>

      {eventModalOpen && match && eventTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black">
              Record Event for {eventTeam === "team1" ? match.meta.team1 : match.meta.team2}
            </h2>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full rounded-md border border-outline px-3 py-2"
                >
                  <option value="point">Point (+1 to score)</option>
                  <option value="fault">Fault</option>
                  <option value="timeout">Timeout</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">Time</label>
                <input
                  required
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full rounded-md border border-outline px-3 py-2 font-mono"
                  placeholder="e.g. 45:00"
                />
              </div>
              
              {match.meta.settings.format !== "Singles" && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-on-surface">Player <span className="font-normal text-on-surface-variant">(optional)</span></label>
                  <select
                    value={scorerName}
                    onChange={(e) => setScorerName(e.target.value)}
                    className="w-full rounded-md border border-outline px-3 py-2"
                  >
                    <option value="">Unknown / Team</option>
                    {(eventTeam === "team1" ? match.meta.team1Roster : match.meta.team2Roster)?.map((p, i) => (
                      <option key={i} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="rounded-lg px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-black text-white hover:bg-primary-container"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
