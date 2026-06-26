"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { firestore, auth } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Users, Search, Activity, Shield, X, MessageSquare, UserPlus, Check } from "lucide-react";
import { getChatId, sendFriendRequest } from "@/lib/chatUtils";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  username?: string;
  photoURL?: string;
  primaryRole?: string;
  gamePlayed?: string[];
  bio?: string;
  role?: string;
  dob?: string;
  footballPosition?: string;
  height?: string;
  weight?: string;
  footballSkill?: string;
  preferredFoot?: string;
  cricketRole?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  cricketSkill?: string;
  pickleballSkill?: string;
  paddleHand?: string;
  preferredSide?: string;
}

export default function PlayersPage() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserSports, setCurrentUserSports] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllSports, setShowAllSports] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [myPickleballTeam, setMyPickleballTeam] = useState<any>(null);
  const [myFootballClub, setMyFootballClub] = useState<any>(null);
  const [sentTeamRequests, setSentTeamRequests] = useState<string[]>([]);

  const router = useRouter();

  const calculateAge = (dobString?: string) => {
    if (!dobString) return "N/A";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  useEffect(() => {
    if (!firestore || !auth) return;

    const fetchPlayers = async () => {
      try {
        if (!firestore) return;
        const usersSnap = await getDocs(collection(firestore, "users"));
        const usersList: Player[] = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role !== "admin" && data.username) {
            usersList.push({ id: docSnap.id, ...data } as Player);
          }
        });
        setPlayers(usersList);
      } catch (err) {
        console.error("Error fetching players:", err);
      }
    };

    let unsubRequests: () => void;
    let unsubFriends: () => void;
    let unsubTeamRequests: () => void;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        try {
          if (!firestore) return;
          const userDoc = await getDoc(doc(firestore, `users/${user.uid}`));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUserSports(data.gamePlayed || []);
          }

          // Listen to sent requests
          const reqQ = query(collection(firestore, "friendRequests"), where("from", "==", user.uid));
          unsubRequests = onSnapshot(reqQ, snap => {
            setSentRequests(snap.docs.map(d => d.data().to as string));
          });

          // Listen to friends
          const friendQ = query(collection(firestore, "friendships"), where("participants", "array-contains", user.uid));
          unsubFriends = onSnapshot(friendQ, snap => {
            const fList = snap.docs.map(d => {
              const p = d.data().participants as string[];
              return p.find(id => id !== user.uid)!;
            });
            setFriends(fList);
          });

          // Fetch my team
          const { getUserTeam } = await import("@/lib/teamUtils");
          const team = await getUserTeam(user.uid, "Pickleball");
          setMyPickleballTeam(team);
          
          const footballTeam = await getUserTeam(user.uid, "Football");
          setMyFootballClub(footballTeam);

          // Listen to sent team requests
          const tReqQ = query(collection(firestore, "teamRequests"), where("from", "==", user.uid));
          unsubTeamRequests = onSnapshot(tReqQ, snap => {
            const activeTeamIds = [team?.id, footballTeam?.id].filter(Boolean);
            const validReqs = snap.docs.filter(d => activeTeamIds.includes(d.data().teamId));
            setSentTeamRequests(validReqs.map(d => d.data().to as string));
          });

        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserSports([]);
      }
      await fetchPlayers();
      setLoading(false);
    });

    return () => {
      unsub();
      if (unsubRequests) unsubRequests();
      if (unsubFriends) unsubFriends();
      if (unsubTeamRequests) unsubTeamRequests();
    };
  }, []);

  const displayedPlayers = useMemo(() => {
    let filtered = players;

    if (!showAllSports && currentUserSports.length > 0) {
      filtered = filtered.filter(player => {
        if (!player.gamePlayed || player.gamePlayed.length === 0) return false;
        return player.gamePlayed.some(sport => currentUserSports.includes(sport));
      });
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(lowerQuery) || 
        p.username?.toLowerCase().includes(lowerQuery) ||
        p.gamePlayed?.some(sport => sport.toLowerCase().includes(lowerQuery))
      );
    }
    
    return filtered.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [players, searchQuery, currentUserSports, showAllSports, currentUserId]);

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
      <div className="bg-surface border-b border-outline">
        <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter text-on-surface mb-2">
                Player Directory
              </h1>
              <p className="text-on-surface-variant font-bold text-lg">
                {!showAllSports && currentUserSports.length > 0 
                  ? `Showing players who play: ${currentUserSports.join(", ")}` 
                  : "Showing all registered players on the network."}
              </p>
            </div>
            <div className="w-full md:w-80 shrink-0 relative flex flex-col gap-3">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search by name, username, or sport..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-dim border border-outline text-on-surface px-12 py-4 outline-none focus:border-primary transition-colors font-bold text-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
              </div>
              {currentUserSports.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-bold text-on-surface cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showAllSports} 
                    onChange={(e) => setShowAllSports(e.target.checked)} 
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                  Show players from all sports
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] w-full mx-auto px-6 py-12">
        {displayedPlayers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={64} className="mx-auto text-outline mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-widest text-on-surface mb-2">No Players Found</h2>
            <p className="text-on-surface-variant font-bold">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {displayedPlayers.map(player => (
              <div 
                key={player.id} 
                onClick={() => setSelectedPlayer(player)}
                className="bg-surface border border-outline rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-primary transition-all duration-300 group cursor-pointer h-[320px]"
              >
                
                {/* Banner / Header area */}
                <div className="h-20 bg-surface-dim border-b border-outline relative">
                   <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
                </div>

                <div className="px-6 relative flex-1 flex flex-col pb-6">
                  {/* Profile Photo */}
                  <div className="absolute -top-10 left-6">
                    {player.photoURL ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={player.photoURL} alt={player.name} className="w-20 h-20 rounded-full border-[4px] border-surface object-cover bg-surface-dim shadow-md group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-[4px] border-surface bg-primary flex items-center justify-center text-white font-black text-3xl shadow-md group-hover:scale-105 transition-transform duration-300">
                        {player.name ? player.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>

                  {/* Primary Role Badge */}
                  <div className="flex justify-end pt-3 mb-2">
                     {player.primaryRole && (
                       <span className="text-[10px] font-black uppercase tracking-widest bg-inverse-surface text-inverse-on-surface px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          {player.primaryRole === "Coach" ? <Shield size={12} /> : <Activity size={12} />}
                          {player.primaryRole}
                       </span>
                     )}
                  </div>

                  {/* Info */}
                  <div className="mt-2 flex-1">
                    <h3 className="font-display text-xl font-black text-on-surface uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {player.name}
                    </h3>
                    {player.username && (
                      <p className="text-xs font-bold text-on-surface-variant mb-4">
                        @{player.username}
                      </p>
                    )}

                    {player.bio && (
                      <p className="text-sm text-on-surface-variant leading-snug line-clamp-2 mb-4 italic border-l-[3px] border-primary/30 pl-3 py-0.5">
                        &quot;{player.bio}&quot;
                      </p>
                    )}
                  </div>

                  {/* Sports Tags */}
                  {player.gamePlayed && player.gamePlayed.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-outline-variant flex flex-wrap gap-2">
                      {player.gamePlayed.map(sport => (
                        <span key={sport} className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1.5 rounded-md border border-primary/20">
                          {sport}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            <button 
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-primary transition-colors z-20"
            >
              <X size={20} />
            </button>

            <div className="overflow-y-auto w-full relative flex-1">
              {/* Modal Header/Banner */}
              <div className="h-32 bg-surface-dim border-b border-outline relative shrink-0">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
              </div>

              {/* Scrollable Content */}
              <div className="px-8 pb-8 relative">
                {/* Profile Photo */}
                <div className="absolute -top-16 left-8">
                {selectedPlayer.photoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectedPlayer.photoURL} alt={selectedPlayer.name} className="w-32 h-32 rounded-full border-[6px] border-surface object-cover bg-surface-dim shadow-md" />
                ) : (
                  <div className="w-32 h-32 rounded-full border-[6px] border-surface bg-primary flex items-center justify-center text-white font-black text-5xl shadow-md">
                    {selectedPlayer.name ? selectedPlayer.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>

              {/* Primary Role Badge */}
              <div className="flex justify-end pt-4 mb-8">
                 {selectedPlayer.primaryRole && (
                   <span className="text-xs font-black uppercase tracking-widest bg-inverse-surface text-inverse-on-surface px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                      {selectedPlayer.primaryRole === "Coach" ? <Shield size={14} /> : <Activity size={14} />}
                      {selectedPlayer.primaryRole}
                   </span>
                 )}
              </div>

              {/* Info */}
              <div className="mt-8">
                <h3 className="font-display text-4xl font-black text-on-surface uppercase tracking-tight">
                  {selectedPlayer.name}
                </h3>
                {selectedPlayer.username && (
                  <p className="text-lg font-bold text-on-surface-variant mb-4">
                    @{selectedPlayer.username}
                  </p>
                )}

                {/* Actions */}
                {currentUserId && currentUserId !== selectedPlayer.id && (
                  <div className="flex flex-wrap gap-3 mb-8">
                    <button 
                      onClick={() => {
                        const chatId = getChatId(currentUserId, selectedPlayer.id);
                        router.push(`/chat/${chatId}`);
                      }}
                      className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-primary-container transition-colors"
                    >
                      <MessageSquare size={16} /> Message
                    </button>
                    
                    {friends.includes(selectedPlayer.id) ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest">
                        <Check size={16} /> Friends
                      </div>
                    ) : sentRequests.includes(selectedPlayer.id) ? (
                      <div className="flex items-center gap-2 bg-surface-dim border border-outline text-on-surface-variant px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest">
                        <Check size={16} /> Request Sent
                      </div>
                    ) : (
                      <button 
                        onClick={() => sendFriendRequest(currentUserId, selectedPlayer.id)}
                        className="flex items-center gap-2 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-opacity"
                      >
                        <UserPlus size={16} /> Add Friend
                      </button>
                    )}
                    {myPickleballTeam && 
                     myPickleballTeam.ownerId === currentUserId && 
                     myPickleballTeam.players.length < 2 && 
                     selectedPlayer.gamePlayed?.includes("Pickleball") && 
                     !myPickleballTeam.players.includes(selectedPlayer.id) && (
                      sentTeamRequests.includes(selectedPlayer.id) ? (
                        <div className="flex items-center gap-2 bg-surface-dim border border-outline text-on-surface-variant px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest">
                          <Check size={16} /> Team Invite Sent
                        </div>
                      ) : (
                        <button 
                          onClick={async () => {
                            const { sendTeamInvite } = await import("@/lib/teamUtils");
                            await sendTeamInvite(myPickleballTeam.id, myPickleballTeam.name, "Pickleball", currentUserId, selectedPlayer.id);
                          }}
                          className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-primary/30 transition-colors border border-primary/30"
                        >
                          <Shield size={16} /> Invite to Team
                        </button>
                      )
                    )}

                    {myFootballClub && 
                     myFootballClub.ownerId === currentUserId && 
                     selectedPlayer.gamePlayed?.includes("Football") && 
                     !myFootballClub.players.includes(selectedPlayer.id) && (
                      sentTeamRequests.includes(selectedPlayer.id) ? (
                        <div className="flex items-center gap-2 bg-surface-dim border border-outline text-on-surface-variant px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest">
                          <Check size={16} /> Club Invite Sent
                        </div>
                      ) : (
                        <button 
                          onClick={async () => {
                            const { sendTeamInvite } = await import("@/lib/teamUtils");
                            await sendTeamInvite(myFootballClub.id, myFootballClub.name, "Football", currentUserId, selectedPlayer.id);
                          }}
                          className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-primary/30 transition-colors border border-primary/30"
                        >
                          <Shield size={16} /> Invite to Club
                        </button>
                      )
                    )}
                  </div>
                )}
                
                {/* Sports Tags */}
                {selectedPlayer.gamePlayed && selectedPlayer.gamePlayed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedPlayer.gamePlayed.map(sport => (
                      <span key={sport} className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
                        {sport}
                      </span>
                    ))}
                  </div>
                )}

                {selectedPlayer.bio && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Bio</h4>
                    <p className="text-base text-on-surface leading-relaxed italic border-l-[3px] border-primary/30 pl-4 py-1 bg-surface-dim/50 rounded-r-lg">
                      &quot;{selectedPlayer.bio}&quot;
                    </p>
                  </div>
                )}

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Age</p>
                    <p className="text-lg font-black text-on-surface">{calculateAge(selectedPlayer.dob)}</p>
                  </div>
                  
                  {selectedPlayer.gamePlayed?.includes("Football") && (
                    <>
                      {selectedPlayer.footballPosition && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Position</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.footballPosition}</p>
                        </div>
                      )}
                      
                      {(selectedPlayer.height || selectedPlayer.weight) && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Physical</p>
                          <p className="text-lg font-black text-on-surface">
                            {selectedPlayer.height ? `${selectedPlayer.height}cm` : '--'} / {selectedPlayer.weight ? `${selectedPlayer.weight}kg` : '--'}
                          </p>
                        </div>
                      )}
                      
                      {selectedPlayer.preferredFoot && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Foot</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.preferredFoot}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.footballSkill && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Skill</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.footballSkill}</p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedPlayer.gamePlayed?.includes("Cricket") && (
                    <>
                      {selectedPlayer.cricketRole && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Role</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.cricketRole}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.battingStyle && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Batting</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.battingStyle}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.bowlingStyle && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Bowling</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.bowlingStyle}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.cricketSkill && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Skill</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.cricketSkill}</p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedPlayer.gamePlayed?.includes("Pickleball") && (
                    <>
                      {selectedPlayer.pickleballSkill && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Rating</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.pickleballSkill}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.paddleHand && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Hand</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.paddleHand}</p>
                        </div>
                      )}
                      
                      {selectedPlayer.preferredSide && (
                        <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Preferred Side</p>
                          <p className="text-lg font-black text-on-surface">{selectedPlayer.preferredSide}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </AppShell>
  );
}
