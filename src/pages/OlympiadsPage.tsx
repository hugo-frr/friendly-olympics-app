import { useState } from "react";
import { Trash2, UserPlus, Plus, Minus, Search, Trophy, Calendar, LogOut, Loader2, Mail, Bell } from "lucide-react";
import { useDataContext } from "@/contexts/DataContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/app-card";
import { AppInput } from "@/components/ui/app-input";
import { AppButton } from "@/components/ui/app-button";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

      <InboxSection />
      <CreateOlympiadSection />
      <OlympiadsListSection />
      <ParticipantsSection />
      <EventsSection />
    </PageContainer>
  );
}

// ============================================
// INBOX SECTION
// ============================================
function InboxSection() {
  const { invites, notifications, acceptInvite, markNotificationRead, setCurrentOlympiad } = useDataContext();
  const { user } = useAuthContext();

  const userEmail = (user?.email ?? user?.user_metadata?.email ?? "").toLowerCase();
  const incomingInvites = invites.filter((invite) => {
    if (invite.status !== "pending") return false;
    if (!userEmail) return true;
    return invite.invitedEmail.toLowerCase() === userEmail;
  });
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt && notification.type !== "olympiad_invite"
  );

  if (incomingInvites.length === 0 && unreadNotifications.length === 0) {
    return null;
  }

  const handleAcceptInvite = async (inviteId: string, olympiadId: string) => {
    await acceptInvite(inviteId);
    await setCurrentOlympiad(olympiadId);
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
          Boîte de réception
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent className="space-y-4">
        {incomingInvites.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Invitations ({incomingInvites.length})
            </p>
            {incomingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{invite.olympiadTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(invite.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <AppButton
                  size="sm"
                  onClick={() => handleAcceptInvite(invite.id, invite.olympiadId)}
                >
                  Rejoindre
                </AppButton>
              </div>
            ))}
          </div>
        )}
        {unreadNotifications.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Notifications ({unreadNotifications.length})
            </p>
            {unreadNotifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{notification.title}</p>
                  {notification.body && (
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  )}
                </div>
                <AppButton size="sm" variant="ghost" onClick={() => handleMarkRead(notification.id)}>
                  Ok
                </AppButton>
              </div>
            ))}
          </div>
        )}
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// PARTICIPANTS SECTION
// ============================================
function ParticipantsSection() {
  const {
    currentOlympiad,
    players,
    addPlayerToOlympiad,
    removePlayerFromOlympiad,
    inviteToOlympiad,
    addPlayer,
    removePlayer,
  } = useDataContext();
  const { user } = useAuthContext();
  const [inviteEmail, setInviteEmail] = useState("");
  const [participantToRemove, setParticipantToRemove] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerToRemove, setPlayerToRemove] = useState<{ id: string; name: string } | null>(null);

  const isOwner = currentOlympiad?.ownerId === user?.id;
  const olympiadPlayers = currentOlympiad
    ? players.filter((player) => currentOlympiad.playerIds.includes(player.id))
    : [];
  const participantIds = new Set(olympiadPlayers.map((player) => player.id));
  const myPlayers = players.filter((player) => player.userId === user?.id);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!currentOlympiad) {
      toast.error("Sélectionne une olympiade avant d'inviter.");
      return;
    }
    await inviteToOlympiad(currentOlympiad.id, inviteEmail);
    setInviteEmail("");
    toast.success("Invitation envoyée");
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName);
    setNewPlayerName("");
  };

  const handleRemovePlayer = async (id: string, name: string) => {
    setPlayerToRemove({ id, name });
  };

  const handleToggleParticipant = async (playerId: string, playerName: string) => {
    if (!currentOlympiad) {
      toast.error("Sélectionne une olympiade pour ajouter des participants.");
      return;
    }
    if (participantIds.has(playerId)) {
      setParticipantToRemove({ id: playerId, name: playerName });
      return;
    }
    await addPlayerToOlympiad(currentOlympiad.id, playerId);
  };

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>2. Participants et invitations</AppCardTitle>
      </AppCardHeader>
      <AppCardContent className="space-y-4">
        {!currentOlympiad && (
          <AppCard variant="muted">
            <AppCardContent className="py-4 text-center">
              <p className="text-muted-foreground">
                Sélectionne une olympiade pour ajouter des participants.
              </p>
            </AppCardContent>
          </AppCard>
        )}
        {isOwner && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <AppInput
                placeholder="Créer un joueur"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                className="flex-1"
              />
              <AppButton onClick={handleAddPlayer} size="icon">
                <UserPlus className="w-5 h-5" />
              </AppButton>
            </div>
            <div className="flex gap-2">
              <AppInput
                placeholder="Inviter un user (email)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1"
                disabled={!currentOlympiad}
              />
              <AppButton onClick={handleInvite} size="icon" disabled={!currentOlympiad}>
                <Mail className="w-4 h-4" />
              </AppButton>
            </div>
            {!currentOlympiad && (
              <p className="text-xs text-muted-foreground">
                Sélectionne une olympiade pour inviter ou ajouter des joueurs.
              </p>
            )}
          </div>
        )}

        {isOwner && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Joueurs {myPlayers.length} • Participants {olympiadPlayers.length}
            </p>
            {myPlayers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-2">
                Aucun joueur pour le moment.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {myPlayers.map((player) => {
                  const isParticipant = participantIds.has(player.id);
                  const isLinkedUser = Boolean(player.linkedUserId);
                  return (
                    <div key={player.id} className="flex items-center gap-1">
                      <Chip
                        active={isParticipant}
                        onClick={() => handleToggleParticipant(player.id, player.name)}
                      >
                        <span className="flex items-center gap-2">
                          <span>{player.name}</span>
                          {isLinkedUser ? (
                            <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                              Invité
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="px-2 py-0 text-[10px]">
                              Perso
                            </Badge>
                          )}
                          <span className="text-xs">{isParticipant ? "✓" : "+"}</span>
                        </span>
                      </Chip>
                      <button
                        onClick={() => handleRemovePlayer(player.id, player.name)}
                        className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
                        aria-label={`Supprimer ${player.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isOwner && currentOlympiad && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Participants ({olympiadPlayers.length})
            </p>
            {olympiadPlayers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-2">
                Aucun participant pour le moment.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {olympiadPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 bg-muted rounded-full pl-3 pr-1 py-1"
                  >
                    <span className="text-sm font-medium">{player.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <ConfirmDialog
          open={!!participantToRemove}
          title={`Retirer ${participantToRemove?.name} ?`}
          description="Le joueur restera dans ta liste, mais sera retiré de cette olympiade."
          onOpenChange={(open) => !open && setParticipantToRemove(null)}
          onConfirm={async () => {
            if (!participantToRemove || !currentOlympiad) return;
            await removePlayerFromOlympiad(currentOlympiad.id, participantToRemove.id);
            setParticipantToRemove(null);
          }}
        />
        <ConfirmDialog
          open={!!playerToRemove}
          title={`Supprimer ${playerToRemove?.name} ?`}
          description="Le joueur sera supprimé de toutes tes olympiades."
          onOpenChange={(open) => !open && setPlayerToRemove(null)}
          onConfirm={async () => {
            if (!playerToRemove) return;
            await removePlayer(playerToRemove.id);
            setPlayerToRemove(null);
          }}
        />
      </AppCardContent>
    </AppCard>
  );
}

// ============================================
// CREATE OLYMPIAD SECTION
// ============================================
function CreateOlympiadSection() {
  const [title, setTitle] = useState("");
  const { createOlympiad } = useDataContext();

  const handleCreate = async () => {
    if (title.trim()) {
      await createOlympiad(title, []);
      setTitle("");
      toast.success("Olympiade créée !");
    }
  };

  return (
    <AppCard variant="highlight">
      <AppCardHeader>
        <AppCardTitle>
          <Plus className="inline-block w-5 h-5 mr-2 text-primary" />
          1. Olympiade
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <AppInput
          placeholder="Titre de l'olympiade"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4"
        />
        <p className="text-xs text-muted-foreground mb-4">
          Ajoute les participants juste après la création.
        </p>

        <AppButton
          onClick={handleCreate}
          className="w-full"
          disabled={!title.trim()}
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
  const [olympiadToRemove, setOlympiadToRemove] = useState<{ id: string; title: string } | null>(null);

  const handleRemove = async (id: string, title: string) => {
    setOlympiadToRemove({ id, title });
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
      <ConfirmDialog
        open={!!olympiadToRemove}
        title={`Supprimer "${olympiadToRemove?.title}" ?`}
        description="Cette action supprimera l'olympiade et toutes ses épreuves."
        onOpenChange={(open) => !open && setOlympiadToRemove(null)}
        onConfirm={async () => {
          if (!olympiadToRemove) return;
          await removeOlympiad(olympiadToRemove.id);
          toast.success("Olympiade supprimée");
          setOlympiadToRemove(null);
        }}
      />
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingActivity, setPendingActivity] = useState<typeof activities[0] | null>(null);
  const [ruleTableInput, setRuleTableInput] = useState("");
  const [pointsPerWin, setPointsPerWin] = useState("3");
  const [teamSize, setTeamSize] = useState("2");
  const [activityToRemove, setActivityToRemove] = useState<{ activity: typeof activities[0]; instanceId: string } | null>(null);

  if (!currentOlympiad) {
    return (
      <AppCard variant="muted">
        <AppCardContent className="py-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Crée ou sélectionne une olympiade pour gérer les épreuves
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
            3. Épreuves • {currentOlympiad.title}
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

  const buildAutoTable = (count: number) => {
    const safeCount = Math.max(1, count);
    return Array.from({ length: safeCount }, (_, idx) => Math.max(safeCount - 1 - idx, 0));
  };

  const parseRuleTable = (value: string) =>
    value
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => Number.isFinite(n));

  const openAddDialog = (activity: typeof activities[0]) => {
    if (!isOwner) return;
    const playerCount = currentOlympiad.playerIds.length;
    setPendingActivity(activity);
    setRuleTableInput(buildAutoTable(playerCount).join(","));
    setPointsPerWin("3");
    setTeamSize("2");
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!pendingActivity) return;
    const activity = pendingActivity;
    let rule: ScoringRule;
    let resolvedTeamSize: number | undefined;

    if (activity.defaultType === "duel_1v1" || activity.defaultType === "equipe") {
      const points = parseInt(pointsPerWin, 10) || 3;
      rule = { kind: "per_win", pointsPerPlayer: points };
      resolvedTeamSize = activity.defaultType === "equipe" ? parseInt(teamSize, 10) || 2 : undefined;
    } else {
      const table = parseRuleTable(ruleTableInput);
      if (table.length === 0) {
        toast.error("Barème invalide.");
        return;
      }
      rule = { kind: "placement_table", table };
    }

    await addEventInstance(currentOlympiad.id, {
      templateId: activity.id,
      name: activity.name,
      type: activity.defaultType,
      rule,
      teamSize: resolvedTeamSize,
    });

    setAddDialogOpen(false);
    setPendingActivity(null);
  };

  const handleRemoveInstance = async (activity: typeof activities[0]) => {
    if (!isOwner) return;
    const instances = currentOlympiad.eventInstances.filter((e) => e.templateId === activity.id);
    const lastInstance = instances[instances.length - 1];
    if (!lastInstance) return;
    setActivityToRemove({ activity, instanceId: lastInstance.id });
  };

  return (
    <>
      <AppCard>
        <AppCardHeader>
          <AppCardTitle>
            3. Épreuves • {currentOlympiad.title}
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
                          onClick={() => openAddDialog(activity)}
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
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une épreuve</DialogTitle>
            <DialogDescription>
              {pendingActivity ? pendingActivity.name : ""}
            </DialogDescription>
          </DialogHeader>
          {pendingActivity && (
            <div className="space-y-4">
              {pendingActivity.defaultType === "equipe" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Taille des équipes</label>
                  <AppInput
                    type="number"
                    placeholder="Ex: 2 pour 2v2"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                  />
                </div>
              )}
              {(pendingActivity.defaultType === "duel_1v1" || pendingActivity.defaultType === "equipe") && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Points par victoire</label>
                  <AppInput
                    type="number"
                    placeholder="Ex: 3"
                    value={pointsPerWin}
                    onChange={(e) => setPointsPerWin(e.target.value)}
                  />
                </div>
              )}
              {pendingActivity.defaultType === "classement" && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Barème</label>
                  <AppInput
                    placeholder="Barème (ex: 5,3,2,1,0)"
                    value={ruleTableInput}
                    onChange={(e) => setRuleTableInput(e.target.value)}
                  />
                  <AppButton
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const auto = buildAutoTable(currentOlympiad.playerIds.length).join(",");
                      setRuleTableInput(auto);
                    }}
                  >
                    Auto ({currentOlympiad.playerIds.length} joueurs)
                  </AppButton>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <AppButton variant="secondary" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </AppButton>
            <AppButton onClick={handleConfirmAdd}>
              Ajouter
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!activityToRemove}
        title={`Retirer "${activityToRemove?.activity.name}" ?`}
        description="L'épreuve sera retirée de cette olympiade."
        onOpenChange={(open) => !open && setActivityToRemove(null)}
        onConfirm={async () => {
          if (!activityToRemove) return;
          await removeEventInstance(currentOlympiad.id, activityToRemove.instanceId);
          setActivityToRemove(null);
        }}
      />
    </>
  );
}

// ============================================
// ADD ACTIVITY SECTION
// ============================================
function AddActivitySection({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<EventType>("classement");
  const [activityToRemove, setActivityToRemove] = useState<{ id: string; name: string } | null>(null);

  const { activities, addActivity, removeActivity, currentOlympiad } = useDataContext();
  const olympiadPlayerCount = currentOlympiad?.playerIds.length ?? 0;

  const buildAutoTable = (count: number) => {
    const safeCount = Math.max(1, count);
    return Array.from({ length: safeCount }, (_, idx) => Math.max(safeCount - 1 - idx, 0));
  };

  const buildRule = (): ScoringRule => {
    if (selectedType === "duel_1v1" || selectedType === "equipe") {
      return { kind: "per_win", pointsPerPlayer: 3 };
    }

    const table = buildAutoTable(olympiadPlayerCount || 5);
    return { kind: "placement_table", table };
  };

  const handleAdd = async () => {
    if (name.trim()) {
      await addActivity(name, selectedType, buildRule());
      setName("");
      toast.success("Activité ajoutée");
    }
  };

  const handleRemove = async (id: string, actName: string) => {
    setActivityToRemove({ id, name: actName });
  };

  const eventTypes: EventType[] = ["classement", "duel_1v1", "equipe"];

  return (
    <AppCard>
      <AppCardHeader>
        <AppCardTitle>➕ Ajouter une activité</AppCardTitle>
        <AppButton variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </AppButton>
      </AppCardHeader>
      <AppCardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Le barème sera défini au moment d'ajouter l'épreuve à l'olympiade.
        </p>
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
        <ConfirmDialog
          open={!!activityToRemove}
          title={`Supprimer "${activityToRemove?.name}" ?`}
          description="L'activité sera supprimée pour toutes les olympiades."
          onOpenChange={(open) => !open && setActivityToRemove(null)}
          onConfirm={async () => {
            if (!activityToRemove) return;
            await removeActivity(activityToRemove.id);
            toast.success("Activité supprimée");
            setActivityToRemove(null);
          }}
        />
      </AppCardContent>
    </AppCard>
  );
}
