import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Shuffle, Trash2, Check, History } from "lucide-react";
import { useStore, useCurrentOlympiad, usePlayersMap } from "@/store/useStore";
import { summarizeResult } from "@/store/scoring";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppButton } from "@/components/ui/app-button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { EventResult, EventInstance, ID } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export default function EnterScoresPage() {
  const currentOlympiad = useCurrentOlympiad();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  if (!currentOlympiad) {
    return (
      <PageContainer title="✏️ Saisir les scores">
        <AppCard variant="muted">
          <AppCardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Sélectionne une olympiade dans l'onglet "Olympiades"
            </p>
          </AppCardContent>
        </AppCard>
      </PageContainer>
    );
  }

  const selectedEvent = currentOlympiad.eventInstances.find((e) => e.id === selectedEventId);

  return (
    <PageContainer
      title="✏️ Saisir les scores"
      subtitle={currentOlympiad.title}
    >
      {/* Event selector */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {currentOlympiad.eventInstances.map((event) => (
            <Chip
              key={event.id}
              active={event.id === selectedEventId}
              onClick={() => setSelectedEventId(event.id)}
            >
              {event.name}
              {event.matches.length > 0 && (
                <span className="ml-1 text-xs opacity-70">({event.matches.length})</span>
              )}
            </Chip>
          ))}
        </div>
      </div>

      {currentOlympiad.eventInstances.length === 0 && (
        <AppCard variant="muted">
          <AppCardContent className="py-6 text-center">
            <p className="text-muted-foreground">
              Ajoute des épreuves dans l'onglet "Olympiades"
            </p>
          </AppCardContent>
        </AppCard>
      )}

      {selectedEvent && (
        <>
          <EventDetails event={selectedEvent} />
          <ScoreEntry olympiadId={currentOlympiad.id} event={selectedEvent} />
          <MatchHistory olympiadId={currentOlympiad.id} event={selectedEvent} />
        </>
      )}
    </PageContainer>
  );
}

// ============================================
// EVENT DETAILS
// ============================================
function EventDetails({ event }: { event: EventInstance }) {
  const getRuleLabel = () => {
    switch (event.rule.kind) {
      case "placement_table":
        return `Barème: ${event.rule.table.join(", ")}`;
      case "per_win":
        return `${event.rule.pointsPerPlayer} pts/victoire`;
      case "numeric_rank":
        return `Score ${event.rule.higherIsBetter ? "élevé" : "bas"} = meilleur`;
    }
  };

  return (
    <AppCard variant="highlight">
      <AppCardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-secondary/30 rounded-lg font-medium">
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          <span className="text-muted-foreground">{getRuleLabel()}</span>
          {event.teamSize && (
            <span className="text-muted-foreground">
              Équipes {event.teamSize}v{event.teamSize}
            </span>
          )}
          <span className="text-muted-foreground ml-auto">
            {event.matches.length} manche{event.matches.length !== 1 ? "s" : ""}
          </span>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// SCORE ENTRY
// ============================================
function ScoreEntry({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  switch (event.type) {
    case "classement":
      return <ClassementEntry olympiadId={olympiadId} event={event} />;
    case "duel_1v1":
      return <DuelEntry olympiadId={olympiadId} event={event} />;
    case "equipe":
      return <EquipeEntry olympiadId={olympiadId} event={event} />;
    case "score_num":
      return <ScoreNumEntry olympiadId={olympiadId} event={event} />;
  }
}

// ============================================
// CLASSEMENT ENTRY
// ============================================
function ClassementEntry({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  const currentOlympiad = useCurrentOlympiad();
  const players = useStore((s) => s.players);
  const addMatch = useStore((s) => s.addMatch);

  const olympiadPlayers = useMemo(() => {
    if (!currentOlympiad) return [];
    return currentOlympiad.playerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as typeof players;
  }, [currentOlympiad, players]);

  const [order, setOrder] = useState<string[]>(() => olympiadPlayers.map((p) => p.id));

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
  };

  const handleSubmit = () => {
    const result: EventResult = { kind: "classement", order };
    addMatch(olympiadId, event.id, result);
    // Shuffle for next round
    setOrder([...order].sort(() => Math.random() - 0.5));
  };

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>🏁 Classement de la manche</AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-2 mb-4">
          {order.map((playerId, index) => (
            <div
              key={playerId}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
            >
              <span
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm",
                  index === 0 && "gradient-gold text-black",
                  index === 1 && "gradient-silver text-black",
                  index === 2 && "gradient-bronze text-white",
                  index > 2 && "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span className="flex-1 font-medium">{getPlayerName(playerId)}</span>
              <div className="flex gap-1">
                <AppButton
                  variant="ghost"
                  size="icon"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="icon"
                  onClick={() => moveDown(index)}
                  disabled={index === order.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </AppButton>
              </div>
            </div>
          ))}
        </div>
        <AppButton onClick={handleSubmit} className="w-full">
          <Check className="w-4 h-4 mr-2" />
          Enregistrer la manche
        </AppButton>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// DUEL ENTRY
// ============================================
function DuelEntry({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  const currentOlympiad = useCurrentOlympiad();
  const players = useStore((s) => s.players);
  const addMatch = useStore((s) => s.addMatch);

  const olympiadPlayers = useMemo(() => {
    if (!currentOlympiad) return [];
    return currentOlympiad.playerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as typeof players;
  }, [currentOlympiad, players]);

  const [playerA, setPlayerA] = useState(olympiadPlayers[0]?.id ?? "");
  const [playerB, setPlayerB] = useState(olympiadPlayers[1]?.id ?? "");

  const randomize = () => {
    const shuffled = [...olympiadPlayers].sort(() => Math.random() - 0.5);
    setPlayerA(shuffled[0]?.id ?? "");
    setPlayerB(shuffled[1]?.id ?? "");
  };

  const handleWin = (winner: string, loser: string) => {
    if (!winner || !loser || winner === loser) return;
    const result: EventResult = { kind: "duel_1v1", winner, loser };
    addMatch(olympiadId, event.id, result);
    randomize();
  };

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>⚔️ Duel 1v1</AppCardTitle>
        <AppButton variant="ghost" size="sm" onClick={randomize}>
          <Shuffle className="w-4 h-4 mr-1" />
          Aléatoire
        </AppButton>
      </AppCardHeader>
      <AppCardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Joueur A</label>
            <select
              value={playerA}
              onChange={(e) => setPlayerA(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground"
            >
              {olympiadPlayers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Joueur B</label>
            <select
              value={playerB}
              onChange={(e) => setPlayerB(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-input border border-border text-foreground"
            >
              {olympiadPlayers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center mb-4 py-3">
          <span className="text-xl font-bold">{getPlayerName(playerA)}</span>
          <span className="mx-3 text-muted-foreground">VS</span>
          <span className="text-xl font-bold">{getPlayerName(playerB)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AppButton
            variant="success"
            onClick={() => handleWin(playerA, playerB)}
            disabled={!playerA || !playerB || playerA === playerB}
          >
            🏆 {getPlayerName(playerA)}
          </AppButton>
          <AppButton
            variant="success"
            onClick={() => handleWin(playerB, playerA)}
            disabled={!playerA || !playerB || playerA === playerB}
          >
            🏆 {getPlayerName(playerB)}
          </AppButton>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// EQUIPE ENTRY
// ============================================
function EquipeEntry({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  const currentOlympiad = useCurrentOlympiad();
  const players = useStore((s) => s.players);
  const addMatch = useStore((s) => s.addMatch);

  const teamSize = event.teamSize ?? 2;

  const olympiadPlayers = useMemo(() => {
    if (!currentOlympiad) return [];
    return currentOlympiad.playerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as typeof players;
  }, [currentOlympiad, players]);

  const [teamA, setTeamA] = useState<Set<string>>(new Set());
  const [teamB, setTeamB] = useState<Set<string>>(new Set());

  const toggleTeamA = (id: string) => {
    const newSet = new Set(teamA);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < teamSize && !teamB.has(id)) {
      newSet.add(id);
    }
    setTeamA(newSet);
  };

  const toggleTeamB = (id: string) => {
    const newSet = new Set(teamB);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < teamSize && !teamA.has(id)) {
      newSet.add(id);
    }
    setTeamB(newSet);
  };

  const randomize = () => {
    const shuffled = [...olympiadPlayers].sort(() => Math.random() - 0.5);
    setTeamA(new Set(shuffled.slice(0, teamSize).map((p) => p.id)));
    setTeamB(new Set(shuffled.slice(teamSize, teamSize * 2).map((p) => p.id)));
  };

  const handleWin = (winnerTeam: Set<string>, loserTeam: Set<string>) => {
    if (winnerTeam.size !== teamSize || loserTeam.size !== teamSize) return;
    const result: EventResult = {
      kind: "equipe",
      winnerTeam: { players: Array.from(winnerTeam) },
      loserTeam: { players: Array.from(loserTeam) },
    };
    addMatch(olympiadId, event.id, result);
    setTeamA(new Set());
    setTeamB(new Set());
  };

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const teamANames = Array.from(teamA).map(getPlayerName).join(" & ") || "...";
  const teamBNames = Array.from(teamB).map(getPlayerName).join(" & ") || "...";

  const isValid = teamA.size === teamSize && teamB.size === teamSize;

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>👥 Équipe {teamSize}v{teamSize}</AppCardTitle>
        <AppButton variant="ghost" size="sm" onClick={randomize}>
          <Shuffle className="w-4 h-4 mr-1" />
          Aléatoire
        </AppButton>
      </AppCardHeader>
      <AppCardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Équipe A ({teamA.size}/{teamSize})
            </label>
            <div className="flex flex-wrap gap-1">
              {olympiadPlayers.map((p) => (
                <Chip
                  key={p.id}
                  active={teamA.has(p.id)}
                  onClick={() => toggleTeamA(p.id)}
                  disabled={teamB.has(p.id)}
                  className="text-xs"
                >
                  {p.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Équipe B ({teamB.size}/{teamSize})
            </label>
            <div className="flex flex-wrap gap-1">
              {olympiadPlayers.map((p) => (
                <Chip
                  key={p.id}
                  active={teamB.has(p.id)}
                  onClick={() => toggleTeamB(p.id)}
                  disabled={teamA.has(p.id)}
                  className="text-xs"
                >
                  {p.name}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mb-4 py-3">
          <span className="font-bold">{teamANames}</span>
          <span className="mx-3 text-muted-foreground">VS</span>
          <span className="font-bold">{teamBNames}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AppButton
            variant="success"
            onClick={() => handleWin(teamA, teamB)}
            disabled={!isValid}
          >
            🏆 Équipe A
          </AppButton>
          <AppButton
            variant="success"
            onClick={() => handleWin(teamB, teamA)}
            disabled={!isValid}
          >
            🏆 Équipe B
          </AppButton>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// SCORE NUM ENTRY
// ============================================
function ScoreNumEntry({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  const currentOlympiad = useCurrentOlympiad();
  const players = useStore((s) => s.players);
  const addMatch = useStore((s) => s.addMatch);

  const olympiadPlayers = useMemo(() => {
    if (!currentOlympiad) return [];
    return currentOlympiad.playerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as typeof players;
  }, [currentOlympiad, players]);

  const [scores, setScores] = useState<Record<string, string>>({});

  const updateScore = (playerId: string, value: string) => {
    setScores((prev) => ({ ...prev, [playerId]: value }));
  };

  const handleSubmit = () => {
    const entries = olympiadPlayers
      .map((p) => ({
        playerId: p.id,
        value: parseFloat(scores[p.id] || "0") || 0,
      }))
      .filter((e) => e.value !== 0 || scores[e.playerId]);

    if (entries.length === 0) return;

    const result: EventResult = { kind: "score_num", entries };
    addMatch(olympiadId, event.id, result);
    setScores({});
  };

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>🔢 Score numérique</AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-3 mb-4">
          {olympiadPlayers.map((player) => (
            <div key={player.id} className="flex items-center gap-3">
              <span className="flex-1 font-medium">{player.name}</span>
              <AppInput
                type="number"
                placeholder="Score"
                value={scores[player.id] ?? ""}
                onChange={(e) => updateScore(player.id, e.target.value)}
                className="w-24 text-center"
              />
            </div>
          ))}
        </div>
        <AppButton onClick={handleSubmit} className="w-full">
          <Check className="w-4 h-4 mr-2" />
          Enregistrer la manche
        </AppButton>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// MATCH HISTORY
// ============================================
function MatchHistory({ olympiadId, event }: { olympiadId: ID; event: EventInstance }) {
  const players = useStore((s) => s.players);
  const removeMatch = useStore((s) => s.removeMatch);

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  const handleRemove = (matchId: string) => {
    if (confirm("Supprimer cette manche ?")) {
      removeMatch(olympiadId, event.id, matchId);
    }
  };

  if (event.matches.length === 0) {
    return null;
  }

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>
          <History className="inline-block w-5 h-5 mr-2" />
          Historique
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-2">
          {event.matches.map((match, index) => (
            <div
              key={match.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Manche {index + 1}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {summarizeResult(match.result, getPlayerName)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(match.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => handleRemove(match.id)}
                className="p-2 hover:bg-destructive/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </AppCardContent>
    </AppCard>
  );
}
