"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { db, auth, firestore } from "@/lib/firebase";
import { onValue, ref as dbRef } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { Trophy, Calendar } from "lucide-react";

export default function ProfileTournamentsPage() {
  const [cricketTournaments, setCricketTournaments] = useState<Record<string, any>>({});
  const [footballTournaments, setFootballTournaments] = useState<Record<string, any>>({});
  const [pickleballTournaments, setPickleballTournaments] = useState<Record<string, any>>({});
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        try {
          const snap = await getDoc(doc(firestore, `users/${u.uid}`));
          if (snap.exists()) setUserData(snap.data());
        } catch (e) {}
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!db) return;
    let ct = false, ft = false, pt = false;
    const check = () => { if (ct && ft && pt) setIsDataLoading(false); };

    const unsubCT = onValue(dbRef(db, "tournaments"), (s) => { setCricketTournaments(s.val() ?? {}); ct = true; check(); });
    const unsubFT = onValue(dbRef(db, "football/tournaments"), (s) => { setFootballTournaments(s.val() ?? {}); ft = true; check(); });
    const unsubPT = onValue(dbRef(db, "pickleball/tournaments"), (s) => { setPickleballTournaments(s.val() ?? {}); pt = true; check(); });

    return () => { unsubCT(); unsubFT(); unsubPT(); };
  }, []);

  const myTournaments = useMemo(() => {
    if (!user) return [];
    const cT = Object.entries(cricketTournaments).map(([id, t]) => ({ id, ...t, sport: "cricket" }));
    const fT = Object.entries(footballTournaments).map(([id, t]) => ({ id, ...t, sport: "football" }));
    const pT = Object.entries(pickleballTournaments).map(([id, t]) => ({ id, ...t, sport: "pickleball" }));
    const allT = [...cT, ...fT, ...pT];

    const list: any[] = [];
    for (const t of allT) {
      let participating = false;
      if (t.teams) {
        for (const [teamId, teamData] of Object.entries(t.teams as Record<string,any>)) {
          if (teamData.userId === user.uid || teamId === user.uid || (teamData.roster && teamData.roster.some((r:any) => r.id === user.uid))) {
            participating = true;
          }
        }
      }
      if (participating) list.push(t);
    }
    
    return list.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [cricketTournaments, footballTournaments, pickleballTournaments, user]);

  if (isDataLoading) {
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
      <div className="bg-surface-container min-h-screen py-12">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
              My Tournaments
            </h1>
            <p className="text-on-surface-variant font-bold uppercase tracking-widest text-sm">
              All tournaments {userData?.name ? userData.name.split(" ")[0] : "you"} have ever participated in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myTournaments.map(t => (
              <Link href={`/tournaments/${t.sport}/${t.id}`} key={t.id} className="block group bg-surface border border-outline rounded-2xl p-6 hover:border-primary hover:shadow-lg transition-all">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-xl bg-surface-dim border border-outline flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                    {t.logo ? <img src={t.logo} className="w-full h-full object-cover rounded-xl" /> : <Trophy size={32} className="text-primary opacity-50" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{t.sport}</p>
                    </div>
                    <h4 className="font-black text-xl text-on-surface line-clamp-2 group-hover:text-primary transition-colors">{t.name}</h4>
                    <div className="mt-4 flex items-center gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Calendar size={14}/> {t.status || "UNKNOWN"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {myTournaments.length === 0 && (
             <div className="text-center py-24 bg-surface border border-outline rounded-2xl">
               <Trophy size={48} className="mx-auto text-on-surface-variant mb-6 opacity-50"/>
               <h3 className="text-xl font-black uppercase tracking-widest text-on-surface">No Tournaments Found</h3>
               <p className="text-on-surface-variant font-bold mt-2">You haven't joined any tournaments yet.</p>
               <Link href="/tournaments" className="inline-block mt-8 bg-primary text-on-primary font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl hover:bg-primary-container transition-colors">
                 Find Tournaments
               </Link>
             </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
