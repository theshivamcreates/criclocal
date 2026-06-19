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

export interface MatchMeta {
  team1: string;
  team2: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Roster?: string[];
  team2Roster?: string[];
  team1Color?: string;
  team2Color?: string;
  overs: number;
  toss: "team1" | "team2";
  elected: "bat" | "field";
  status: "upcoming" | "live" | "completed";
  createdBy: string;
  createdAt: number;
}

export interface Match {
  meta: MatchMeta;
  innings: Record<string, Innings>;
  currentInnings: number;
  result: string | null;
}

export interface Tournament {
  name: string;
  createdBy: string;
  matches: string[];
}
