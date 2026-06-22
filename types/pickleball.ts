export interface PickleballPlayer {
  name: string;
}

export interface PickleballEvent {
  id: string;
  type: "point" | "fault" | "timeout";
  team: "team1" | "team2";
  time: string; // e.g., "12:34"
  scorerName?: string;
  timestamp: number;
  setNumber: number;
}

export interface PickleballTournamentTeam {
  name: string;
  color?: string;
  logo?: string;
  roster?: PickleballPlayer[];
}

export interface PickleballSettings {
  format: "Singles" | "Doubles";
  maxSets: number; // usually 1 or 3
  pointsToWin: number; // usually 11, 15, or 21
}

export interface PickleballTournament {
  name: string;
  entryFee?: string;
  maxTeams?: number | string;
  startDate?: string;
  location?: string;
  skillLevel?: string;
  status?: string;
  bannerUrl?: string;
  createdBy: string;
  createdAt: number;
  teams: Record<string, PickleballTournamentTeam>;
  matches?: string[];
  settings?: PickleballSettings;
}

export interface PickleballMatchMeta {
  team1: string;
  team2: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Roster?: PickleballPlayer[];
  team2Roster?: PickleballPlayer[];
  team1Color?: string;
  team2Color?: string;
  status: "scheduled" | "upcoming" | "live" | "completed";
  scheduledAt?: number;
  createdBy: string;
  createdAt: number;
  tournamentId?: string;
  settings: PickleballSettings;
  matchTitle?: string;
  overlayLogo?: string;
}

export interface PickleballScore {
  team1: {
    points: number;
    sets: number;
    playerPoints?: Record<string, number>;
  };
  team2: {
    points: number;
    sets: number;
    playerPoints?: Record<string, number>;
  };
}

export interface PickleballMatch {
  meta: PickleballMatchMeta;
  score: PickleballScore;
  timer?: {
    isRunning: boolean;
    seconds: number;
    lastUpdated: number;
  };
  events?: Record<string, PickleballEvent>;
  result: string | null;
}
