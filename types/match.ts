export type BallEvent = "0" | "1" | "2" | "3" | "4" | "6" | "W" | "WD" | "NB" | "B" | "LB";

export interface Batsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: "batting" | "out" | "yet-to-bat";
}

export interface Bowler {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface OverSummary {
  over: number;
  balls: BallEvent[];
  runs: number;
  wickets: number;
}

export interface Innings {
  battingTeam: "team1" | "team2";
  runs: number;
  wickets: number;
  balls: number;
  extras: { wide: number; noBall: number; bye: number; legBye: number };
  batsmen: Record<string, Batsman>;
  bowlers: Record<string, Bowler>;
  overHistory: OverSummary[];
  currentOver: BallEvent[];
  partnership: { runs: number; balls: number };
  strikerKey: string;
  nonStrikerKey: string;
  bowlerKey: string;
  isFreeHit?: boolean;
}

export interface Player {
  name: string;
  role: "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper" | "Fielder" | "Player";
}

export interface MatchMeta {
  team1: string;
  team2: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Roster?: Player[];
  team2Roster?: Player[];
  team1Color?: string;
  team2Color?: string;
  overs: number;
  toss: "team1" | "team2";
  elected: "bat" | "field";
  status: "scheduled" | "upcoming" | "live" | "completed";
  scheduledAt?: number;
  createdBy: string;
  createdAt: number;
  tournamentId?: string;
}

export interface TournamentTeam {
  name: string;
  color?: string;
  logo?: string;
  roster?: Player[];
}

export interface Tournament {
  name: string;
  createdBy: string;
  createdAt: number;
  teams: Record<string, TournamentTeam>;
  matches?: string[];
  settings?: {
    maxPlayersPerTeam: number;
    defaultOvers: number;
  };
}

export interface Match {
  meta: MatchMeta;
  innings: Record<string, Innings>;
  currentInnings: number;
  result: string | null;
}
