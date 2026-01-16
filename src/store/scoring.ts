import type { IOlympiad, EventInstance, EventResult, ScoringRule, ID } from "@/lib/types";

type PointsMap = Record<ID, number>;

function ensurePlayer(points: PointsMap, id: ID): void {
  if (!(id in points)) {
    points[id] = 0;
  }
}

function applyRule(points: PointsMap, rule: ScoringRule, result: EventResult): void {
  switch (result.kind) {
    case "classement":
      if (rule.kind === "placement_table") {
        result.order.forEach((playerId, index) => {
          ensurePlayer(points, playerId);
          points[playerId] += rule.table[index] ?? 0;
        });
      }
      break;

    case "duel_1v1":
      if (rule.kind === "per_win") {
        ensurePlayer(points, result.winner);
        ensurePlayer(points, result.loser);
        points[result.winner] += rule.pointsPerPlayer;
      }
      break;

    case "equipe":
      if (rule.kind === "per_win") {
        result.winnerTeam.players.forEach((playerId) => {
          ensurePlayer(points, playerId);
          points[playerId] += rule.pointsPerPlayer;
        });
        result.loserTeam.players.forEach((playerId) => {
          ensurePlayer(points, playerId);
        });
      }
      break;

    default:
      break;
  }
}

function getResultsOf(ei: EventInstance): EventResult[] {
  return Array.isArray(ei.matches) ? ei.matches.map((m) => m.result) : [];
}

function pointsToLeaderboard(points: PointsMap): { playerId: ID; points: number }[] {
  return Object.entries(points)
    .map(([playerId, pts]) => ({ playerId, points: pts }))
    .sort((a, b) => b.points - a.points);
}

/**
 * Compute the overall leaderboard for a single olympiad
 * (aggregates all event instances)
 */
export function computeOlympiadLeaderboard(
  olymp: IOlympiad
): { playerId: ID; points: number }[] {
  const points: PointsMap = {};

  // Initialize all players with 0 points
  olymp.playerIds.forEach((id) => {
    points[id] = 0;
  });

  // Apply all matches from all events
  for (const eventInstance of olymp.eventInstances) {
    const results = getResultsOf(eventInstance);
    for (const result of results) {
      applyRule(points, eventInstance.rule, result);
    }
  }

  return pointsToLeaderboard(points);
}

/**
 * Compute leaderboard for a specific activity (by templateId) within one olympiad
 */
export function computeLeaderboardForEvent(
  olymp: IOlympiad,
  templateId: ID
): { playerId: ID; points: number }[] {
  const points: PointsMap = {};

  // Initialize all players
  olymp.playerIds.forEach((id) => {
    points[id] = 0;
  });

  // Find event instances matching the template
  const instances = olymp.eventInstances.filter((e) => e.templateId === templateId);

  for (const eventInstance of instances) {
    const results = getResultsOf(eventInstance);
    for (const result of results) {
      applyRule(points, eventInstance.rule, result);
    }
  }

  return pointsToLeaderboard(points);
}

/**
 * Compute global leaderboard for a specific activity across ALL olympiads
 */
export function computeGlobalLeaderboardForEvent(
  olympiads: IOlympiad[],
  templateId: ID
): { playerId: ID; points: number }[] {
  const points: PointsMap = {};

  for (const olymp of olympiads) {
    const instances = olymp.eventInstances.filter((e) => e.templateId === templateId);

    for (const eventInstance of instances) {
      const results = getResultsOf(eventInstance);
      for (const result of results) {
        applyRule(points, eventInstance.rule, result);
      }
    }
  }

  return pointsToLeaderboard(points);
}

/**
 * Summarize a result for display
 */
export function summarizeResult(
  result: EventResult,
  getPlayerName: (id: ID) => string
): string {
  switch (result.kind) {
    case "classement":
      const top3 = result.order.slice(0, 3).map(getPlayerName);
      return `🥇 ${top3[0] ?? "?"} 🥈 ${top3[1] ?? "?"} 🥉 ${top3[2] ?? "?"}`;

    case "duel_1v1":
      return `${getPlayerName(result.winner)} bat ${getPlayerName(result.loser)}`;

    case "equipe":
      const winners = result.winnerTeam.players.map(getPlayerName).join(" & ");
      const losers = result.loserTeam.players.map(getPlayerName).join(" & ");
      return `${winners} battent ${losers}`;

    default:
      return "";
  }
}
