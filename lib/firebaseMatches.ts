"use client";

import { onValue, ref, runTransaction, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { applyBall, buildEmptyInnings, endCurrentOver, undoLastBall } from "@/lib/matchUtils";
import type { BallEvent, Match } from "@/types/match";

export function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }
  return db;
}

export function subscribeToMatch(matchId: string, callback: (match: Match | null) => void) {
  const database = requireDb();
  return onValue(ref(database, `matches/${matchId}`), (snapshot) => callback(snapshot.val()));
}

export function saveMatch(matchId: string, match: Match) {
  return set(ref(requireDb(), `matches/${matchId}`), match);
}

export function recordBall(matchId: string, event: BallEvent) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    const inningsNum = String(match.currentInnings);
    const innings = match.innings[inningsNum];
    if (innings) {
      match.innings[inningsNum] = applyBall(innings, event);
    }
    return match;
  });
}

export function undoBall(matchId: string) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    const inningsNum = String(match.currentInnings);
    const innings = match.innings[inningsNum];
    if (innings) {
      match.innings[inningsNum] = undoLastBall(innings);
    }
    return match;
  });
}

export function endOver(matchId: string) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    const inningsNum = String(match.currentInnings);
    const innings = match.innings[inningsNum];
    if (innings) {
      match.innings[inningsNum] = endCurrentOver(innings);
    }
    return match;
  });
}

export function updatePlayerNames(matchId: string, updates: { strikerName?: string, nonStrikerName?: string, bowlerName?: string, nextBatsmanName?: string }) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    const inningsNum = String(match.currentInnings);
    const innings = match.innings[inningsNum];
    if (!innings) return match;

    const strikerKey = innings.strikerKey || "striker";
    const nonStrikerKey = innings.nonStrikerKey || "nonStriker";
    const bowlerKey = innings.bowlerKey || "bowler";

    if (updates.strikerName && innings.batsmen[strikerKey]) {
      innings.batsmen[strikerKey].name = updates.strikerName;
    }
    if (updates.nonStrikerName && innings.batsmen[nonStrikerKey]) {
      innings.batsmen[nonStrikerKey].name = updates.nonStrikerName;
    }
    if (updates.bowlerName) {
      const bKey = updates.bowlerName;
      innings.bowlerKey = bKey;
      if (!innings.bowlers[bKey]) {
        innings.bowlers[bKey] = { name: bKey, overs: 0, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };
      }
    }
    
    if (updates.nextBatsmanName) {
      if (innings.batsmen[strikerKey]?.status === "out") {
         const newKey = `batter_${Date.now()}`;
         innings.batsmen[newKey] = { name: updates.nextBatsmanName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "batting" };
         innings.strikerKey = newKey;
         innings.partnership = { runs: 0, balls: 0 };
      } else if (innings.batsmen[nonStrikerKey]?.status === "out") {
         const newKey = `batter_${Date.now()}`;
         innings.batsmen[newKey] = { name: updates.nextBatsmanName, runs: 0, balls: 0, fours: 0, sixes: 0, status: "batting" };
         innings.nonStrikerKey = newKey;
         innings.partnership = { runs: 0, balls: 0 };
      }
    }

    match.innings[inningsNum] = innings;
    return match;
  });
}

export function startSecondInnings(matchId: string) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    if (match.currentInnings === 1) {
      match.currentInnings = 2;
      const battingTeam = match.innings["1"].battingTeam === "team1" ? "team2" : "team1";
      match.innings["2"] = buildEmptyInnings(battingTeam);
    }
    return match;
  });
}

export function completeMatch(matchId: string, result: string) {
  return runTransaction(ref(requireDb(), `matches/${matchId}`), (match: Match | null) => {
    if (!match) return match;
    match.meta.status = "completed";
    match.result = result;
    return match;
  });
}

export function saveTournament(tournamentId: string, data: any) {
  return set(ref(requireDb(), `tournaments/${tournamentId}`), data);
}

export function subscribeToTournament(tournamentId: string, callback: (tournament: any) => void) {
  return onValue(ref(requireDb(), `tournaments/${tournamentId}`), (snap) => {
    if (snap.exists()) {
      callback(snap.val());
    } else {
      callback(null);
    }
  });
}

import { remove, update } from "firebase/database";

export function deleteMatch(matchId: string) {
  return remove(ref(requireDb(), `matches/${matchId}`));
}

export function updateMatch(matchId: string, data: Partial<Match>) {
  return update(ref(requireDb(), `matches/${matchId}`), data);
}

export function updateMatchMeta(matchId: string, metaData: Partial<Match['meta']>) {
  return update(ref(requireDb(), `matches/${matchId}/meta`), metaData);
}
