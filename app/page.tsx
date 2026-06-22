"use client";

import Link from "next/link";
import { ArrowRight, Trophy, Users, Calendar, Activity, CircleDot, Play, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect, useMemo } from "react";
import { auth, firestore, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onValue, ref as dbRef } from "firebase/database";
import type { Match as CricketMatch } from "@/types/match";
import type { FootballMatch } from "@/types/football";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showTournamentsModal, setShowTournamentsModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  
  const [cricketTournaments, setCricketTournaments] = useState<Record<string, any>>({});
  const [footballTournaments, setFootballTournaments] = useState<Record<string, any>>({});
  const [pickleballTournaments, setPickleballTournaments] = useState<Record<string, any>>({});
  
  const [cricketMatches, setCricketMatches] = useState<Record<string, any>>({});
  const [footballMatches, setFootballMatches] = useState<Record<string, any>>({});
  const [pickleballMatches, setPickleballMatches] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        try {
          const snap = await getDoc(doc(firestore, `users/${u.uid}`));
          if (snap.exists()) {
            setUserData(snap.data());
          }
        } catch (e) {}
      }
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!db) return;
    
    let ct = false, ft = false, pt = false, cm = false, fm = false, pm = false;
    const check = () => {
      if (ct && ft && pt && cm && fm && pm) setIsDataLoading(false);
    };

    const unsubCT = onValue(dbRef(db, "tournaments"), (s) => { setCricketTournaments(s.val() ?? {}); ct = true; check(); });
    const unsubFT = onValue(dbRef(db, "football/tournaments"), (s) => { setFootballTournaments(s.val() ?? {}); ft = true; check(); });
    const unsubPT = onValue(dbRef(db, "pickleball/tournaments"), (s) => { setPickleballTournaments(s.val() ?? {}); pt = true; check(); });
    
    const unsubCM = onValue(dbRef(db, "matches"), (s) => { setCricketMatches(s.val() ?? {}); cm = true; check(); });
    const unsubFM = onValue(dbRef(db, "football/matches"), (s) => { setFootballMatches(s.val() ?? {}); fm = true; check(); });
    const unsubPM = onValue(dbRef(db, "pickleball/matches"), (s) => { setPickleballMatches(s.val() ?? {}); pm = true; check(); });

    return () => { unsubCT(); unsubFT(); unsubPT(); unsubCM(); unsubFM(); unsubPM(); };
  }, []);

  const gamePlayed = userData?.gamePlayed || [];
  const primarySport = gamePlayed[0] || "Cricket";
  const isFootball = primarySport === "Football";

  const { allTournaments, myTournaments, recommendedTournaments, myScheduledLiveMatches, myRecentMatches, myAllCompletedMatches, recentMatches, userStats } = useMemo(() => {
    const cT = Object.entries(cricketTournaments).map(([id, t]) => ({ id, ...t, sport: "cricket" }));
    const fT = Object.entries(footballTournaments).map(([id, t]) => ({ id, ...t, sport: "football" }));
    const pT = Object.entries(pickleballTournaments).map(([id, t]) => ({ id, ...t, sport: "pickleball" }));
    const allT = [...cT, ...fT, ...pT];

    const cM = Object.entries(cricketMatches).map(([id, m]) => ({ id, ...m, sport: "cricket" }));
    const fM = Object.entries(footballMatches).map(([id, m]) => ({ id, ...m, sport: "football" }));
    const pM = Object.entries(pickleballMatches).map(([id, m]) => ({ id, ...m, sport: "pickleball" }));
    const allM = [...cM, ...fM, ...pM];

    const myTeamNames = new Set<string>();
    const myTournamentsList: any[] = [];
    
    if (user && userData?.name) {
      myTeamNames.add(userData.name);
      myTeamNames.add(`${userData.name}'s Team`);
    }
    
    if (user) {
      for (const t of allT) {
        let participating = false;
        if (t.teams) {
          for (const [teamId, teamData] of Object.entries(t.teams as Record<string,any>)) {
            if (teamData.userId === user.uid || teamId === user.uid || (teamData.roster && teamData.roster.some((r:any) => r.id === user.uid))) {
              if (teamData.name) myTeamNames.add(teamData.name);
              participating = true;
            }
          }
        }
        if (participating) myTournamentsList.push(t);
      }
    }

    const preferredSports = gamePlayed.map((g: string) => g.toLowerCase());
    const recTournaments = user ? allT.filter(t => 
      !myTournamentsList.find(myT => myT.id === t.id) &&
      t.status?.toLowerCase() !== "completed"
    ).sort((a, b) => {
      const aPref = preferredSports.includes(a.sport.toLowerCase()) ? 1 : 0;
      const bPref = preferredSports.includes(b.sport.toLowerCase()) ? 1 : 0;
      return bPref - aPref;
    }) : [];

    const myMatchesList = allM.filter(m => 
      (myTeamNames.has(m.meta?.team1) || myTeamNames.has(m.meta?.team2)) &&
      (m.meta?.status === "scheduled" || m.meta?.status === "live")
    ).sort((a, b) => (a.meta?.date || "").localeCompare(b.meta?.date || ""));

    const matchesPlayedCount = allM.filter(m => 
      (myTeamNames.has(m.meta?.team1) || myTeamNames.has(m.meta?.team2)) && m.meta?.status === "completed"
    ).length;

    const completedMatchesList = allM
      .filter((m) => m.meta?.status === "completed")
      .sort((a, b) => (b.meta?.createdAt || 0) - (a.meta?.createdAt || 0))
      .slice(0, 4);

    const myCompletedMatchesList = allM
      .filter((m) => (myTeamNames.has(m.meta?.team1) || myTeamNames.has(m.meta?.team2)) && m.meta?.status === "completed")
      .sort((a, b) => (b.meta?.createdAt || 0) - (a.meta?.createdAt || 0));

    const myRecentMatchesTop5 = myCompletedMatchesList.slice(0, 5);

    return {
      allTournaments: allT,
      myTournaments: myTournamentsList,
      recommendedTournaments: recTournaments,
      myScheduledLiveMatches: myMatchesList,
      myRecentMatches: myRecentMatchesTop5,
      myAllCompletedMatches: myCompletedMatchesList,
      recentMatches: completedMatchesList,
      userStats: {
        tournamentsJoined: myTournamentsList.length,
        matchesPlayed: matchesPlayedCount,
        activeMatches: myMatchesList.length
      }
    };
  }, [cricketTournaments, footballTournaments, pickleballTournaments, cricketMatches, footballMatches, pickleballMatches, user, gamePlayed]);

  useEffect(() => {
    if (user && firestore && userData) {
      if (
        userData.stats?.tournamentsJoined !== userStats.tournamentsJoined ||
        userData.stats?.matchesPlayed !== userStats.matchesPlayed
      ) {
        updateDoc(doc(firestore, `users/${user.uid}`), {
          "stats.tournamentsJoined": userStats.tournamentsJoined,
          "stats.matchesPlayed": userStats.matchesPlayed,
          "stats.lastUpdated": Date.now()
        }).catch(console.error);
      }
    }
  }, [userStats, user, userData]);

  const showDashboard = user && (myScheduledLiveMatches.length > 0 || recommendedTournaments.length > 0 || myTournaments.length > 0);

  const getScoreText = (m: any, teamNum: "1" | "2") => {
    if (m.sport === "cricket") {
      return `${m.innings?.[teamNum]?.runs || 0}/${m.innings?.[teamNum]?.wickets || 0}`;
    } else if (m.sport === "pickleball") {
      const s = m.score?.[`team${teamNum}`] || {};
      if (m.meta?.settings?.maxSets === 1) return `P:${s.points || 0}`;
      return `S:${s.sets || 0} P:${s.points || 0}`;
    } else {
      return m.score?.[`team${teamNum}`] || 0;
    }
  };

  const renderDashboardMatch = (m: any) => {
    const isLive = m.meta?.status === "live";
    const matchUrl = m.sport === "cricket" ? `/match/${m.id}` : `/${m.sport}/match/${m.id}`;
    
    return (
      <Link href={matchUrl} key={m.id} className="block border border-outline bg-surface rounded-2xl overflow-hidden hover:border-primary transition-colors group">
        <div className={`px-4 py-2 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isLive ? 'bg-error/10 text-error border-b border-error/20' : 'bg-surface-dim border-b border-outline text-on-surface-variant'}`}>
          <span className="flex items-center gap-2">
            {isLive ? <><span className="w-2 h-2 rounded-full bg-error animate-pulse"></span> LIVE NOW</> : <><Calendar size={12}/> SCHEDULED</>}
          </span>
          <span>{m.sport}</span>
        </div>
        
        <div className="p-6">
          {isLive ? (
            <div className="space-y-4">
              {/* Simplified Scorecard */}
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface line-clamp-1 flex-1">{m.meta?.team1}</span>
                <span className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface ml-4">
                  {getScoreText(m, "1")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface line-clamp-1 flex-1">{m.meta?.team2}</span>
                <span className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface ml-4">
                  {getScoreText(m, "2")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 text-right font-black text-on-surface text-lg line-clamp-2">{m.meta?.team1}</div>
              <div className="px-4 text-outline-variant font-black italic">VS</div>
              <div className="flex-1 text-left font-black text-on-surface text-lg line-clamp-2">{m.meta?.team2}</div>
            </div>
          )}
        </div>
        <div className="bg-inverse-surface text-inverse-on-surface p-3 text-center text-xs tracking-widest uppercase font-bold group-hover:bg-primary group-hover:text-white transition-colors">
          {isLive ? "View Live Scorecard" : (
            m.meta?.scheduledAt ? new Date(m.meta.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short", hour12: true }) : (m.meta?.date || "Date TBD")
          )}
        </div>
      </Link>
    );
  };

  const renderRecentCard = (match: any) => {
    const matchUrl = match.sport === "cricket" ? `/match/${match.id}` : `/${match.sport}/match/${match.id}`;
    
    return (
      <Link href={matchUrl} key={match.id} className="bg-surface rounded-2xl border border-outline shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-primary transition-all group">
        <div className="bg-surface-dim border-b border-outline px-4 py-2 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-widest group-hover:bg-primary/5 transition-colors">
          <span>{match.sport}</span>
          <span className="flex items-center gap-1"><Calendar size={12}/> Ended</span>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-4 gap-4">
             <div className="font-black text-on-surface text-lg line-clamp-1 flex-1">{match.meta.team1}</div>
             <div className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface">
               {getScoreText(match, "1")}
             </div>
           </div>
           <div className="flex justify-between items-center gap-4">
             <div className="font-black text-on-surface text-lg line-clamp-1 flex-1">{match.meta.team2}</div>
             <div className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface">
               {getScoreText(match, "2")}
             </div>
           </div>
        </div>
        <div className="bg-inverse-surface text-inverse-on-surface p-3 text-center text-sm font-bold group-hover:bg-primary group-hover:text-white transition-colors">
          {match.result || "Match Completed"}
        </div>
      </Link>
    );
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <AppShell>
        <div className="min-h-[85vh] flex items-center justify-center bg-inverse-surface">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-surface-bright font-black uppercase tracking-widest text-xs animate-pulse">Initializing System...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {showDashboard ? (
        // DASHBOARD VIEW
        <section className="bg-surface-container min-h-[70vh] py-12 border-b border-outline">
          <div className="max-w-[1280px] mx-auto px-6">
            
            <div className="mb-12">
              <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
                Welcome back, {userData?.name?.split(' ')[0] || "Athlete"}
              </h1>
              <p className="text-on-surface-variant font-bold uppercase tracking-widest text-sm">
                Dashboard <span className="mx-2 text-outline">///</span> {primarySport} {userData?.primaryRole}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Matches & Stats */}
              <div className="lg:col-span-2 space-y-12">
                
                {/* 1. Quick Stats Block */}
                <div className="bg-primary text-on-primary rounded-2xl p-8 relative overflow-hidden shadow-xl">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 opacity-80">Your Career Stats</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="cursor-pointer hover:bg-white/10 p-2 -m-2 rounded-lg transition-colors" onClick={() => setShowMatchesModal(true)}>
                      <div className="text-4xl font-black mb-1">{userStats.matchesPlayed}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Matches Played</div>
                    </div>
                    <div className="cursor-pointer hover:bg-white/10 p-2 -m-2 rounded-lg transition-colors" onClick={() => setShowTournamentsModal(true)}>
                      <div className="text-4xl font-black mb-1">{userStats.tournamentsJoined}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tournaments</div>
                    </div>
                    <div className="cursor-pointer hover:bg-white/10 p-2 -m-2 rounded-lg transition-colors" onClick={() => setShowUpcomingModal(true)}>
                      <div className="text-4xl font-black mb-1 text-surface-bright">{userStats.activeMatches}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Upcoming</div>
                    </div>
                  </div>
                </div>

                {/* 2. Active Matches */}
                {myScheduledLiveMatches.length > 0 && (
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Play size={20} className="text-primary fill-primary"/> Your Active Matches
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myScheduledLiveMatches.slice(0, 5).map((m: any, index: number) => (
                        <div key={m.id} className={index >= 2 ? 'hidden sm:block' : ''}>
                          {renderDashboardMatch(m)}
                        </div>
                      ))}
                    </div>
                    {myScheduledLiveMatches.length > 5 && (
                      <button onClick={() => setShowUpcomingModal(true)} className="hidden sm:block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Active Matches
                      </button>
                    )}
                    {myScheduledLiveMatches.length > 2 && (
                      <button onClick={() => setShowUpcomingModal(true)} className="sm:hidden block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Active Matches
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Recent Matches */}
                {myAllCompletedMatches.length > 0 && (
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-on-surface">
                      <Trophy size={20} className="text-primary"/> Your Recent Matches
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myAllCompletedMatches.slice(0, 5).map((m: any, index: number) => (
                        <div key={m.id} className={index >= 2 ? 'hidden sm:block' : ''}>
                          {renderRecentCard(m)}
                        </div>
                      ))}
                    </div>
                    {myAllCompletedMatches.length > 5 && (
                      <button onClick={() => setShowMatchesModal(true)} className="hidden sm:block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Recent Matches
                      </button>
                    )}
                    {myAllCompletedMatches.length > 2 && (
                      <button onClick={() => setShowMatchesModal(true)} className="sm:hidden block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Recent Matches
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Active Tournaments */}
                {myTournaments.length > 0 && (
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-on-surface">
                      <Trophy size={20} className="text-primary"/> Your Active Tournaments
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myTournaments.slice(0, 5).map((t: any, index: number) => (
                        <Link href={`/tournaments/${t.sport}/${t.id}`} key={t.id} className={`block group bg-surface border border-outline rounded-xl p-4 hover:border-primary transition-all ${index >= 2 ? 'hidden sm:block' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-dim border border-outline flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                              {t.logo ? <img src={t.logo} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={20} className="text-primary opacity-50" />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <h4 className="font-bold text-base text-on-surface truncate group-hover:text-primary transition-colors">{t.name}</h4>
                              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{t.sport}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {myTournaments.length > 5 && (
                      <button onClick={() => setShowTournamentsModal(true)} className="hidden sm:block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Active Tournaments
                      </button>
                    )}
                    {myTournaments.length > 2 && (
                      <button onClick={() => setShowTournamentsModal(true)} className="sm:hidden block w-full py-4 mt-6 bg-surface-dim border border-outline text-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-surface-variant transition-colors text-xs">
                        See All Active Tournaments
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* Right Column: Recommended Tournaments */}
              <div>
                {recommendedTournaments.length > 0 && (
                  <div className="bg-surface border border-outline rounded-2xl p-6">
                    <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-on-surface">
                      <Trophy size={18} className="text-primary"/> Available For You
                    </h2>
                    <div className="space-y-4">
                      {recommendedTournaments.slice(0, 5).map((t, index) => (
                        <Link href={`/tournaments/${t.sport}/${t.id}`} key={t.id} className={`block group ${index >= 2 ? 'hidden sm:block' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-dim border border-outline flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                              {t.logo ? (
                                <img src={t.logo} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <Trophy size={20} className="text-primary opacity-50" />
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{t.name}</h4>
                              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{t.sport}</p>
                            </div>
                            <div className="shrink-0 text-primary">
                              <ArrowRight size={16} />
                            </div>
                          </div>
                        </Link>
                      ))}
                      {/* See more button for PC (> 5 items) */}
                      {recommendedTournaments.length > 5 && (
                        <Link href="/tournaments" className="hidden sm:block w-full py-3 mt-4 bg-inverse-surface text-inverse-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-primary transition-colors text-xs">
                          See More
                        </Link>
                      )}
                      {/* See more button for Mobile (> 2 items) */}
                      {recommendedTournaments.length > 2 && (
                        <Link href="/tournaments" className="sm:hidden block w-full py-3 mt-4 bg-inverse-surface text-inverse-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-primary transition-colors text-xs">
                          See More
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      ) : (
        // HERO SECTION (Fallback)
        <section className="relative min-h-[85vh] flex items-center bg-inverse-surface overflow-hidden text-on-primary">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2000" 
              alt="Athletic Football Player" 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-20">
            <div className="max-w-2xl">
              <div className="inline-block bg-inverse-surface border border-outline px-3 py-1 mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-bright">
                  System Online
                </span>
              </div>
              
              <h1 className="font-display text-6xl md:text-7xl lg:text-[80px] font-black leading-[0.9] tracking-tighter mb-8 uppercase">
                Control the pace.<br/>
                <span className="text-primary italic">Dominate the pitch.</span>
              </h1>
              
              <p className="text-lg md:text-xl font-medium text-inverse-on-surface opacity-80 leading-relaxed mb-12 max-w-xl">
                The definitive sports ecosystem engineered for high-performance athletes, elite clubs, and relentless organizers. Built with brutal efficiency.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <>
                    <Link 
                      href="/scores" 
                      className="bg-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
                    >
                      See Recent Matches <ArrowRight size={18} strokeWidth={3}/>
                    </Link>
                    <Link 
                      href="/players" 
                      className="bg-inverse-surface/50 backdrop-blur border-2 border-on-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center hover:bg-on-primary hover:text-inverse-surface transition-colors"
                    >
                      Explore Network
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/signup" 
                      className="bg-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
                    >
                      Join the Community <ArrowRight size={18} strokeWidth={3}/>
                    </Link>
                    <Link 
                      href="/players" 
                      className="bg-inverse-surface/50 backdrop-blur border-2 border-on-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center hover:bg-on-primary hover:text-inverse-surface transition-colors"
                    >
                      Explore Network
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>


        </section>
      )}

      {/* Latest Results Section Always Shown if there are recent matches */}
      {recentMatches.length > 0 && (
        <section className="bg-surface py-20 border-b border-outline">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface mb-2">
                  Network Activity
                </h2>
                <p className="text-on-surface-variant font-medium">The latest completed matches across the ecosystem.</p>
              </div>
              <Link href="/scores" className="hidden sm:flex text-primary font-bold uppercase tracking-widest text-xs items-center gap-2 hover:text-primary-container">
                View All Results <ArrowRight size={14} strokeWidth={3}/>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentMatches.map(m => renderRecentCard(m))}
            </div>
            
            <Link href="/scores" className="sm:hidden mt-8 text-primary font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-primary-container bg-surface-dim py-4 rounded-xl">
              View All Results <ArrowRight size={14} strokeWidth={3}/>
            </Link>
          </div>
        </section>
      )}

      {/* The Arsenal Section */}
      <section className="bg-surface py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          
          <div className="mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter border-b-4 border-primary inline-block pb-2 mb-6">
              The Arsenal
            </h2>
            <p className="text-on-surface-variant font-medium max-w-2xl text-lg">
              Core modules designed to streamline operations and amplify performance across the board.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Team Management (Span 2) */}
            <div className="md:col-span-2 relative h-[400px] bg-inverse-surface overflow-hidden group">
              <img 
                src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800" 
                alt="Team" 
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface to-transparent opacity-80"></div>
              
              <div className="relative z-10 p-10 h-full flex flex-col justify-end">
                <div className="flex items-center gap-3 text-primary mb-4">
                  <Users size={24} strokeWidth={2.5}/>
                </div>
                <h3 className="font-display text-3xl font-black text-on-primary uppercase tracking-tight mb-3">
                  {isFootball ? "Club Management" : "Team Management"}
                </h3>
                <p className="text-inverse-on-surface opacity-80 max-w-md mb-8">
                  Take total control of your roster. Streamline day-to-day operations, track critical finances, and coordinate match schedules with uncompromising precision.
                </p>
                <Link href={isFootball ? "/clubs" : "/teams"} className="text-primary font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:text-primary-container">
                  {isFootball ? "Manage Club" : "Manage Team"} <ArrowRight size={14} strokeWidth={3}/>
                </Link>
              </div>
            </div>

            {/* Tournament Registration */}
            <div className="bg-inverse-surface p-10 h-[400px] flex flex-col">
              <div className="w-12 h-12 bg-surface text-primary flex items-center justify-center mb-auto shadow-sm">
                <Trophy size={24} strokeWidth={2.5}/>
              </div>
              <h3 className="font-display text-3xl font-black text-on-primary uppercase tracking-tight mb-4 mt-12">
                Tournament Registration
              </h3>
              <p className="text-inverse-on-surface opacity-80 mb-8">
                Enter the arena. Discover, evaluate, and register for top-tier competitive events instantly. No friction, just competition.
              </p>
              <Link href="/tournaments" className="bg-surface text-on-surface text-center font-bold uppercase tracking-widest text-xs py-4 hover:bg-surface-variant transition-colors">
                View Brackets
              </Link>
            </div>

            {/* Player Networking (Full Span Split) */}
            <div className="md:col-span-3 bg-surface-container flex flex-col md:flex-row h-auto md:h-[400px]">
              <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
                <span className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Global Network</span>
                <h3 className="font-display text-4xl font-black text-on-surface uppercase tracking-tight mb-6">
                  Player Networking
                </h3>
                <p className="text-on-surface-variant max-w-md mb-10 text-lg">
                  Connect with elite peers, get scouted by top clubs, and build a professional athletic profile in a high-stakes, data-driven environment.
                </p>
                <div>
                  <Link href="/profile" className="border-2 border-primary text-primary font-bold uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary hover:text-on-primary transition-colors inline-block">
                    Build Profile
                  </Link>
                </div>
              </div>
              <div className="flex-1 relative min-h-[300px]">
                 <img 
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200" 
                  alt="Tennis Players" 
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-100"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sports Ticker */}
      <div className="bg-inverse-surface border-t border-b border-outline-variant text-surface-bright overflow-hidden flex whitespace-nowrap py-3">
        <div className="animate-marquee inline-block font-display font-bold uppercase tracking-widest text-sm">
          <span className="text-primary mr-2">● LIVE:</span> RED DRAGONS FC 2 - 1 METRO UTD 
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>No friction, just competition</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Control the pace</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Dominate the pitch</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>System Online</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>High-performance athletes</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Elite clubs</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Relentless organizers</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span>
        </div>
      </div>
          {/* Matches Modal */}
          {showMatchesModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowMatchesModal(false); }}>
              <div className="bg-surface border border-outline rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-dim rounded-t-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-on-surface flex items-center gap-2">
                    <Trophy size={20} className="text-primary"/> All Matches Played
                  </h2>
                  <button onClick={() => setShowMatchesModal(false)} className="text-on-surface-variant hover:text-primary transition-colors"><X size={24}/></button>
                </div>
                <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
                  {myAllCompletedMatches.length > 0 ? myAllCompletedMatches.map((m: any) => renderRecentCard(m)) : <p className="text-on-surface-variant text-center font-bold">No matches played yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Tournaments Modal */}
          {showTournamentsModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTournamentsModal(false); }}>
              <div className="bg-surface border border-outline rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-dim rounded-t-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-on-surface flex items-center gap-2">
                    <Trophy size={20} className="text-primary"/> Your Tournaments
                  </h2>
                  <button onClick={() => setShowTournamentsModal(false)} className="text-on-surface-variant hover:text-primary transition-colors"><X size={24}/></button>
                </div>
                <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
                  {myTournaments.slice(0, 5).map((t: any) => (
                    <Link href={`/tournaments/${t.sport}/${t.id}`} key={t.id} className="block group bg-surface border border-outline rounded-xl p-4 hover:border-primary transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-dim border border-outline flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                          {t.logo ? <img src={t.logo} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={20} className="text-primary opacity-50" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-base text-on-surface truncate group-hover:text-primary transition-colors">{t.name}</h4>
                          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{t.sport}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {myTournaments.length === 0 && <p className="text-on-surface-variant text-center font-bold">No tournaments joined yet.</p>}
                  {myTournaments.length > 5 && (
                    <Link href="/profile/tournaments" className="w-full py-4 mt-4 bg-inverse-surface text-inverse-on-surface font-black uppercase tracking-widest text-center rounded-xl hover:bg-primary transition-colors text-sm">
                      See All Tournaments
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Modal */}
          {showUpcomingModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowUpcomingModal(false); }}>
              <div className="bg-surface border border-outline rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-dim rounded-t-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-on-surface flex items-center gap-2">
                    <Calendar size={20} className="text-primary"/> Scheduled Matches
                  </h2>
                  <button onClick={() => setShowUpcomingModal(false)} className="text-on-surface-variant hover:text-primary transition-colors"><X size={24}/></button>
                </div>
                <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
                  {myScheduledLiveMatches.length > 0 ? myScheduledLiveMatches.map((m: any) => renderDashboardMatch(m)) : <p className="text-on-surface-variant text-center font-bold">No upcoming matches.</p>}
                </div>
              </div>
            </div>
          )}

    </AppShell>
  );
}
