"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { Trophy, Calendar, MapPin, Users, Award, X, Users2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  roster?: { name: string; role: string }[];
}

interface TournamentData {
  id: string;
  name: string;
  entryFee?: string;
  maxTeams?: string;
  startDate?: string;
  location?: string;
  skillLevel?: string;
  status?: string;
  bannerUrl?: string;
  createdAt: number;
  teams?: Record<string, Team>;
}

export default function PublicTournamentPage({
  params,
}: {
  params: Promise<{ sport: string; tournamentId: string }>;
}) {
  const resolvedParams = use(params);
  const { sport, tournamentId } = resolvedParams;

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    // Determine the Firebase DB path based on the sport parameter
    const dbPath =
      sport === "football"
        ? `football/tournaments/${tournamentId}`
        : `tournaments/${tournamentId}`;

    const tRef = dbRef(db, dbPath);
    const unsubscribe = onValue(tRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTournament({ ...data, id: tournamentId });
      } else {
        setTournament(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sport, tournamentId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8 text-on-surface-variant font-medium">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="animate-pulse text-primary" size={48} />
            <p>Loading tournament details...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!tournament) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-10">
          <Trophy size={64} className="text-outline mb-6" />
          <h2 className="text-3xl font-black mb-2 text-on-surface">Tournament Not Found</h2>
          <p className="text-on-surface-variant mb-8 max-w-md">
            This tournament may have been deleted, or the URL is incorrect.
          </p>
          <Link
            href="/tournaments"
            className="px-6 py-3 bg-primary hover:bg-primary-container text-white rounded-lg font-black transition-colors"
          >
            Browse Tournaments
          </Link>
        </div>
      </AppShell>
    );
  }

  const teamList = tournament.teams
    ? Object.keys(tournament.teams).map((k) => ({
        id: k,
        ...tournament.teams![k],
      }))
    : [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "registering":
        return "bg-primary text-white";
      case "ongoing":
        return "bg-emerald-500 text-white";
      case "completed":
        return "bg-surface-variant text-on-surface-variant";
      case "upcoming":
      default:
        return "bg-surface-dim border border-outline text-on-surface";
    }
  };

  return (
    <AppShell>
      {/* Hero Section */}
      <div className="relative w-full bg-surface-dim border-b border-outline">
        {tournament.bannerUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={tournament.bannerUrl}
              alt={tournament.name}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}
        
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 md:py-20 flex flex-col items-start gap-6">
          <Link
            href="/tournaments"
            className="text-sm font-bold text-on-surface-variant hover:text-primary flex items-center gap-2 mb-2 transition-colors bg-surface/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline/50"
          >
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${getStatusColor(
                tournament.status || "Upcoming"
              )}`}
            >
              {tournament.status || "Upcoming"}
            </span>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-inverse-surface text-inverse-on-surface">
              {sport}
            </span>
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-black text-on-surface tracking-tight mb-4">
              {tournament.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-on-surface-variant font-medium">
              {tournament.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  <span>{tournament.startDate}</span>
                </div>
              )}
              {tournament.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span>{tournament.location}</span>
                </div>
              )}
              {tournament.skillLevel && (
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-primary" />
                  <span>{tournament.skillLevel} Division</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            {tournament.entryFee && (
              <div className="bg-surface/80 backdrop-blur-md border border-outline rounded-xl px-5 py-3 flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Entry Fee</span>
                <span className="text-xl font-black text-primary">{tournament.entryFee}</span>
              </div>
            )}
            <div className="bg-surface/80 backdrop-blur-md border border-outline rounded-xl px-5 py-3 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Teams</span>
              <span className="text-xl font-black text-on-surface">
                {teamList.length} <span className="text-base text-on-surface-variant font-medium">/ {tournament.maxTeams || "16"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
            <Users2 className="text-primary" size={24} /> 
            Participating Teams
          </h2>
          <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-sm font-bold">
            {teamList.length} Registered
          </span>
        </div>

        {teamList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline bg-surface-dim p-12 text-center text-on-surface-variant">
            <Trophy className="mx-auto mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-black mb-2 text-on-surface">No teams registered yet</h3>
            <p>Registration might be opening soon. Check back later to see the participating teams.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamList.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="group flex flex-col bg-surface hover:bg-surface-dim border border-outline hover:border-primary transition-all duration-300 rounded-2xl p-6 text-left relative overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: team.color || "#ef4444" }} />
                
                <div className="flex items-center gap-5 ml-2">
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="h-16 w-16 rounded-full border border-outline object-cover shadow-sm bg-surface-variant shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-surface-variant text-xl font-black shadow-sm text-white shrink-0"
                      style={{ backgroundColor: team.color || "#ef4444" }}
                    >
                      {team.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xl text-on-surface truncate group-hover:text-primary transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-on-surface-variant font-medium">
                      <Users size={16} />
                      <span>{team.roster?.length || 0} Players</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roster Popup Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTeam(null)}
          />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between border-b border-outline bg-surface-dim rounded-t-2xl">
              <div className="flex items-center gap-4">
                 {selectedTeam.logo ? (
                    <img
                      src={selectedTeam.logo}
                      alt={selectedTeam.name}
                      className="h-12 w-12 rounded-full border border-outline object-cover bg-surface shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-outline bg-surface text-sm font-black text-white shrink-0"
                      style={{ backgroundColor: selectedTeam.color || "#ef4444" }}
                    >
                      {selectedTeam.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-black text-on-surface">{selectedTeam.name}</h3>
                    <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                      Team Roster
                    </p>
                  </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {!selectedTeam.roster || selectedTeam.roster.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <Users2 size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No players have been assigned to this team's roster yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedTeam.roster.map((player, idx) => (
                    <li key={idx} className="flex items-center justify-between p-4 rounded-xl border border-outline hover:border-primary/50 transition-colors bg-surface-dim">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-primary w-6 text-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-on-surface text-lg">{player.name}</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-surface rounded-full border border-outline-variant text-on-surface-variant">
                        {player.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-outline bg-surface-dim rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-6 py-2 bg-inverse-surface text-white hover:bg-surface-variant hover:text-on-surface rounded-lg font-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
