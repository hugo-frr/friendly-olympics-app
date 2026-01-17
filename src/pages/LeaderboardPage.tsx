import { useState, useMemo, useEffect } from "react";
import { Trophy, Medal, Target, Crown, Loader2, Calendar } from "lucide-react";
import { useDataContext } from "@/contexts/DataContext";
import { computeOlympiadLeaderboard, computeLeaderboardForEvent, summarizeResult } from "@/store/scoring";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { cn } from "@/lib/utils";
import type { ID, EventInstance } from "@/lib/types";

export default function LeaderboardPage() {
  const { currentOlympiad, olympiads, players, loading } = useDataContext();

  const [selectedOlympiadId, setSelectedOlympiadId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  useEffect(() => {
    if (selectedOlympiadId) return;
    if (currentOlympiad?.id) {
      setSelectedOlympiadId(currentOlympiad.id);
      return;
    }
    if (olympiads.length > 0) {
      setSelectedOlympiadId(olympiads[0].id);
    }
  }, [selectedOlympiadId, currentOlympiad?.id, olympiads]);

  useEffect(() => {
    if (selectedOlympiadId && !olympiads.some((olymp) => olymp.id === selectedOlympiadId)) {
      setSelectedOlympiadId(olympiads[0]?.id ?? "");
    }
  }, [selectedOlympiadId, olympiads]);

  useEffect(() => {
    setSelectedEventId("");
  }, [selectedOlympiadId]);

  const selectedOlympiad = olympiads.find((olymp) => olymp.id === selectedOlympiadId);

  const getPlayerName = (id: ID) => players.find((p) => p.id === id)?.name ?? "Inconnu";

  const selectedEventTemplates = useMemo(() => {
    if (!selectedOlympiad) return [];
    const seen = new Set<string>();
    return selectedOlympiad.eventInstances.reduce((acc, event) => {
      if (seen.has(event.templateId)) return acc;
      seen.add(event.templateId);
      acc.push({ id: event.templateId, name: event.name });
      return acc;
    }, [] as { id: string; name: string }[]);
  }, [selectedOlympiad]);

  const olympiadLeaderboard = useMemo(() => {
    if (!selectedOlympiad) return [];
    return computeOlympiadLeaderboard(selectedOlympiad);
  }, [selectedOlympiad]);

  const eventLeaderboard = useMemo(() => {
    if (!selectedOlympiad || !selectedEventId) return [];
    return computeLeaderboardForEvent(selectedOlympiad, selectedEventId);
  }, [selectedOlympiad, selectedEventId]);

  const bestByEvent = useMemo(() => {
    if (!selectedOlympiad) return [];
    return selectedEventTemplates.map((activity) => {
      const leaderboard = computeLeaderboardForEvent(selectedOlympiad, activity.id);
      const topEntry = leaderboard[0] ?? null;
      const matchCount = selectedOlympiad.eventInstances
        .filter((event) => event.templateId === activity.id)
        .reduce((total, event) => total + (event.matches?.length ?? 0), 0);
      return {
        activity,
        topEntry,
        matchCount,
      };
    });
  }, [selectedOlympiad, selectedEventTemplates]);

  const selectedEventInstances: EventInstance[] = useMemo(() => {
    if (!selectedOlympiad || !selectedEventId) return [];
    return selectedOlympiad.eventInstances.filter((event) => event.templateId === selectedEventId);
  }, [selectedOlympiad, selectedEventId]);

  const recentMatches = useMemo(() => {
    if (selectedEventInstances.length === 0) return [];
    const matches = selectedEventInstances.flatMap((event) =>
      (event.matches ?? []).map((match) => ({
        ...match,
        eventName: event.name,
      }))
    );
    return matches.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [selectedEventInstances]);

  if (loading) {
    return (
      <PageContainer title="🏅 Résultats">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!selectedOlympiad) {
    return (
      <PageContainer title="🏅 Résultats" subtitle="Classements et performances">
        <AppCard variant="muted">
          <AppCardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Aucune olympiade pour le moment. Crée ou rejoins-en une pour voir les stats.
            </p>
          </AppCardContent>
        </AppCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="🏅 Résultats" subtitle="Compare les performances de tes olympiades">
      <AppCard variant="highlight">
        <AppCardHeader>
          <AppCardTitle>
            <Calendar className="inline-block w-5 h-5 mr-2 text-primary" />
            Sélection
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Olympiade</label>
              <select
                value={selectedOlympiadId}
                onChange={(e) => setSelectedOlympiadId(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground"
              >
                {olympiads.map((olymp) => (
                  <option key={olymp.id} value={olymp.id}>
                    {olymp.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {selectedOlympiad.playerIds.length} participants • {selectedOlympiad.eventInstances.length} épreuves
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Épreuve</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground"
              >
                <option value="">Toutes les épreuves</option>
                {selectedEventTemplates.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Choisis une épreuve pour voir le détail des scores.
              </p>
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard variant="highlight">
        <AppCardHeader>
          <AppCardTitle>
            <Crown className="inline-block w-5 h-5 mr-2 text-accent" />
            Classement général • {selectedOlympiad.title}
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          <LeaderboardList entries={olympiadLeaderboard} getPlayerName={getPlayerName} />
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            <Medal className="inline-block w-5 h-5 mr-2 text-gold" />
            Meilleurs par épreuve
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {bestByEvent.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucune épreuve pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
      {bestByEvent.map(({ activity, topEntry, matchCount }) => (
        <div
          key={activity.id}
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30"
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{activity.name}</p>
            <p className="text-xs text-muted-foreground">{matchCount} manches</p>
          </div>
          {topEntry ? (
            <div className="text-right">
              <p className="text-sm font-semibold truncate">
                {getPlayerName(topEntry.playerId)}
              </p>
              <p className="text-xs text-muted-foreground">{topEntry.points} pts</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun résultat</span>
          )}
        </div>
      ))}
            </div>
          )}
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            <Target className="inline-block w-5 h-5 mr-2 text-secondary" />
            Détail des épreuves
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {!selectedEventId && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Sélectionne une épreuve pour afficher les résultats détaillés.
            </p>
          )}
          {selectedEventId && (
            <div className="space-y-4">
              <LeaderboardList entries={eventLeaderboard} getPlayerName={getPlayerName} />
              {recentMatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Dernières manches</p>
                  {recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{match.eventName}</p>
                      <p className="text-xs text-muted-foreground">
                        {summarizeResult(match.result, getPlayerName)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </AppCardContent>
      </AppCard>
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

            <span className={cn("flex-1 font-medium", isTop3 && "font-bold")}>
              {getPlayerName(entry.playerId)}
            </span>

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
