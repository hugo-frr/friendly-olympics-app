import { useState } from "react";
import { Trash2, UserPlus, Users, Plus, Minus, Search, Trophy, Calendar, Check } from "lucide-react";
import { useStore, useCurrentOlympiad } from "@/store/useStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppButton } from "@/components/ui/app-button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { EventType, ScoringRule } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export default function OlympiadsPage() {
  return (
    <PageContainer title="🏆 Olympiades" subtitle="Gère tes joueurs, olympiades et épreuves">
      <PlayersSection />
      <CreateOlympiadSection />
      <OlympiadsListSection />
      <EventsSection />
    </PageContainer>
  );
}

// ============================================
// PLAYERS SECTION
// ============================================
function PlayersSection() {
  const [newPlayerName, setNewPlayerName] = useState("");
  const players = useStore((s) => s.players);
  const addPlayer = useStore((s) => s.addPlayer);
  const removePlayer = useStore((s) => s.removePlayer);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName);
      setNewPlayerName("");
    }
  };

  const handleRemovePlayer = (id: string, name: string) => {
    if (confirm(`Supprimer ${name} ?`)) {
      removePlayer(id);
    }
  };

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>
          <Users className="inline-block w-5 h-5 mr-2 text-primary" />
          Joueurs ({players.length})
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="flex gap-2 mb-4">
          <AppInput
            placeholder="Nom du joueur"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            className="flex-1"
          />
          <AppButton onClick={handleAddPlayer} size="icon">
            <UserPlus className="w-5 h-5" />
          </AppButton>
        </div>

        {players.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Aucun joueur. Ajoute des participants !
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-muted rounded-full pl-3 pr-1 py-1"
              >
                <span className="text-sm font-medium">{player.name}</span>
                <button
                  onClick={() => handleRemovePlayer(player.id, player.name)}
                  className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// CREATE OLYMPIAD SECTION
// ============================================
function CreateOlympiadSection() {
  const [title, setTitle] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const players = useStore((s) => s.players);
  const createOlympiad = useStore((s) => s.createOlympiad);

  const displayedPlayers = showAllPlayers ? players : players.slice(0, 5);

  const togglePlayer = (id: string) => {
    const newSet = new Set(selectedPlayerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPlayerIds(newSet);
  };

  const selectAll = () => {
    setSelectedPlayerIds(new Set(players.map((p) => p.id)));
  };

  const handleCreate = () => {
    if (title.trim() && selectedPlayerIds.size > 0) {
      createOlympiad(title, Array.from(selectedPlayerIds));
      setTitle("");
      setSelectedPlayerIds(new Set());
    }
  };

  return (
    <AppCard variant="highlight">
      <AppCardHeader>
        <AppCardTitle>
          <Plus className="inline-block w-5 h-5 mr-2 text-primary" />
          Nouvelle olympiade
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <AppInput
          placeholder="Titre de l'olympiade"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4"
        />

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Participants ({selectedPlayerIds.size}/{players.length})
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Tout sélectionner
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {displayedPlayers.map((player) => (
            <Chip
              key={player.id}
              active={selectedPlayerIds.has(player.id)}
              onClick={() => togglePlayer(player.id)}
            >
              {selectedPlayerIds.has(player.id) && <Check className="w-3 h-3 mr-1" />}
              {player.name}
            </Chip>
          ))}
        </div>

        {players.length > 5 && (
          <button
            onClick={() => setShowAllPlayers(!showAllPlayers)}
            className="text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            {showAllPlayers ? "Afficher moins" : `Afficher tout (${players.length})`}
          </button>
        )}

        <AppButton
          onClick={handleCreate}
          className="w-full"
          disabled={!title.trim() || selectedPlayerIds.size === 0}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Créer l'olympiade
        </AppButton>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// OLYMPIADS LIST SECTION
// ============================================
function OlympiadsListSection() {
  const olympiads = useStore((s) => s.olympiads);
  const currentOlympiadId = useStore((s) => s.currentOlympiadId);
  const setCurrentOlympiad = useStore((s) => s.setCurrentOlympiad);
  const removeOlympiad = useStore((s) => s.removeOlympiad);
  const players = useStore((s) => s.players);

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  const handleRemove = (id: string, title: string) => {
    if (confirm(`Supprimer l'olympiade "${title}" ?`)) {
      removeOlympiad(id);
    }
  };

  if (olympiads.length === 0) {
    return null;
  }

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>
          <Calendar className="inline-block w-5 h-5 mr-2 text-secondary" />
          Olympiades existantes
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-3">
          {olympiads.map((olymp) => {
            const isCurrent = olymp.id === currentOlympiadId;
            return (
              <div
                key={olymp.id}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{olymp.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(olymp.createdAt).toLocaleDateString("fr-FR")} •{" "}
                      {olymp.playerIds.length} joueurs • {olymp.eventInstances.length} épreuves
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCurrent ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success font-medium">
                        Active
                      </span>
                    ) : (
                      <AppButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentOlympiad(olymp.id)}
                      >
                        Choisir
                      </AppButton>
                    )}
                    <button
                      onClick={() => handleRemove(olymp.id, olymp.title)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// EVENTS SECTION
// ============================================
function EventsSection() {
  const currentOlympiad = useCurrentOlympiad();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddActivity, setShowAddActivity] = useState(false);

  const activities = useStore((s) => s.activities);
  const addEventInstance = useStore((s) => s.addEventInstance);
  const removeEventInstance = useStore((s) => s.removeEventInstance);

  if (!currentOlympiad) {
    return (
      <AppCard variant="muted">
        <AppCardContent className="py-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Sélectionne ou crée une olympiade pour gérer les épreuves
          </p>
        </AppCardContent>
      </AppCard>
    );
  }

  const filteredActivities = activities.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: activities with instances first
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const aHasInstance = currentOlympiad.eventInstances.some((e) => e.templateId === a.id);
    const bHasInstance = currentOlympiad.eventInstances.some((e) => e.templateId === b.id);
    if (aHasInstance && !bHasInstance) return -1;
    if (!aHasInstance && bHasInstance) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleAddInstance = (activity: typeof activities[0]) => {
    const teamSize = activity.defaultType === "equipe" 
      ? parseInt(prompt("Taille des équipes (ex: 2 pour 2v2):", "2") || "2", 10)
      : undefined;

    addEventInstance(currentOlympiad.id, {
      templateId: activity.id,
      name: activity.name,
      type: activity.defaultType,
      rule: activity.defaultRule ?? { kind: "placement_table", table: [5, 3, 2, 1, 0] },
      teamSize,
    });
  };

  const handleRemoveInstance = (activity: typeof activities[0]) => {
    const instances = currentOlympiad.eventInstances.filter((e) => e.templateId === activity.id);
    const lastInstance = instances[instances.length - 1];
    if (lastInstance && confirm(`Retirer "${activity.name}" de cette olympiade ?`)) {
      removeEventInstance(currentOlympiad.id, lastInstance.id);
    }
  };

  return (
    <>
      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            🎯 Épreuves de {currentOlympiad.title}
          </AppCardTitle>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => setShowAddActivity(!showAddActivity)}
          >
            <Plus className="w-4 h-4" />
          </AppButton>
        </AppCardHeader>
        <AppCardContent>
          <AppInput
            placeholder="Rechercher une épreuve..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          <div className="space-y-2">
            {sortedActivities.map((activity) => {
              const instances = currentOlympiad.eventInstances.filter(
                (e) => e.templateId === activity.id
              );
              const hasInstance = instances.length > 0;

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl transition-all",
                    hasInstance
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 border border-transparent"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.name}</span>
                      {hasInstance && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          {instances.length}x
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_TYPE_LABELS[activity.defaultType]}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {hasInstance && (
                      <AppButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveInstance(activity)}
                      >
                        <Minus className="w-4 h-4 text-destructive" />
                      </AppButton>
                    )}
                    <AppButton
                      variant={hasInstance ? "ghost" : "primary"}
                      size="icon"
                      onClick={() => handleAddInstance(activity)}
                    >
                      <Plus className="w-4 h-4" />
                    </AppButton>
                  </div>
                </div>
              );
            })}
          </div>
        </AppCardContent>
      </AppCard>

      {showAddActivity && <AddActivitySection onClose={() => setShowAddActivity(false)} />}
    </>
  );
}

// ============================================
// ADD ACTIVITY SECTION
// ============================================
function AddActivitySection({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<EventType>("classement");
  const [ruleKind, setRuleKind] = useState<"placement_table" | "per_win" | "numeric_rank">("placement_table");
  const [tableInput, setTableInput] = useState("5,3,2,1,0");
  const [pointsPerWin, setPointsPerWin] = useState("3");
  const [higherIsBetter, setHigherIsBetter] = useState(true);

  const addActivity = useStore((s) => s.addActivity);
  const activities = useStore((s) => s.activities);
  const removeActivity = useStore((s) => s.removeActivity);

  const buildRule = (): ScoringRule => {
    switch (ruleKind) {
      case "placement_table":
        return {
          kind: "placement_table",
          table: tableInput.split(",").map((n) => parseInt(n.trim(), 10) || 0),
        };
      case "per_win":
        return {
          kind: "per_win",
          pointsPerPlayer: parseInt(pointsPerWin, 10) || 3,
        };
      case "numeric_rank":
        return {
          kind: "numeric_rank",
          higherIsBetter,
          table: tableInput.split(",").map((n) => parseInt(n.trim(), 10) || 0),
        };
    }
  };

  const handleAdd = () => {
    if (name.trim()) {
      addActivity(name, selectedType, buildRule());
      setName("");
    }
  };

  const handleRemove = (id: string, actName: string) => {
    if (confirm(`Supprimer l'activité "${actName}" ?`)) {
      removeActivity(id);
    }
  };

  const eventTypes: EventType[] = ["classement", "duel_1v1", "equipe", "score_num"];

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>➕ Ajouter une activité</AppCardTitle>
        <AppButton variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </AppButton>
      </AppCardHeader>
      <AppCardContent>
        <AppInput
          placeholder="Nom de l'activité (ex: Ping-pong)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4"
        />

        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">Type</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <Chip
                key={type}
                active={selectedType === type}
                onClick={() => setSelectedType(type)}
              >
                {EVENT_TYPE_LABELS[type]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">Règle de scoring</label>
          <div className="flex flex-wrap gap-2 mb-3">
            <Chip active={ruleKind === "placement_table"} onClick={() => setRuleKind("placement_table")}>
              Barème par place
            </Chip>
            <Chip active={ruleKind === "per_win"} onClick={() => setRuleKind("per_win")}>
              Points par victoire
            </Chip>
            <Chip active={ruleKind === "numeric_rank"} onClick={() => setRuleKind("numeric_rank")}>
              Score numérique
            </Chip>
          </div>

          {(ruleKind === "placement_table" || ruleKind === "numeric_rank") && (
            <AppInput
              placeholder="Barème: 5,3,2,1,0"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              className="mb-2"
            />
          )}

          {ruleKind === "per_win" && (
            <AppInput
              type="number"
              placeholder="Points par victoire"
              value={pointsPerWin}
              onChange={(e) => setPointsPerWin(e.target.value)}
              className="mb-2"
            />
          )}

          {ruleKind === "numeric_rank" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={higherIsBetter}
                onChange={(e) => setHigherIsBetter(e.target.checked)}
                className="rounded"
              />
              Score élevé = meilleur
            </label>
          )}
        </div>

        <AppButton onClick={handleAdd} className="w-full mb-4" disabled={!name.trim()}>
          Ajouter l'activité
        </AppButton>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm text-muted-foreground mb-2">Activités existantes</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div>
                  <span className="font-medium text-sm">{act.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {EVENT_TYPE_LABELS[act.defaultType]}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(act.id, act.name)}
                  className="p-1 hover:bg-destructive/20 rounded"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
