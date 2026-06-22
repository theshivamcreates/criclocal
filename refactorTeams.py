import re

with open("app/teams/page.tsx", "r") as f:
    content = f.read()

# Imports
content = content.replace(
    'import { Users, Shield, Plus, Upload, X } from "lucide-react";',
    'import { Users, Shield, Plus, Upload, X, Edit2, Trash2, Info } from "lucide-react";\nimport { PlayerProfileModal } from "@/components/PlayerProfileModal";'
)
content = content.replace(
    'import { createTeam, getUserTeam, getTeamsBySport } from "@/lib/teamUtils";',
    'import { createTeam, getUserTeam, getTeamsBySport, updateTeam } from "@/lib/teamUtils";'
)

# Add states
old_states = """  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sport = "Pickleball"; // Currently scoped to Pickleball"""

new_states = """  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Edit Team state
  const [isEditing, setIsEditing] = useState(false);
  
  // Modal states
  const [selectedTeam, setSelectedTeam] = useState<ExtendedTeam | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const sport = "Pickleball"; // Currently scoped to Pickleball"""

content = content.replace(old_states, new_states)

# Add Edit and Remove Handlers before handlePhotoSelect
old_handlers = """  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {"""
new_handlers = """  const handleEditClick = () => {
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {"""

content = content.replace(old_handlers, new_handlers)

# Replace My Team block to include Edit button
old_myteam_header = """            <div className="flex items-center justify-between mb-8 pb-4 border-b border-surface-dim">
              <h2 className="text-xl font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <Shield size={20} className="text-primary" /> My Team
              </h2>
            </div>"""

new_myteam_header = """            <div className="flex items-center justify-between mb-8 pb-4 border-b border-surface-dim">
              <h2 className="text-xl font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <Shield size={20} className="text-primary" /> My Team
              </h2>
              {myTeam.ownerId === user?.uid && (
                <button 
                  onClick={handleEditClick}
                  className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors text-sm font-bold uppercase tracking-widest"
                >
                  <Edit2 size={16} /> Edit
                </button>
              )}
            </div>"""

content = content.replace(old_myteam_header, new_myteam_header)

# Make My Team players clickable
old_player_card = """                  <div key={idx} className="flex items-center justify-between bg-background border border-outline rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary text-xl">
                          {player.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-on-surface">{player.name}</h4>
                        <p className="text-xs text-on-surface-variant">@{player.username || "pickleballer"}</p>
                      </div>
                    </div>
                    {player.id === myTeam.ownerId && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded">Captain</span>
                    )}
                  </div>"""

new_player_card = """                  <div key={idx} className="flex items-center justify-between bg-background border border-outline rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedPlayerId(player.id)}>
                    <div className="flex items-center gap-4">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary text-xl">
                          {player.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{player.name}</h4>
                        <p className="text-xs text-on-surface-variant">@{player.username || "pickleballer"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {player.id === myTeam.ownerId && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded">Captain</span>
                      )}
                    </div>
                  </div>"""

content = content.replace(old_player_card, new_player_card)


# Team Creation / Edit Form Rendering
old_form = """        {/* Create Team Form */}
        {isCreating && (
          <div className="mb-16 bg-surface border border-outline rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline">
              <h2 className="text-2xl font-black uppercase tracking-widest text-on-surface">Create New Team</h2>
              <button onClick={() => setIsCreating(false)} className="text-on-surface-variant hover:text-primary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="max-w-2xl mx-auto space-y-6">"""

new_form = """        {/* Create / Edit Team Form */}
        {(isCreating || isEditing) && (
          <div className="mb-16 bg-surface border border-outline rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline">
              <h2 className="text-2xl font-black uppercase tracking-widest text-on-surface">{isEditing ? "Edit Team" : "Create New Team"}</h2>
              <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="text-on-surface-variant hover:text-primary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={isEditing ? handleUpdateTeam : handleCreateTeam} className="max-w-2xl mx-auto space-y-6">"""

content = content.replace(old_form, new_form)

old_form_btn = """              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-container text-white py-4 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Create Team"}
              </button>"""

new_form_btn = """              {isEditing && myTeam && (
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
                className="w-full bg-primary hover:bg-primary-container text-white py-4 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : isEditing ? "Update Team" : "Create Team"}
              </button>"""

content = content.replace(old_form_btn, new_form_btn)

# Make network team cards clickable
old_network_card = """                  <div 
                    key={team.id} 
                    className="bg-surface border border-outline rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                  >"""

new_network_card = """                  <div 
                    key={team.id} 
                    onClick={() => openTeamModal(team)}
                    className="bg-surface border border-outline rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer hover:border-primary/50"
                  >"""

content = content.replace(old_network_card, new_network_card)

# Inject Modals at the end before </AppShell>
old_end = """      </div>
    </AppShell>
  );
}"""

new_end = """      </div>

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
}"""

content = content.replace(old_end, new_end)

with open("app/teams/page.tsx", "w") as f:
    f.write(content)
