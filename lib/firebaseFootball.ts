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
import type { FootballMatch, FootballTournament, FootballEvent } from "@/types/football";

export function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values to .env.local.",
    );
  }
  return db;
}

export function subscribeToFootballMatch(
  matchId: string,
  callback: (match: FootballMatch | null) => void,
) {
  return onValue(ref(requireDb(), `football/matches/${matchId}`), (snapshot) =>
    callback(snapshot.val()),
  );
}

export function saveFootballMatch(matchId: string, match: FootballMatch) {
  return set(ref(requireDb(), `football/matches/${matchId}`), match);
}

export function updateFootballScore(
  matchId: string,
  team: "team1" | "team2",
  delta: number,
) {
  return runTransaction(
    ref(requireDb(), `football/matches/${matchId}`),
    (match: FootballMatch | null) => {
      if (!match) return match;
      match.score[team] = Math.max(0, match.score[team] + delta);
      return match;
    },
  );
}

export function addFootballGoal(
  matchId: string,
  team: "team1" | "team2",
  eventData: Omit<FootballEvent, "id" | "timestamp" | "type">
) {
  return runTransaction(
    ref(requireDb(), `football/matches/${matchId}`),
    (match: FootballMatch | null) => {
      if (!match) return match;
      match.score[team] = (match.score[team] || 0) + 1;
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newEvent: FootballEvent = {
        ...eventData,
        id: eventId,
        type: "goal",
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

export function setFootballTimerState(
  matchId: string,
  isRunning: boolean,
  currentSeconds: number,
) {
  return runTransaction(
    ref(requireDb(), `football/matches/${matchId}`),
    (match: FootballMatch | null) => {
      if (!match) return match;
      match.timer.isRunning = isRunning;
      match.timer.seconds = currentSeconds;
      match.timer.lastUpdated = Date.now();
      return match;
    },
  );
}

export function completeFootballMatch(matchId: string, result: string) {
  return runTransaction(
    ref(requireDb(), `football/matches/${matchId}`),
    (match: FootballMatch | null) => {
      if (!match) return match;
      match.meta.status = "completed";
      match.result = result;
      return match;
    },
  );
}

export function reopenFootballMatch(matchId: string) {
  return runTransaction(
    ref(requireDb(), `football/matches/${matchId}`),
    (match: FootballMatch | null) => {
      if (!match) return match;
      match.meta.status = "live";
      match.result = null;
      return match;
    },
  );
}

export function saveFootballTournament(tournamentId: string, data: any) {
  return set(ref(requireDb(), `football/tournaments/${tournamentId}`), data);
}

export function subscribeToFootballTournament(
  tournamentId: string,
  callback: (tournament: FootballTournament | null) => void,
) {
  return onValue(
    ref(requireDb(), `football/tournaments/${tournamentId}`),
    (snap) => {
      if (snap.exists()) {
        callback(snap.val());
      } else {
        callback(null);
      }
    },
  );
}

export function deleteFootballMatch(matchId: string) {
  return remove(ref(requireDb(), `football/matches/${matchId}`));
}

export function updateFootballMatchMeta(
  matchId: string,
  metaData: Partial<FootballMatch["meta"]>,
) {
  return update(ref(requireDb(), `football/matches/${matchId}/meta`), metaData);
}
