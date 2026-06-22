"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Users, Shield, Plus, Upload, X, Edit2, Trash2, Info } from "lucide-react";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { createTeam, getUserTeam, getTeamsBySport, updateTeam } from "@/lib/teamUtils";
import { ProfilePhotoCropper } from "@/components/ProfilePhotoCropper";
import { uploadToImageKit } from "@/lib/imagekitUpload";
import imageCompression from "browser-image-compression";
import type { Team } from "@/types/team";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";

interface ExtendedTeam extends Team {
  playerDetails: any[];
}

export default function TeamsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<ExtendedTeam | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  
  // Create Team state
  const [isCreating, setIsCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamBio, setTeamBio] = useState("");
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Edit Team state
  const [isEditing, setIsEditing] = useState(false);
  
  // Modal states
  const [selectedTeam, setSelectedTeam] = useState<ExtendedTeam | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const sport = "Pickleball"; // Currently scoped to Pickleball

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchTeams(u.uid);
      } else {
        setMyTeam(null);
        setAllTeams([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchTeams = async (userId: string) => {
    try {
      const myT = await getUserTeam(userId, sport);
      if (myT) {
        // Fetch player details
        const playerDetails = [];
        for (const pId of myT.players) {
          const pDoc = await getDoc(doc(firestore, `users/${pId}`));
          if (pDoc.exists()) {
            playerDetails.push({ id: pDoc.id, ...pDoc.data() });
          }
        }
        setMyTeam({ ...myT, playerDetails });
      } else {
        setMyTeam(null);
      }

      const all = await getTeamsBySport(sport);
      setAllTeams(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!myTeam) return;
    setIsEditing(true);
    setTeamName(myTeam.name);
    setTeamBio(myTeam.bio || "");
    setPhotoPreview(myTeam.logoURL || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !myTeam) return;
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let uploadedUrl = myTeam.logoURL;
      if (photoFile) {
        uploadedUrl = await uploadToImageKit(photoFile, `team_${teamName.trim().replace(/\s+/g, '_')}_${Date.now()}.jpg`);
      }

      await updateTeam(myTeam.id, {
        name: teamName.trim(),
        bio: teamBio.trim(),
        logoURL: uploadedUrl,
      });

      setIsEditing(false);
      setPhotoFile(null);
      await fetchTeams(user.uid);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!myTeam || !user) return;
    if (playerId === user.uid) {
      alert("You cannot remove yourself. You are the owner.");
      return;
    }
    if (!confirm("Are you sure you want to remove this player?")) return;
    
    try {
      const newPlayers = myTeam.players.filter(id => id !== playerId);
      await updateTeam(myTeam.id, { players: newPlayers });
      await fetchTeams(user.uid);
    } catch(err: any) {
      alert("Failed to remove player.");
    }
  };

  const openTeamModal = async (team: Team) => {
    // Fetch player details for this team
    const playerDetails = [];
    for (const pId of team.players) {
      const pDoc = await getDoc(doc(firestore, `users/${pId}`));
      if (pDoc.exists()) {
        playerDetails.push({ id: pDoc.id, ...pDoc.data() });
      }
    }
    setSelectedTeam({ ...team, playerDetails });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setRawPhotoUrl(url);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setRawPhotoUrl(null);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(croppedFile, options);
      setPhotoFile(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error(err);
      setError("Failed to compress image.");
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let uploadedUrl = "";
      if (photoFile) {
        uploadedUrl = await uploadToImageKit(photoFile, `team_${teamName.trim().replace(/\s+/g, '_')}_${Date.now()}.jpg`);
      }

      await createTeam({
        name: teamName.trim(),
        bio: teamBio.trim(),
        logoURL: uploadedUrl,
        sport,
        ownerId: user.uid,
        players: [user.uid],
      });

      setIsCreating(false);
      setTeamName("");
      setTeamBio("");
      setPhotoFile(null);
      setPhotoPreview(null);
      await fetchTeams(user.uid);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
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

      <div className="bg-surface border-b border-outline">
        <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter text-on-surface mb-2">
                Team Network
              </h1>
              <p className="text-on-surface-variant font-bold text-lg">
                Manage your Pickleball doubles team and discover competitors.
              </p>
            </div>
            {!myTeam && !isCreating && (
              <button 
                onClick={() => setIsCreating(true)}
                className="bg-primary text-on-primary px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Create My Team
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] w-full mx-auto px-6 py-12">
        {/* Create / Edit Team Form */}
        {(isCreating || isEditing) && (
          <div className="mb-16 bg-surface border border-outline rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline">
              <h2 className="text-2xl font-black uppercase tracking-widest text-on-surface">{isEditing ? "Edit Team" : "Create New Team"}</h2>
              <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="text-on-surface-variant hover:text-primary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={isEditing ? handleUpdateTeam : handleCreateTeam} className="max-w-2xl mx-auto space-y-6">
              {/* Logo Upload */}
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="relative group cursor-pointer">
                  <div className="w-32 h-32 rounded-full border-[6px] border-surface bg-surface-dim shadow-md overflow-hidden flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Team Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={40} className="text-outline" />
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer">
                    <Upload size={24} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-surface-dim border border-outline text-on-surface px-4 py-3 rounded-lg outline-none focus:border-primary transition-colors font-bold"
                  placeholder="e.g. Smash Bros"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Team Bio (Optional)</label>
                <textarea
                  value={teamBio}
                  onChange={(e) => setTeamBio(e.target.value)}
                  className="w-full bg-surface-dim border border-outline text-on-surface px-4 py-3 rounded-lg outline-none focus:border-primary transition-colors font-bold min-h-[100px] resize-none"
                  placeholder="What makes your team special?"
                />
              </div>

              {error && <p className="text-sm font-bold text-rose-500 bg-rose-500/10 p-3 rounded-lg">{error}</p>}

              {isEditing && myTeam && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface">Manage Players</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {myTeam.playerDetails.map(player => (
                      <div key={player.id} className="flex items-center justify-between bg-surface-variant p-3 rounded-xl border border-outline">
                        <div className="flex items-center gap-3">
                          {player.photoURL ? (
                            <img src={player.photoURL} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary text-xs">
                              {player.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                          <p className="font-bold text-sm text-on-surface">{player.name}</p>
                        </div>
                        {player.id !== myTeam.ownerId && (
                          <button type="button" onClick={() => handleRemovePlayer(player.id)} className="text-red-500 hover:text-red-600 p-2">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {myTeam.players.length < 2 && (
                     <Link href="/players" className="inline-flex items-center gap-2 text-sm text-primary font-bold tracking-widest uppercase hover:underline mt-2">
                       <Plus size={16} /> Add Players
                     </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-black uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : isEditing ? "Update Team" : "Create Team"}
              </button>
            </form>
          </div>
        )}

        {/* My Team Section */}
        {myTeam && !isCreating && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Shield size={16} /> My Team
              </h2>
              {myTeam.ownerId === user?.uid && (
                <button 
                  onClick={handleEditClick}
                  className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors text-sm font-bold uppercase tracking-widest"
                >
                  <Edit2 size={16} /> Edit
                </button>
              )}
            </div>
            <div className="bg-surface border border-primary/30 rounded-3xl p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="flex flex-col items-center md:items-start shrink-0 text-center md:text-left border-b md:border-b-0 md:border-r border-outline pb-8 md:pb-0 md:pr-8">
                  {myTeam.logoURL ? (
                    <img src={myTeam.logoURL} alt={myTeam.name} className="w-32 h-32 rounded-full border-[6px] border-surface object-cover bg-surface-dim shadow-md mb-4" />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-[6px] border-surface bg-primary flex items-center justify-center text-white font-black text-5xl shadow-md mb-4">
                      {myTeam.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-display text-3xl font-black uppercase tracking-tighter text-on-surface mb-2">{myTeam.name}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{myTeam.sport}</span>
                  {myTeam.bio && (
                    <p className="mt-4 text-sm text-on-surface-variant max-w-xs italic leading-relaxed">&quot;{myTeam.bio}&quot;</p>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black uppercase tracking-widest text-sm text-on-surface">Team Roster</h4>
                    <span className="text-xs font-bold text-on-surface-variant">{myTeam.players.length} / 2 Players</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myTeam.playerDetails.map(p => (
                      <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} className="flex items-center gap-4 bg-surface-dim p-4 rounded-xl border border-outline hover:border-primary/50 transition-colors cursor-pointer group">
                        {p.photoURL ? (
                          <img src={p.photoURL} alt={p.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center font-bold text-primary shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-on-surface line-clamp-1">{p.name}</p>
                          <p className="text-xs text-on-surface-variant">@{p.username}</p>
                        </div>
                        {p.id === myTeam.ownerId && (
                          <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Captain</span>
                        )}
                      </div>
                    ))}

                    {/* Empty Slot */}
                    {myTeam.players.length < 2 && myTeam.ownerId === user?.uid && (
                      <Link href="/players" className="flex flex-col items-center justify-center gap-2 bg-surface-variant/50 border-2 border-dashed border-outline hover:border-primary/50 transition-colors p-4 rounded-xl min-h-[80px] group">
                        <Plus size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">Add Player</span>
                      </Link>
                    )}
                    {myTeam.players.length < 2 && myTeam.ownerId !== user?.uid && (
                      <div className="flex flex-col items-center justify-center bg-surface-variant/50 border-2 border-dashed border-outline p-4 rounded-xl min-h-[80px]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Empty Slot</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Teams Grid */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-6 flex items-center gap-2">
            <Users size={16} /> Network Teams
          </h2>
          
          {allTeams.length === 0 ? (
            <div className="text-center py-16 bg-surface-dim rounded-3xl border border-outline">
              <Shield size={48} className="mx-auto text-outline mb-4" />
              <h3 className="text-xl font-black uppercase tracking-widest text-on-surface mb-2">No Teams Yet</h3>
              <p className="text-on-surface-variant font-bold">Be the first to create a Pickleball team!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTeams.map(team => (
                <div key={team.id} onClick={() => openTeamModal(team)} className="bg-surface border border-outline rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4 mb-4">
                    {team.logoURL ? (
                      <img src={team.logoURL} alt={team.name} className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-surface shadow-sm group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center font-black text-white text-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-xl font-black uppercase tracking-tighter text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{team.name}</h3>
                      <p className="text-xs font-bold text-on-surface-variant">{team.players.length} / 2 Players</p>
                    </div>
                  </div>
                  {team.bio && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 italic">&quot;{team.bio}&quot;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button onClick={() => setSelectedTeam(null)} className="absolute top-4 right-4 text-on-surface-variant hover:text-primary bg-background/50 backdrop-blur rounded-full p-2 z-10 transition-colors">
              <X size={20} />
            </button>

            <div className="relative h-48 bg-surface-dim flex items-center justify-center p-6 border-b border-outline">
              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-50 z-0"></div>
              {selectedTeam.logoURL ? (
                <img src={selectedTeam.logoURL} alt={selectedTeam.name} className="w-32 h-32 rounded-full object-cover border-4 border-surface shadow-xl relative z-10" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-on-primary font-black text-6xl shadow-xl relative z-10">
                  {selectedTeam.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="p-8 relative z-10 bg-surface">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-on-surface mb-2">{selectedTeam.name}</h2>
                {selectedTeam.bio && (
                  <p className="text-sm font-medium text-on-surface-variant italic mb-4">"{selectedTeam.bio}"</p>
                )}
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  {selectedTeam.sport}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-sm uppercase tracking-widest text-on-surface-variant border-b border-outline pb-2">Roster</h3>
                <div className="grid gap-3">
                  {selectedTeam.playerDetails.map((player: any) => (
                    <div 
                      key={player.id} 
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="flex items-center gap-3 bg-surface-variant p-3 rounded-xl border border-outline hover:border-primary/50 transition-colors cursor-pointer group"
                    >
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary text-sm">
                          {player.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{player.name}</p>
                        {player.id === selectedTeam.ownerId && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Captain</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </AppShell>
  );
}
