"use client";

import {
  onValue,
  ref,
  runTransaction,
  set,
  remove,
  update,
} from "firebase/database";
import { db } from "@/lib/firebase";
import type { PickleballMatch, PickleballTournament, PickleballEvent } from "@/types/pickleball";

export function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values to .env.local.",
    );
  }
  return db;
}

export function subscribeToPickleballMatch(
  matchId: string,
  callback: (match: PickleballMatch | null) => void,
) {
  return onValue(ref(requireDb(), `pickleball/matches/${matchId}`), (snapshot) =>
    callback(snapshot.val()),
  );
}

export function savePickleballMatch(matchId: string, match: PickleballMatch) {
  return set(ref(requireDb(), `pickleball/matches/${matchId}`), match);
}

export function updatePickleballScore(
  matchId: string,
  team: "team1" | "team2",
  type: "points" | "sets",
  delta: number,
) {
  return runTransaction(
    ref(requireDb(), `pickleball/matches/${matchId}`),
    (match: PickleballMatch | null) => {
      if (!match) return match;
      match.score[team][type] = Math.max(0, match.score[team][type] + delta);
      return match;
    },
  );
}

export function updatePickleballPlayerScore(
  matchId: string,
  team: "team1" | "team2",
  playerName: string,
  delta: number,
) {
  return runTransaction(
    ref(requireDb(), `pickleball/matches/${matchId}`),
    (match: PickleballMatch | null) => {
      if (!match) return match;
      if (!match.score[team].playerPoints) {
        match.score[team].playerPoints = {};
      }
      match.score[team].playerPoints[playerName] = Math.max(0, (match.score[team].playerPoints[playerName] || 0) + delta);
      match.score[team].points = Math.max(0, match.score[team].points + delta);
      return match;
    },
  );
}

export function addPickleballEvent(
  matchId: string,
  eventData: Omit<PickleballEvent, "id" | "timestamp">
) {
  return runTransaction(
    ref(requireDb(), `pickleball/matches/${matchId}`),
    (match: PickleballMatch | null) => {
      if (!match) return match;
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newEvent: PickleballEvent = {
        ...eventData,
        id: eventId,
        timestamp: Date.now(),
      };
      
      if (!match.events) {
        match.events = {};
      }
      match.events[eventId] = newEvent;
      return match;
    },
  );
}



export function completePickleballMatch(matchId: string, result: string) {
  return runTransaction(
    ref(requireDb(), `pickleball/matches/${matchId}`),
    (match: PickleballMatch | null) => {
      if (!match) return match;
      match.meta.status = "completed";
      match.result = result;
      return match;
    },
  );
}

export function reopenPickleballMatch(matchId: string) {
  return runTransaction(
    ref(requireDb(), `pickleball/matches/${matchId}`),
    (match: PickleballMatch | null) => {
      if (!match) return match;
      match.meta.status = "live";
      match.result = null;
      return match;
    },
  );
}

export function savePickleballTournament(tournamentId: string, data: any) {
  return set(ref(requireDb(), `pickleball/tournaments/${tournamentId}`), data);
}

export function subscribeToPickleballTournament(
  tournamentId: string,
  callback: (tournament: PickleballTournament | null) => void,
) {
  return onValue(
    ref(requireDb(), `pickleball/tournaments/${tournamentId}`),
    (snap) => {
      if (snap.exists()) {
        callback(snap.val());
      } else {
        callback(null);
      }
    },
  );
}

export function deletePickleballMatch(matchId: string) {
  return remove(ref(requireDb(), `pickleball/matches/${matchId}`));
}

export function updatePickleballMatchMeta(
  matchId: string,
  metaData: Partial<PickleballMatch["meta"]>,
) {
  return update(ref(requireDb(), `pickleball/matches/${matchId}/meta`), metaData);
}
