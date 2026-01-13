import { useState, useMemo } from "react";
import { Trophy, Medal, Target, Crown } from "lucide-react";
import { useStore, useCurrentOlympiad, usePlayersMap } from "@/store/useStore";
import {
  computeOlympiadLeaderboard,
  computeLeaderboardForEvent,
  computeGlobalLeaderboardForEvent,
} from "@/store/scoring";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { cn } from "@/lib/utils";
import type { ID } from "@/lib/types";

export default function LeaderboardPage() {
  const currentOlympiad = useCurrentOlympiad();
  const olympiads = useStore((s) => s.olympiads);
  const activities = useStore((s) => s.activities);
  const players = useStore((s) => s.players);

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [globalEventId, setGlobalEventId] = useState<string>("");

  const getPlayerName = (id: ID) => players.find((p) => p.id === id)?.name ?? "Inconnu";

  // Olympiad leaderboard
  const olympiadLeaderboard = useMemo(() => {
    if (!currentOlympiad) return [];
    return computeOlympiadLeaderboard(currentOlympiad);
  }, [currentOlympiad]);

  // Event leaderboard for current olympiad
  const eventLeaderboard = useMemo(() => {
    if (!currentOlympiad || !selectedEventId) return [];
    return computeLeaderboardForEvent(currentOlympiad, selectedEventId);
  }, [currentOlympiad, selectedEventId]);

  // Global event leaderboard across all olympiads
  const globalLeaderboard = useMemo(() => {
    if (!globalEventId) return [];
    return computeGlobalLeaderboardForEvent(olympiads, globalEventId);
  }, [olympiads, globalEventId]);

  // Available templates in current olympiad
  const currentEventTemplates = useMemo(() => {
    if (!currentOlympiad) return [];
    const templateIds = new Set(currentOlympiad.eventInstances.map((e) => e.templateId));
    return activities.filter((a) => templateIds.has(a.id));
  }, [currentOlympiad, activities]);

  // All templates across all olympiads
  const allEventTemplates = useMemo(() => {
    const templateIds = new Set(
      olympiads.flatMap((o) => o.eventInstances.map((e) => e.templateId))
    );
    return activities.filter((a) => templateIds.has(a.id));
  }, [olympiads, activities]);

  return (
    <PageContainer title="🏅 Classements" subtitle="Qui sera le champion ?">
      {/* Global Olympiad Leaderboard */}
      {currentOlympiad && (
        <AppCard variant="highlight">
          <AppCardHeader>
            <AppCardTitle>
              <Crown className="inline-block w-5 h-5 mr-2 text-accent" />
              {currentOlympiad.title}
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            <LeaderboardList
              entries={olympiadLeaderboard}
              getPlayerName={getPlayerName}
            />
          </AppCardContent>
        </AppCard>
      )}

      {/* Per-Event Leaderboard (current olympiad) */}
      {currentOlympiad && currentEventTemplates.length > 0 && (
        <AppCard>
          <AppCardHeader>
            <AppCardTitle>
              <Target className="inline-block w-5 h-5 mr-2 text-secondary" />
              Par épreuve
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground mb-4"
            >
              <option value="">Choisir une épreuve...</option>
              {currentEventTemplates.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>

            {selectedEventId && eventLeaderboard.length > 0 && (
              <LeaderboardList
                entries={eventLeaderboard}
                getPlayerName={getPlayerName}
              />
            )}
          </AppCardContent>
        </AppCard>
      )}

      {/* Global Per-Event Leaderboard */}
      {allEventTemplates.length > 0 && (
        <AppCard>
          <AppCardHeader>
            <AppCardTitle>
              <Medal className="inline-block w-5 h-5 mr-2 text-gold" />
              Classement global par épreuve
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            <select
              value={globalEventId}
              onChange={(e) => setGlobalEventId(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground mb-4"
            >
              <option value="">Choisir une épreuve...</option>
              {allEventTemplates.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>

            {globalEventId && globalLeaderboard.length > 0 && (
              <LeaderboardList
                entries={globalLeaderboard}
                getPlayerName={getPlayerName}
              />
            )}
          </AppCardContent>
        </AppCard>
      )}

      {!currentOlympiad && olympiads.length === 0 && (
        <AppCard variant="muted">
          <AppCardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Crée ta première olympiade pour voir les classements !
            </p>
          </AppCardContent>
        </AppCard>
      )}
    </PageContainer>
  );
}

// ============================================
// LEADERBOARD LIST COMPONENT
// ============================================
function LeaderboardList({
  entries,
  getPlayerName,
}: {
  entries: { playerId: ID; points: number }[];
  getPlayerName: (id: ID) => string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        Aucun résultat pour le moment
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;

        return (
          <div
            key={entry.playerId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all",
              rank === 1 && "bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/30",
              rank === 2 && "bg-gradient-to-r from-silver/20 to-silver/5 border border-silver/30",
              rank === 3 && "bg-gradient-to-r from-bronze/20 to-bronze/5 border border-bronze/30",
              rank > 3 && "bg-muted/30"
            )}
          >
            {/* Rank badge */}
            <div
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm shrink-0",
                rank === 1 && "gradient-gold text-black",
                rank === 2 && "gradient-silver text-black",
                rank === 3 && "gradient-bronze text-white",
                rank > 3 && "bg-muted text-muted-foreground"
              )}
            >
              {rank === 1 && "🥇"}
              {rank === 2 && "🥈"}
              {rank === 3 && "🥉"}
              {rank > 3 && rank}
            </div>

            {/* Name */}
            <span
              className={cn(
                "flex-1 font-medium",
                isTop3 && "font-bold"
              )}
            >
              {getPlayerName(entry.playerId)}
            </span>

            {/* Points */}
            <div
              className={cn(
                "px-3 py-1 rounded-full text-sm font-bold",
                rank === 1 && "bg-gold/30 text-gold",
                rank === 2 && "bg-silver/30 text-silver",
                rank === 3 && "bg-bronze/30 text-bronze",
                rank > 3 && "bg-muted text-muted-foreground"
              )}
            >
              {entry.points} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}
