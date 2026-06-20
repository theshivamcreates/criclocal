"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { firestore, auth } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Users, Search, Activity, Shield } from "lucide-react";

interface Player {
  id: string;
  name: string;
  username?: string;
  photoURL?: string;
  primaryRole?: string;
  gamePlayed?: string[];
  bio?: string;
  role?: string;
}

export default function PlayersPage() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserSports, setCurrentUserSports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!firestore || !auth) return;

    const fetchPlayers = async (sportsFilter: string[] = []) => {
      try {
        const usersSnap = await getDocs(collection(firestore, "users"));
        const usersList: Player[] = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role !== "admin") {
            usersList.push({ id: docSnap.id, ...data } as Player);
          }
        });

        // Filter players if we have sports filter
        let filteredList = usersList;
        if (sportsFilter.length > 0) {
          filteredList = usersList.filter(player => {
            // Check if there is an intersection between player's sports and current user's sports
            if (!player.gamePlayed || player.gamePlayed.length === 0) return false;
            return player.gamePlayed.some(sport => sportsFilter.includes(sport));
          });
        }
        
        setPlayers(filteredList);
      } catch (err) {
        console.error("Error fetching players:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch current user's document to get their selected sports
        try {
          const userDoc = await getDoc(doc(firestore, `users/${user.uid}`));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const sports = data.gamePlayed || [];
            setCurrentUserSports(sports);
            fetchPlayers(sports);
            return;
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      }
      // If not logged in or no sports selected, show all players
      fetchPlayers([]);
    });

    return () => unsub();
  }, []);

  const displayedPlayers = useMemo(() => {
    if (!searchQuery) return players;
    const lowerQuery = searchQuery.toLowerCase();
    return players.filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) || 
      p.username?.toLowerCase().includes(lowerQuery) ||
      p.gamePlayed?.some(sport => sport.toLowerCase().includes(lowerQuery))
    );
  }, [players, searchQuery]);

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
                {currentUserSports.length > 0 
                  ? `Showing players who play: ${currentUserSports.join(", ")}` 
                  : "Showing all registered players on the network."}
              </p>
            </div>
            <div className="w-full md:w-80 shrink-0 relative">
              <input 
                type="text" 
                placeholder="Search by name, username, or sport..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-dim border border-outline text-on-surface px-12 py-4 outline-none focus:border-primary transition-colors font-bold text-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-12">
        {displayedPlayers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={64} className="mx-auto text-outline mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-widest text-on-surface mb-2">No Players Found</h2>
            <p className="text-on-surface-variant font-bold">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {displayedPlayers.map(player => (
              <div key={player.id} className="bg-surface border border-outline rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-primary transition-all duration-300 group">
                
                {/* Banner / Header area */}
                <div className="h-28 bg-surface-dim border-b border-outline relative">
                   <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
                </div>

                <div className="px-8 relative flex-1 flex flex-col pb-8">
                  {/* Profile Photo */}
                  <div className="absolute -top-12 left-8">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt={player.name} className="w-24 h-24 rounded-full border-[6px] border-surface object-cover bg-surface-dim shadow-md group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-[6px] border-surface bg-primary flex items-center justify-center text-white font-black text-4xl shadow-md group-hover:scale-105 transition-transform duration-300">
                        {player.name ? player.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>

                  {/* Primary Role Badge */}
                  <div className="flex justify-end pt-4 mb-4">
                     {player.primaryRole && (
                       <span className="text-[10px] font-black uppercase tracking-widest bg-inverse-surface text-inverse-on-surface px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                          {player.primaryRole === "Coach" ? <Shield size={12} /> : <Activity size={12} />}
                          {player.primaryRole}
                       </span>
                     )}
                  </div>

                  {/* Info */}
                  <div className="mt-4 flex-1">
                    <h3 className="font-display text-2xl font-black text-on-surface uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {player.name}
                    </h3>
                    <p className="text-sm font-bold text-on-surface-variant mb-6">
                      {player.username ? `@${player.username}` : "Guest User"}
                    </p>

                    {player.bio && (
                      <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3 mb-6 italic border-l-[3px] border-primary/30 pl-4 py-1">
                        "{player.bio}"
                      </p>
                    )}
                  </div>

                  {/* Sports Tags */}
                  {player.gamePlayed && player.gamePlayed.length > 0 && (
                    <div className="mt-auto pt-6 border-t border-outline-variant flex flex-wrap gap-2">
                      {player.gamePlayed.map(sport => (
                        <span key={sport} className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
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
    </AppShell>
  );
}
