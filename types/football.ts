export interface FootballPlayer {
  name: string;
  role: "Forward" | "Midfielder" | "Defender" | "Goalkeeper" | "Manager" | "Player";
}

export interface FootballEvent {
  id: string;
  type: "goal" | "yellow_card" | "red_card" | "sub";
  team: "team1" | "team2";
  time: string; // e.g., "45:12"
  scorerName?: string;
  assistName?: string;
  timestamp: number;
}

export interface FootballTournamentTeam {
 name: string;
 color?: string;
 logo?: string;
 roster?: FootballPlayer[];
}

export interface FootballTournament {
 name: string;
 createdBy: string;
 createdAt: number;
 teams: Record<string, FootballTournamentTeam>;
 matches?: string[];
 settings?: {
 maxPlayersPerTeam: number;
 matchDurationMinutes: number;
 };
}

export interface FootballMatchMeta {
 team1: string;
 team2: string;
 team1Logo?: string;
 team2Logo?: string;
 team1Roster?: FootballPlayer[];
 team2Roster?: FootballPlayer[];
 team1Color?: string;
 team2Color?: string;
 status:"scheduled" |"upcoming" |"live" |"completed";
 scheduledAt?: number;
 createdBy: string;
 createdAt: number;
 tournamentId?: string;
}

export interface FootballMatch {
 meta: FootballMatchMeta;
 score: {
 team1: number;
 team2: number;
 };
 timer: {
 isRunning: boolean;
 seconds: number; // Base elapsed seconds
 lastUpdated: number; // Timestamp when it was last started/paused
 };
 events?: Record<string, FootballEvent>;
 result: string | null;
}
