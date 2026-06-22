"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { db, auth, firestore } from "@/lib/firebase";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Search, Calendar, MapPin, Filter } from "lucide-react";
import Link from "next/link";

export default function TournamentsPage() {
  const [cricketTournaments, setCricketTournaments] = useState<Record<string, any>>({});
  const [footballTournaments, setFootballTournaments] = useState<Record<string, any>>({});
  const [pickleballTournaments, setPickleballTournaments] = useState<Record<string, any>>({});
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [filterSport, setFilterSport] = useState("ALL SPORTS");
  const [filterSkill, setFilterSkill] = useState("ALL SKILL LEVELS");
  const [filterStatus, setFilterStatus] = useState("ALL STATUS");
  const [sortBy, setSortBy] = useState("DATE (NEWEST)");

  useEffect(() => {
    if (!db) return;
    
    let cLoaded = false, fLoaded = false, pLoaded = false;
    const checkLoaded = () => {
      if (cLoaded && fLoaded && pLoaded) setIsDataLoading(false);
    };

    const unsubCricket = onValue(dbRef(db, "tournaments"), (snapshot) => {
      setCricketTournaments(snapshot.val() ?? {});
      cLoaded = true; checkLoaded();
    });
    
    const unsubFootball = onValue(dbRef(db, "football/tournaments"), (snapshot) => {
      setFootballTournaments(snapshot.val() ?? {});
      fLoaded = true; checkLoaded();
    });

    const unsubPickleball = onValue(dbRef(db, "pickleball/tournaments"), (snapshot) => {
      setPickleballTournaments(snapshot.val() ?? {});
      pLoaded = true; checkLoaded();
    });

    return () => {
      unsubCricket();
      unsubFootball();
      unsubPickleball();
    };
  }, []);

  useEffect(() => {
    if (!auth || !firestore) return;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          if (!firestore) return;
          const docSnap = await getDoc(doc(firestore, `users/${user.uid}`));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.gamePlayed && data.gamePlayed.length > 0) {
              // Only set if we haven't touched the filter yet
              setFilterSport((prev) => 
                prev === "ALL SPORTS" ? data.gamePlayed[0].toUpperCase() : prev
              );
            }
          }
        } catch (err) {
          console.error("Error fetching user sports:", err);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  const allTournaments = useMemo(() => {
    const cList = Object.entries(cricketTournaments).map(([id, t]) => ({ id, ...t, sport: "cricket" }));
    const fList = Object.entries(footballTournaments).map(([id, t]) => ({ id, ...t, sport: "football" }));
    const pList = Object.entries(pickleballTournaments).map(([id, t]) => ({ id, ...t, sport: "pickleball" }));
    
    let combined = [...cList, ...fList, ...pList];

    // Filters
    if (filterSport !== "ALL SPORTS") {
      combined = combined.filter(t => t.sport.toUpperCase() === filterSport);
    }
    if (filterSkill !== "ALL SKILL LEVELS") {
      combined = combined.filter(t => t.skillLevel?.toUpperCase() === filterSkill);
    }
    if (filterStatus !== "ALL STATUS") {
      combined = combined.filter(t => t.status?.toUpperCase() === filterStatus);
    }

    // Sorting
    combined.sort((a, b) => {
      if (sortBy === "DATE (NEWEST)") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortBy === "DATE (OLDEST)") {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortBy === "ENTRY FEE (LOW TO HIGH)") {
        const feeA = parseInt((a.entryFee || "0").replace(/[^0-9]/g, '')) || 0;
        const feeB = parseInt((b.entryFee || "0").replace(/[^0-9]/g, '')) || 0;
        return feeA - feeB;
      }
      if (sortBy === "ENTRY FEE (HIGH TO LOW)") {
        const feeA = parseInt((a.entryFee || "0").replace(/[^0-9]/g, '')) || 0;
        const feeB = parseInt((b.entryFee || "0").replace(/[^0-9]/g, '')) || 0;
        return feeB - feeA;
      }
      return 0;
    });

    return combined;
  }, [cricketTournaments, footballTournaments, pickleballTournaments, filterSport, filterSkill, filterStatus, sortBy]);

  if (isDataLoading || isAuthLoading) {
    return (
      <AppShell>
        <div className="min-h-[85vh] flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-surface-bright font-black uppercase tracking-widest text-xs animate-pulse">Loading Tournaments...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="bg-surface text-on-surface min-h-screen">
        {/* Header */}
        <div className="bg-surface-dim pt-20 pb-12 border-b border-outline">
          <div className="max-w-[1280px] mx-auto px-6">
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 break-words">
              Tournaments
            </h1>
            <p className="text-on-surface-variant font-medium text-lg max-w-2xl">
              Discover and register for high-stakes, competitive leagues and knockout tournaments across the KIX XI ecosystem.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-outline bg-surface sticky top-0 z-10">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select 
                className="bg-inverse-surface text-on-inverse-surface border border-outline px-4 py-2 font-bold uppercase text-xs rounded-sm focus:outline-none"
                value={filterSport}
                onChange={e => setFilterSport(e.target.value)}
              >
                <option value="ALL SPORTS">All Sports</option>
                <option value="CRICKET">Cricket</option>
                <option value="FOOTBALL">Football</option>
                <option value="PICKLEBALL">Pickleball</option>
              </select>
              
              <select 
                className="bg-surface text-on-surface border border-outline px-4 py-2 font-bold uppercase text-xs rounded-sm focus:outline-none"
                value={filterSkill}
                onChange={e => setFilterSkill(e.target.value)}
              >
                <option value="ALL SKILL LEVELS">Skill Level</option>
                <option value="PRO">Pro</option>
                <option value="AMATEUR">Amateur</option>
                <option value="OPEN">Open</option>
                <option value="U18">U18</option>
              </select>

              <select 
                className="bg-surface text-on-surface border border-outline px-4 py-2 font-bold uppercase text-xs rounded-sm focus:outline-none"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="ALL STATUS">Status</option>
                <option value="REGISTERING">Registering</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase text-on-surface-variant">Sort By:</span>
              <select 
                className="bg-transparent text-on-surface border-none font-bold uppercase text-xs cursor-pointer focus:outline-none"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="DATE (NEWEST)">Date (Newest)</option>
                <option value="DATE (OLDEST)">Date (Oldest)</option>
                <option value="ENTRY FEE (LOW TO HIGH)">Entry Fee (Low to High)</option>
                <option value="ENTRY FEE (HIGH TO LOW)">Entry Fee (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tournament Grid */}
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          {allTournaments.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              <p className="font-bold text-xl mb-2">No tournaments found</p>
              <p>Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTournaments.map(t => {
                const slotsLeft = t.maxTeams ? `${Object.keys(t.teams || {}).length}/${t.maxTeams}` : "TBD";
                const isRegistering = t.status?.toUpperCase() === "REGISTERING";
                
                return (
                  <div key={t.id} className="border-2 border-outline bg-surface overflow-hidden hover:border-primary transition-colors flex flex-col">
                    {/* Card Header / Image */}
                    <div className="h-48 relative bg-inverse-surface border-b-2 border-outline">
                      {t.bannerUrl && (
                        <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover opacity-60" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-transparent opacity-80"></div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${isRegistering ? 'bg-primary text-white' : 'bg-surface text-on-surface'}`}>
                          {t.status || "Upcoming"}
                        </span>
                      </div>
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 drop-shadow-md">
                          {t.sport} - {t.skillLevel || "OPEN"}
                        </p>
                        <h3 className="font-display text-3xl font-black text-white uppercase leading-none drop-shadow-md truncate">
                          {t.name || "Unnamed Tournament"}
                        </h3>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider mb-1">Entry Fee</p>
                          <p className="text-2xl font-black">{t.entryFee || "Free"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider mb-1">Slots Left</p>
                          <p className="text-2xl font-black">{slotsLeft}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <Calendar size={16} />
                          <span className="text-sm font-medium">{t.startDate || "TBD"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <MapPin size={16} />
                          <span className="text-sm font-medium">{t.location || "TBD"}</span>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <Link 
                          href={`/tournaments/${t.sport}/${t.id}`}
                          className={`w-full py-3 flex items-center justify-center font-bold uppercase tracking-widest text-xs transition-colors ${
                            isRegistering 
                            ? "bg-primary text-white hover:bg-primary-container" 
                            : "bg-inverse-surface text-white hover:bg-surface-variant hover:text-on-surface border border-outline"
                          }`}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {allTournaments.length > 0 && (
            <div className="mt-12 flex justify-center">
              <button className="border-2 border-primary text-primary font-bold uppercase text-xs tracking-widest px-8 py-4 hover:bg-primary hover:text-white transition-colors">
                Load More Tournaments
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
