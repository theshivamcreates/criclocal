import type {
  BallEvent,
  Batsman,
  Bowler,
  Innings,
  Match,
  OverSummary,
} from "@/types/match";

export function getBalls(innings: Innings): number {
  return innings.balls;
}

export function getOversDisplay(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function getRunRate(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  return ((runs / balls) * 6).toFixed(2);
}

export function getRequiredRunRate(
  target: number,
  currentRuns: number,
  ballsLeft: number,
): string {
  const needed = target - currentRuns;
  if (needed <= 0) return "0.00";
  if (ballsLeft <= 0) return "∞";
  return ((needed / ballsLeft) * 6).toFixed(2);
}

export function isLegalBall(event: BallEvent): boolean {
  return !["WD", "NB"].includes(event);
}

export function getRunsFromEvent(event: BallEvent): number {
  if (event === "W") return 0;
  if (event === "WD" || event === "NB") return 1;
  if (event === "B" || event === "LB") return 1;
  return Number.parseInt(event, 10) || 0;
}

export function getCurrentInnings(match: Match): Innings {
  return match.innings[String(match.currentInnings)] ?? match.innings["1"];
}

export function getBattingTeamName(
  match: Match,
  innings = getCurrentInnings(match),
): string {
  return innings.battingTeam === "team1" ? match.meta.team1 : match.meta.team2;
}

export function getBowlingTeamName(
  match: Match,
  innings = getCurrentInnings(match),
): string {
  return innings.battingTeam === "team1" ? match.meta.team2 : match.meta.team1;
}

export function getActiveBatsmen(innings: Innings): [string, Batsman][] {
  const strikerKey = innings.strikerKey || "striker";
  const nonStrikerKey = innings.nonStrikerKey || "nonStriker";
  return [
    [
      strikerKey,
      innings.batsmen[strikerKey] ?? {
        name: "Striker",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: "batting",
      },
    ],
    [
      nonStrikerKey,
      innings.batsmen[nonStrikerKey] ?? {
        name: "Non-striker",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: "batting",
      },
    ],
  ];
}

export function getCurrentBowler(innings: Innings): [string, Bowler] | null {
  const bowlerKey = innings.bowlerKey || "bowler";
  return [
    bowlerKey,
    innings.bowlers[bowlerKey] ?? {
      name: "Current bowler",
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
    },
  ];
}

export function buildEmptyInnings(battingTeam: "team1" | "team2"): Innings {
  return {
    battingTeam,
    runs: 0,
    wickets: 0,
    balls: 0,
    extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
    batsmen: {
      striker: {
        name: "Striker",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: "batting",
      },
      nonStriker: {
        name: "Non-striker",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: "batting",
      },
    },
    bowlers: {
      bowler: {
        name: "Current bowler",
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      },
    },
    overHistory: [],
    currentOver: [],
    partnership: { runs: 0, balls: 0 },
    strikerKey: "striker",
    nonStrikerKey: "nonStriker",
    bowlerKey: "bowler",
  };
}

export function buildNewMatch(
  team1: string,
  team2: string,
  overs: number,
  toss: "team1" | "team2",
  elected: "bat" | "field",
  createdBy: string,
  team1Logo?: string,
  team2Logo?: string,
  team1Roster?: any[],
  team2Roster?: any[],
  team1Color?: string,
  team2Color?: string,
  scheduledAt?: number,
): Match {
  const battingTeam =
    elected === "bat" ? toss : toss === "team1" ? "team2" : "team1";

  const meta: any = {
    team1,
    team2,
    overs,
    toss,
    elected,
    status: scheduledAt ? "scheduled" : "live",
    createdBy,
    createdAt: Date.now(),
  };

  if (scheduledAt) meta.scheduledAt = scheduledAt;
  if (team1Logo) meta.team1Logo = team1Logo;
  if (team2Logo) meta.team2Logo = team2Logo;
  if (team1Roster) meta.team1Roster = team1Roster;
  if (team2Roster) meta.team2Roster = team2Roster;
  if (team1Color) meta.team1Color = team1Color;
  if (team2Color) meta.team2Color = team2Color;

  return {
    meta,
    innings: {
      "1": buildEmptyInnings(battingTeam),
    },
    currentInnings: 1,
    result: null,
  };
}

export function applyBall(innings: Innings, event: BallEvent): Innings {
  // Custom rule: over is complete if we have a multiple of 6 counting balls and we're not waiting for a free hit.
  // If the user clicks a ball after the over is complete (but before the UI auto-ends it), end it now.
  const hasLegalBalls = (innings.currentOver ?? []).some(isLegalBall);
  if (
    innings.balls > 0 &&
    innings.balls % 6 === 0 &&
    !innings.isFreeHit &&
    hasLegalBalls
  ) {
    innings = endCurrentOver(innings);
  }

  const runs = getRunsFromEvent(event);
  const legal = isLegalBall(event);
  const strikerKey = innings.strikerKey || "striker";
  const nonStrikerKey = innings.nonStrikerKey || "nonStriker";
  const bowlerKey = innings.bowlerKey || "bowler";

  // Custom rule: Free hits are extra bonus balls that do not count towards the 6-ball over limit
  const countsTowardsOver = legal && !innings.isFreeHit;
  const nextBalls = innings.balls + (countsTowardsOver ? 1 : 0);

  const striker = innings.batsmen[strikerKey] ?? {
    name: "Striker",
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    status: "batting",
  };
  const nonStriker = innings.batsmen[nonStrikerKey] ?? {
    name: "Non-striker",
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    status: "batting",
  };
  const bowler = innings.bowlers[bowlerKey] ?? {
    name: "Current bowler",
    overs: 0,
    balls: 0,
    runs: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0,
  };

  const nextCurrentOver = [...(innings.currentOver ?? []), event];
  const nextStriker = {
    ...striker,
    runs:
      striker.runs + (["WD", "NB", "B", "LB", "W"].includes(event) ? 0 : runs),
    balls: striker.balls + (legal ? 1 : 0),
    fours: striker.fours + (event === "4" ? 1 : 0),
    sixes: striker.sixes + (event === "6" ? 1 : 0),
    status: event === "W" ? "out" : striker.status,
  };
  const nextBowler = {
    ...bowler,
    runs: bowler.runs + runs,
    wickets: bowler.wickets + (event === "W" ? 1 : 0),
    wides: bowler.wides + (event === "WD" ? 1 : 0),
    noBalls: bowler.noBalls + (event === "NB" ? 1 : 0),
    balls: bowler.balls + (countsTowardsOver ? 1 : 0),
    overs: Math.floor((bowler.balls + (countsTowardsOver ? 1 : 0)) / 6),
  };

  const isOddRuns = ["1", "3", "5"].includes(event);
  let nextStrikerKey = strikerKey;
  let nextNonStrikerKey = nonStrikerKey;

  if (isOddRuns) {
    nextStrikerKey = nonStrikerKey;
    nextNonStrikerKey = strikerKey;
  }

  return {
    ...innings,
    runs: innings.runs + runs,
    wickets: innings.wickets + (event === "W" ? 1 : 0),
    balls: nextBalls,
    extras: {
      ...innings.extras,
      wide: innings.extras.wide + (event === "WD" ? 1 : 0),
      noBall: innings.extras.noBall + (event === "NB" ? 1 : 0),
      bye: innings.extras.bye + (event === "B" ? 1 : 0),
      legBye: innings.extras.legBye + (event === "LB" ? 1 : 0),
    },
    batsmen: { ...innings.batsmen, [strikerKey]: nextStriker },
    bowlers: { ...innings.bowlers, [bowlerKey]: nextBowler },
    currentOver: nextCurrentOver,
    partnership: {
      runs: innings.partnership.runs + runs,
      balls: innings.partnership.balls + (legal ? 1 : 0),
    },
    strikerKey: nextStrikerKey,
    nonStrikerKey: nextNonStrikerKey,
    bowlerKey: bowlerKey,
    isFreeHit:
      event === "NB"
        ? true
        : ["WD"].includes(event)
          ? innings.isFreeHit
          : false,
  };
}

export function undoLastBall(innings: Innings): Innings {
  const currentOver = innings.currentOver ?? [];
  const last = currentOver[currentOver.length - 1];
  if (!last) return innings;

  const runs = getRunsFromEvent(last);
  const legal = isLegalBall(last);

  let originalStrikerKey = innings.strikerKey || "striker";
  let originalNonStrikerKey = innings.nonStrikerKey || "nonStriker";

  if (runs % 2 !== 0) {
    originalStrikerKey = innings.nonStrikerKey || "nonStriker";
    originalNonStrikerKey = innings.strikerKey || "striker";
  }

  const batterKey = originalStrikerKey;
  const batter = innings.batsmen[batterKey];
  const bowlerKey = innings.bowlerKey || "bowler";
  const bowler = innings.bowlers[bowlerKey];
  const nextBowlerBalls = Math.max(0, (bowler?.balls ?? 0) - (legal ? 1 : 0));

  return {
    ...innings,
    runs: Math.max(0, innings.runs - runs),
    wickets: Math.max(0, innings.wickets - (last === "W" ? 1 : 0)),
    balls: Math.max(0, innings.balls - (legal ? 1 : 0)),
    extras: {
      wide: Math.max(0, innings.extras.wide - (last === "WD" ? 1 : 0)),
      noBall: Math.max(0, innings.extras.noBall - (last === "NB" ? 1 : 0)),
      bye: Math.max(0, innings.extras.bye - (last === "B" ? 1 : 0)),
      legBye: Math.max(0, innings.extras.legBye - (last === "LB" ? 1 : 0)),
    },
    batsmen: batter
      ? {
          ...innings.batsmen,
          [batterKey]: {
            ...batter,
            runs: Math.max(
              0,
              batter.runs -
                (["WD", "NB", "B", "LB", "W"].includes(last) ? 0 : runs),
            ),
            balls: Math.max(0, batter.balls - (legal ? 1 : 0)),
            fours: Math.max(0, batter.fours - (last === "4" ? 1 : 0)),
            sixes: Math.max(0, batter.sixes - (last === "6" ? 1 : 0)),
            status: last === "W" ? "batting" : batter.status,
          },
        }
      : innings.batsmen,
    bowlers: bowler
      ? {
          ...innings.bowlers,
          [bowlerKey]: {
            ...bowler,
            runs: Math.max(0, bowler.runs - runs),
            wickets: Math.max(0, bowler.wickets - (last === "W" ? 1 : 0)),
            wides: Math.max(0, bowler.wides - (last === "WD" ? 1 : 0)),
            noBalls: Math.max(0, bowler.noBalls - (last === "NB" ? 1 : 0)),
            balls: nextBowlerBalls,
            overs: Math.floor(nextBowlerBalls / 6),
          },
        }
      : innings.bowlers,
    currentOver: currentOver.slice(0, -1),
    partnership: {
      runs: Math.max(0, innings.partnership.runs - runs),
      balls: Math.max(0, innings.partnership.balls - (legal ? 1 : 0)),
    },
    strikerKey: originalStrikerKey,
    nonStrikerKey: originalNonStrikerKey,
  };
}

export function endCurrentOver(innings: Innings): Innings {
  const currentOver = innings.currentOver ?? [];
  if (currentOver.length === 0) return innings;

  const summary: OverSummary = {
    over: (innings.overHistory?.length ?? 0) + 1,
    balls: currentOver,
    runs: currentOver.reduce(
      (total, ball) => total + getRunsFromEvent(ball),
      0,
    ),
    wickets: currentOver.filter((ball) => ball === "W").length,
  };

  return {
    ...innings,
    overHistory: [...(innings.overHistory ?? []), summary],
    currentOver: [],
    strikerKey: innings.nonStrikerKey || "nonStriker",
    nonStrikerKey: innings.strikerKey || "striker",
  };
}
