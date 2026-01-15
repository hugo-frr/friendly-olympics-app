import { useState } from "react";
import { Trash2, UserPlus, Users, Plus, Minus, Search, Trophy, Calendar, Check, LogOut, Loader2, Mail, Bell } from "lucide-react";
import { useDataContext } from "@/contexts/DataContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppButton } from "@/components/ui/app-button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { EventType, ScoringRule } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function OlympiadsPage() {
  const { loading } = useDataContext();
  const { signOut, user } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
  };

  if (loading) {
    return (
      <PageContainer title="🏆 Olympiades">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="🏆 Olympiades" 
      subtitle="Gère tes joueurs, olympiades et épreuves"
    >
      {/* User info */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm text-muted-foreground">
          {user?.email}
        </span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      <NotificationsSection />
      <PlayersSection />
      <CreateOlympiadSection />
      <OlympiadsListSection />
      <ShareOlympiadSection />
      <EventsSection />
    </PageContainer>
  );
}

// ============================================
// NOTIFICATIONS SECTION
// ============================================
function NotificationsSection() {
  const { notifications, acceptInvite, markNotificationRead } = useDataContext();

  const unread = notifications.filter((notification) => !notification.readAt);
  if (unread.length === 0) {
    return null;
  }

  const handleAcceptInvite = async (notificationId: string, inviteId?: string) => {
    if (!inviteId) return;
    await acceptInvite(inviteId);
    await markNotificationRead(notificationId);
    toast.success("Invitation acceptée !");
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
  };

  return (
    <AppCard variant="highlight">
      <AppCardHeader>
        <AppCardTitle>
          <Bell className="inline-block w-5 h-5 mr-2 text-primary" />
          Notifications ({unread.length})
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-3">
          {unread.map((notification) => {
            const inviteId = (notification.data?.invite_id as string | undefined) ?? undefined;
            return (
              <div key={notification.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{notification.title}</p>
                  {notification.body && (
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  )}
                </div>
                {notification.type === "olympiad_invite" ? (
                  <AppButton size="sm" onClick={() => handleAcceptInvite(notification.id, inviteId)}>
                    Rejoindre
                  </AppButton>
                ) : (
                  <AppButton size="sm" variant="ghost" onClick={() => handleMarkRead(notification.id)}>
                    Ok
                  </AppButton>
                )}
              </div>
            );
          })}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// PLAYERS SECTION
// ============================================
function PlayersSection() {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const { players, addPlayer, removePlayer, currentOlympiad, inviteToOlympiad } = useDataContext();
  const { user } = useAuthContext();
  const myPlayers = players.filter((player) => player.userId === user?.id);
  const isOwner = currentOlympiad?.ownerId === user?.id;

  const handleAddPlayer = async () => {
    if (newPlayerName.trim()) {
      await addPlayer(newPlayerName);
      setNewPlayerName("");
    }
  };

  const handleRemovePlayer = async (id: string, name: string) => {
    if (confirm(`Supprimer ${name} ?`)) {
      await removePlayer(id);
    }
  };

  const handleInviteUser = async () => {
    if (!currentOlympiad || !inviteEmail.trim()) return;
    await inviteToOlympiad(currentOlympiad.id, inviteEmail);
    setInviteEmail("");
    toast.success("Invitation envoyee");
  };

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>
          <Users className="inline-block w-5 h-5 mr-2 text-primary" />
          Joueurs ({myPlayers.length})
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

        <div className="flex gap-2 mb-4">
          <AppInput
            placeholder="Inviter un user (email)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInviteUser()}
            className="flex-1"
            disabled={!currentOlympiad || !isOwner}
          />
          <AppButton onClick={handleInviteUser} size="icon" disabled={!currentOlympiad || !isOwner}>
            <Mail className="w-5 h-5" />
          </AppButton>
        </div>
        {!currentOlympiad && (
          <p className="text-xs text-muted-foreground mb-3">
            Selectionne une olympiade pour inviter un user.
          </p>
        )}
        {currentOlympiad && !isOwner && (
          <p className="text-xs text-muted-foreground mb-3">
            Seul le proprietaire peut inviter des users.
          </p>
        )}

        {myPlayers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Aucun joueur. Ajoute des participants !
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {myPlayers.map((player) => (
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
// SHARE OLYMPIAD SECTION
// ============================================
function ShareOlympiadSection() {
  const { currentOlympiad, membersByOlympiad, invites, inviteToOlympiad } = useDataContext();
  const { user } = useAuthContext();
  const [inviteEmail, setInviteEmail] = useState("");

  if (!currentOlympiad) {
    return null;
  }

  const isOwner = currentOlympiad.ownerId === user?.id;
  const members = membersByOlympiad[currentOlympiad.id] ?? [];
  const pendingInvites = invites.filter(
    (invite) =>
      invite.status === "pending" &&
      invite.olympiadId === currentOlympiad.id &&
      invite.invitedBy === user?.id
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await inviteToOlympiad(currentOlympiad.id, inviteEmail);
    setInviteEmail("");
    toast.success("Invitation envoyée");
  };

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>🤝 Membres et invitations</AppCardTitle>
      </AppCardHeader>
      <AppCardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Membres ({members.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <span
                key={member.id}
                className="text-xs px-2 py-1 rounded-full bg-muted/60"
              >
                {member.displayName ?? "Membre"} • {member.role}
              </span>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Inviter un compte</p>
            <div className="flex gap-2">
              <AppInput
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1"
              />
              <AppButton onClick={handleInvite} size="icon">
                <Mail className="w-4 h-4" />
              </AppButton>
            </div>
            {pendingInvites.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Invitations en attente : {pendingInvites.length}
              </div>
            )}
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

  const { players, createOlympiad } = useDataContext();
  const { user } = useAuthContext();
  const myPlayers = players.filter((player) => player.userId === user?.id);

  const displayedPlayers = showAllPlayers ? myPlayers : myPlayers.slice(0, 5);

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
    setSelectedPlayerIds(new Set(myPlayers.map((p) => p.id)));
  };

  const handleCreate = async () => {
    if (title.trim() && selectedPlayerIds.size > 0) {
      await createOlympiad(title, Array.from(selectedPlayerIds));
      setTitle("");
      setSelectedPlayerIds(new Set());
      toast.success("Olympiade créée !");
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
            Participants ({selectedPlayerIds.size}/{myPlayers.length})
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

        {myPlayers.length > 5 && (
          <button
            onClick={() => setShowAllPlayers(!showAllPlayers)}
            className="text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            {showAllPlayers ? "Afficher moins" : `Afficher tout (${myPlayers.length})`}
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
  const { olympiads, currentOlympiadId, setCurrentOlympiad, removeOlympiad } = useDataContext();
  const { user } = useAuthContext();

  const handleRemove = async (id: string, title: string) => {
    if (confirm(`Supprimer l'olympiade "${title}" ?`)) {
      await removeOlympiad(id);
      toast.success("Olympiade supprimée");
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
            const isOwner = olymp.ownerId === user?.id;
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {isOwner ? "Propriétaire" : "Partagée"}
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
                    {isOwner && (
                      <button
                        onClick={() => handleRemove(olymp.id, olymp.title)}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
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
  const { currentOlympiad, activities, addEventInstance, removeEventInstance } = useDataContext();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddActivity, setShowAddActivity] = useState(false);

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

  const isOwner = currentOlympiad.ownerId === user?.id;
  if (!isOwner) {
    return (
      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            🎯 Épreuves de {currentOlympiad.title}
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {currentOlympiad.eventInstances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune épreuve pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {currentOlympiad.eventInstances.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{event.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_TYPE_LABELS[event.type]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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

  const handleAddInstance = async (activity: typeof activities[0]) => {
    if (!isOwner) return;
    const teamSize = activity.defaultType === "equipe" 
      ? parseInt(prompt("Taille des équipes (ex: 2 pour 2v2):", "2") || "2", 10)
      : undefined;

    await addEventInstance(currentOlympiad.id, {
      templateId: activity.id,
      name: activity.name,
      type: activity.defaultType,
      rule: activity.defaultRule ?? { kind: "placement_table", table: [5, 3, 2, 1, 0] },
      teamSize,
    });
  };

  const handleRemoveInstance = async (activity: typeof activities[0]) => {
    if (!isOwner) return;
    const instances = currentOlympiad.eventInstances.filter((e) => e.templateId === activity.id);
    const lastInstance = instances[instances.length - 1];
    if (lastInstance && confirm(`Retirer "${activity.name}" de cette olympiade ?`)) {
      await removeEventInstance(currentOlympiad.id, lastInstance.id);
    }
  };

  return (
    <>
      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            🎯 Épreuves de {currentOlympiad.title}
          </AppCardTitle>
          {isOwner && (
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => setShowAddActivity(!showAddActivity)}
            >
              <Plus className="w-4 h-4" />
            </AppButton>
          )}
        </AppCardHeader>
        <AppCardContent>
          {!isOwner && (
            <p className="text-xs text-muted-foreground mb-3">
              Seul le propriétaire peut modifier les épreuves.
            </p>
          )}
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
                    {isOwner && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AppCardContent>
      </AppCard>

      {showAddActivity && isOwner && <AddActivitySection onClose={() => setShowAddActivity(false)} />}
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

  const { activities, addActivity, removeActivity } = useDataContext();

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

  const handleAdd = async () => {
    if (name.trim()) {
      await addActivity(name, selectedType, buildRule());
      setName("");
      toast.success("Activité ajoutée");
    }
  };

  const handleRemove = async (id: string, actName: string) => {
    if (confirm(`Supprimer l'activité "${actName}" ?`)) {
      await removeActivity(id);
      toast.success("Activité supprimée");
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

          {ruleKind === "placement_table" && (
            <AppInput
              placeholder="Barème (ex: 5,3,2,1,0)"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
            />
          )}

          {ruleKind === "per_win" && (
            <AppInput
              type="number"
              placeholder="Points par victoire"
              value={pointsPerWin}
              onChange={(e) => setPointsPerWin(e.target.value)}
            />
          )}

          {ruleKind === "numeric_rank" && (
            <div className="space-y-2">
              <AppInput
                placeholder="Barème (ex: 5,3,2,1,0)"
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={higherIsBetter}
                  onChange={(e) => setHigherIsBetter(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Score élevé = meilleur</span>
              </label>
            </div>
          )}
        </div>

        <AppButton onClick={handleAdd} className="w-full mb-6" disabled={!name.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter l'activité
        </AppButton>

        {/* List existing activities */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-3">Activités existantes</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
              >
                <div>
                  <span className="font-medium text-sm">{activity.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {EVENT_TYPE_LABELS[activity.defaultType]}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(activity.id, activity.name)}
                  className="p-1 hover:bg-destructive/20 rounded transition-colors"
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
