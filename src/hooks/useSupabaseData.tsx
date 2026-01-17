import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import type {
  IPlayer,
  Activity,
  IOlympiad,
  AppNotification,
  OlympiadInvite,
  OlympiadMember,
  UserSubscription,
  UserSearchResult,
  EventType,
  ScoringRule,
  EventInstance,
  EventResult,
  Match,
  ID,
} from "@/lib/types";
// JSON type for database serialization
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Default activities for new users
const DEFAULT_ACTIVITIES: Omit<Activity, "id">[] = [
  { name: "Babyfoot", defaultType: "duel_1v1", defaultRule: { kind: "per_win", pointsPerPlayer: 3 } },
  { name: "Fléchettes", defaultType: "classement", defaultRule: { kind: "placement_table", table: [5, 3, 2, 1, 0] } },
  { name: "Volley", defaultType: "equipe", defaultRule: { kind: "per_win", pointsPerPlayer: 4 } },
  { name: "Course", defaultType: "classement", defaultRule: { kind: "placement_table", table: [10, 7, 5, 3, 2, 1] } },
  { name: "Pétanque", defaultType: "equipe", defaultRule: { kind: "per_win", pointsPerPlayer: 3 } },
];

export function useSupabaseData() {
  const { user } = useAuthContext();
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [olympiads, setOlympiads] = useState<IOlympiad[]>([]);
  const [membersByOlympiad, setMembersByOlympiad] = useState<Record<ID, OlympiadMember[]>>({});
  const [invites, setInvites] = useState<OlympiadInvite[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentOlympiadId, setCurrentOlympiadId] = useState<ID | undefined>();
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: true });

      if (playersError) {
        toast.error("Impossible de charger les joueurs.");
      } else {
        let resolvedPlayers = playersData ?? [];
        const hasSelfPlayer = resolvedPlayers.some(
          (p) => p.user_id === user.id && p.linked_user_id === user.id
        );
        if (!hasSelfPlayer) {
          const displayName =
            (user.user_metadata?.display_name as string | undefined) ??
            user.email ??
            "Moi";
          const newPlayer = {
            id: nanoid(8),
            user_id: user.id,
            name: displayName,
            linked_user_id: user.id,
          };
          const { error: insertError } = await supabase.from("players").insert(newPlayer);
          if (insertError && insertError.code !== "23505") {
            toast.error("Impossible de créer ton joueur.");
          }
          const { data: refreshedPlayers } = await supabase
            .from("players")
            .select("*")
            .order("created_at", { ascending: true });
          resolvedPlayers = refreshedPlayers ?? resolvedPlayers;
        }

        setPlayers(
          resolvedPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            userId: p.user_id,
            linkedUserId: p.linked_user_id,
          }))
        );
      }

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: true });

      if (activitiesError) {
        toast.error("Impossible de charger les activites.");
      } else if (activitiesData && activitiesData.length === 0) {
        // Create default activities for new users
        const defaultActs = DEFAULT_ACTIVITIES.map((a) => ({
          id: nanoid(8),
          user_id: user.id,
          name: a.name,
          default_type: a.defaultType,
          default_rule: a.defaultRule as unknown as Json,
        }));

        await supabase
          .from("activities")
          .upsert(defaultActs, { onConflict: "user_id,name" });

        const { data: refreshedActivities } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: true });

        setActivities(
          refreshedActivities?.map((a) => ({
            id: a.id,
            name: a.name,
            defaultType: a.default_type as EventType,
            defaultRule: a.default_rule as ScoringRule | undefined,
          })) ?? []
        );
      } else {
        setActivities(activitiesData?.map(a => ({
          id: a.id,
          name: a.name,
          defaultType: a.default_type as EventType,
          defaultRule: a.default_rule as ScoringRule | undefined,
        })) ?? []);
      }

      // Fetch olympiads
      const { data: olympiadsData, error: olympiadsError } = await supabase
        .from("olympiads")
        .select("*")
        .order("created_at", { ascending: false });

      if (olympiadsError) {
        console.error("Olympiads fetch error:", olympiadsError);
        toast.error(`Impossible de charger les olympiades: ${olympiadsError.message}`);
        return;
      }
      
      const mappedOlympiads = olympiadsData?.map(o => ({
        id: o.id,
        ownerId: o.user_id,
        title: o.title,
        createdAt: new Date(o.created_at).getTime(),
        playerIds: o.player_ids ?? [],
        eventInstances: (o.event_instances as unknown as EventInstance[]) ?? [],
      })) ?? [];
      
      setOlympiads(mappedOlympiads);
      
      const olympiadIds = mappedOlympiads.map((o) => o.id);
      if (olympiadIds.length > 0) {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from("olympiad_memberships")
          .select("id, olympiad_id, user_id, role")
          .in("olympiad_id", olympiadIds);
        if (membershipsError) {
          toast.error("Impossible de charger les membres.");
        }

        const memberUserIds = new Set<string>();
        membershipsData?.forEach((m) => memberUserIds.add(m.user_id));
        mappedOlympiads.forEach((o) => memberUserIds.add(o.ownerId));

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", Array.from(memberUserIds));
        if (profilesError) {
          toast.error("Impossible de charger les profils.");
        }

        const profileMap = new Map(
          (profilesData ?? []).map((p) => [p.user_id, p.display_name])
        );

        const nextMembers: Record<ID, OlympiadMember[]> = {};
        mappedOlympiads.forEach((olymp) => {
          const members = (membershipsData ?? [])
            .filter((m) => m.olympiad_id === olymp.id)
            .map((m) => ({
              id: m.id,
              olympiadId: m.olympiad_id,
              userId: m.user_id,
              role: m.role as OlympiadMember["role"],
              displayName: profileMap.get(m.user_id) ?? null,
            }));

          if (!members.some((m) => m.userId === olymp.ownerId)) {
            members.unshift({
              id: `owner-${olymp.id}`,
              olympiadId: olymp.id,
              userId: olymp.ownerId,
              role: "owner",
              displayName: profileMap.get(olymp.ownerId) ?? null,
            });
          }

          nextMembers[olymp.id] = members;
        });

        setMembersByOlympiad(nextMembers);
      } else {
        setMembersByOlympiad({});
      }

      const [
        { data: invitesData, error: invitesError },
        { data: notificationsData, error: notificationsError },
        { data: subscriptionData, error: subscriptionError },
      ] = await Promise.all([
        supabase
          .from("olympiad_invites")
          .select("id, olympiad_id, olympiad_title, invited_email, invited_by, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("notifications")
          .select("id, title, body, type, data, created_at, read_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (invitesError) {
        toast.error("Impossible de charger les invitations.");
      }
      if (notificationsError) {
        toast.error("Impossible de charger les notifications.");
      }
      if (subscriptionError) {
        toast.error("Impossible de charger l'abonnement.");
      }

      setInvites(
        (invitesData ?? []).map((invite) => ({
          id: invite.id,
          olympiadId: invite.olympiad_id,
          olympiadTitle: invite.olympiad_title,
          invitedEmail: invite.invited_email,
          invitedBy: invite.invited_by,
          status: invite.status as OlympiadInvite["status"],
          createdAt: new Date(invite.created_at).getTime(),
        }))
      );

      setNotifications(
        (notificationsData ?? []).map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          data: notification.data as Record<string, unknown> | null,
          createdAt: new Date(notification.created_at).getTime(),
          readAt: notification.read_at ? new Date(notification.read_at).getTime() : null,
        }))
      );

      const subscriptionStatus = subscriptionData?.status ?? null;
      const subscriptionEnd = subscriptionData?.current_period_end
        ? new Date(subscriptionData.current_period_end).getTime()
        : null;
      const isActive = Boolean(
        subscriptionStatus &&
          ["active", "trialing"].includes(subscriptionStatus) &&
          (!subscriptionEnd || subscriptionEnd > Date.now())
      );

      setSubscription({
        status: subscriptionStatus,
        currentPeriodEnd: subscriptionEnd,
        isActive,
      });

      // Preserve the selected olympiad if it still exists; otherwise fallback to owner current or first.
      const selectedExists = currentOlympiadId
        ? mappedOlympiads.some((olymp) => olymp.id === currentOlympiadId)
        : false;
      if (!selectedExists) {
        const current = olympiadsData?.find((o) => o.current && o.user_id === user.id);
        if (current) {
          setCurrentOlympiadId(current.id);
        } else if (mappedOlympiads.length > 0) {
          setCurrentOlympiadId(mappedOlympiads[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, currentOlympiadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Player actions
  const addPlayerToOlympiad = async (olympId: ID, playerId: ID) => {
    const olympiad = olympiads.find((o) => o.id === olympId);
    if (!olympiad) return;
    if (olympiad.playerIds.includes(playerId)) return;
    const player = players.find((p) => p.id === playerId);
    if (player && !player.linkedUserId) {
      toast.error("Compte requis pour ajouter un joueur.");
      return;
    }

    const updatedPlayerIds = [...olympiad.playerIds, playerId];
    const { error } = await supabase
      .from("olympiads")
      .update({ player_ids: updatedPlayerIds })
      .eq("id", olympId);

    if (error) {
      toast.error("Impossible d'ajouter le joueur a l'olympiade.");
      return;
    }

    setOlympiads((prev) =>
      prev.map((o) => (o.id === olympId ? { ...o, playerIds: updatedPlayerIds } : o))
    );

    if (player?.linkedUserId) {
      const { error: membershipError } = await supabase
        .from("olympiad_memberships")
        .upsert(
          {
            olympiad_id: olympiad.id,
            user_id: player.linkedUserId,
            role: "editor",
          },
          { onConflict: "olympiad_id,user_id" }
        );

      if (membershipError) {
        toast.error("Impossible d'ajouter l'utilisateur a l'olympiade.");
        return;
      }

      setMembersByOlympiad((prev) => {
        const existing = prev[olympId] ?? [];
        if (existing.some((m) => m.userId === player.linkedUserId)) {
          return prev;
        }
        return {
          ...prev,
          [olympId]: [
            ...existing,
            {
              id: `linked-${olympId}-${player.linkedUserId}`,
              olympiadId: olympiad.id,
              userId: player.linkedUserId,
              role: "editor",
              displayName: player.name,
            },
          ],
        };
      });
    }
  };

  const removePlayerFromOlympiad = async (olympId: ID, playerId: ID) => {
    const olympiad = olympiads.find((o) => o.id === olympId);
    if (!olympiad) return;
    if (!olympiad.playerIds.includes(playerId)) return;
    const player = players.find((p) => p.id === playerId);

    const updatedPlayerIds = olympiad.playerIds.filter((id) => id !== playerId);
    const { error } = await supabase
      .from("olympiads")
      .update({ player_ids: updatedPlayerIds })
      .eq("id", olympId);

    if (error) {
      toast.error("Impossible de retirer le joueur de l'olympiade.");
      return;
    }

    setOlympiads((prev) =>
      prev.map((o) => (o.id === olympId ? { ...o, playerIds: updatedPlayerIds } : o))
    );

    if (player?.linkedUserId) {
      const { error: membershipError } = await supabase
        .from("olympiad_memberships")
        .delete()
        .eq("olympiad_id", olympiad.id)
        .eq("user_id", player.linkedUserId);

      if (membershipError) {
        toast.error("Impossible de retirer l'utilisateur de l'olympiade.");
        return;
      }

      setMembersByOlympiad((prev) => ({
        ...prev,
        [olympId]: (prev[olympId] ?? []).filter((m) => m.userId !== player.linkedUserId),
      }));
    }
  };

  const addPlayer = async (name: string, olympiadId?: ID) => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newPlayer = { id: nanoid(8), user_id: user.id, name: trimmedName };
    const { error } = await supabase.from("players").insert(newPlayer);
    if (!error) {
      setPlayers((prev) => [
        ...prev,
        {
          id: newPlayer.id,
          name: newPlayer.name,
          userId: newPlayer.user_id,
          linkedUserId: null,
        },
      ]);
      if (olympiadId) {
        await addPlayerToOlympiad(olympiadId, newPlayer.id);
      }
    }
  };

  const removePlayer = async (id: ID) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (!error) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  // Activity actions
  const addActivity = async (name: string, defaultType: EventType, defaultRule?: ScoringRule) => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newActivity = {
      id: nanoid(8),
      user_id: user.id,
      name: trimmedName,
      default_type: defaultType,
      default_rule: (defaultRule ?? null) as unknown as Json,
    };

    const { error } = await supabase.from("activities").insert(newActivity);
    if (!error) {
      setActivities(prev => [...prev, {
        id: newActivity.id,
        name: newActivity.name,
        defaultType: newActivity.default_type as EventType,
        defaultRule: newActivity.default_rule as unknown as ScoringRule | undefined,
      }]);
    }
  };

  const removeActivity = async (id: ID) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  // Olympiad actions
  const createOlympiad = async (title: string, playerIds: ID[]): Promise<ID> => {
    if (!user) return "";
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return "";

    // Reset current flag on all other olympiads
    await supabase.from("olympiads").update({ current: false }).eq("user_id", user.id);

    const newOlympiad = {
      id: nanoid(8),
      user_id: user.id,
      title: trimmedTitle,
      player_ids: playerIds,
      event_instances: [] as unknown as Json,
      current: true,
    };

    const { error } = await supabase.from("olympiads").insert(newOlympiad);
    if (!error) {
      setOlympiads(prev => [{
        id: newOlympiad.id,
        ownerId: newOlympiad.user_id,
        title: newOlympiad.title,
        createdAt: Date.now(),
        playerIds: newOlympiad.player_ids,
        eventInstances: [],
      }, ...prev]);
      setCurrentOlympiadId(newOlympiad.id);
      setMembersByOlympiad((prev) => ({
        ...prev,
        [newOlympiad.id]: [
          {
            id: `owner-${newOlympiad.id}`,
            olympiadId: newOlympiad.id,
            userId: newOlympiad.user_id,
            role: "owner",
            displayName: user.email ?? null,
          },
        ],
      }));
      await fetchData();
      return newOlympiad.id;
    }
    toast.error("Impossible de creer l'olympiade.");
    return "";
  };

  const removeOlympiad = async (id: ID) => {
    const olympiad = olympiads.find(o => o.id === id);
    if (!olympiad || olympiad.ownerId !== user?.id) return;

    const { error } = await supabase.from("olympiads").delete().eq("id", id);
    if (!error) {
      setOlympiads(prev => prev.filter(o => o.id !== id));
      setMembersByOlympiad((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      setInvites((prev) => prev.filter((invite) => invite.olympiadId !== id));
      if (currentOlympiadId === id) {
        setCurrentOlympiadId(undefined);
      }
    }
  };

  const setCurrentOlympiad = async (id?: ID) => {
    if (!user) return;
    
    const olympiad = id ? olympiads.find(o => o.id === id) : undefined;
    if (olympiad?.ownerId === user.id) {
      await supabase.from("olympiads").update({ current: false }).eq("user_id", user.id);
      if (id) {
        await supabase.from("olympiads").update({ current: true }).eq("id", id);
      }
    }

    setCurrentOlympiadId(id);
  };

  // Event instance actions
  const addEventInstance = async (olympId: ID, cfg: {
    templateId: ID;
    name: string;
    type: EventType;
    rule: ScoringRule;
    teamSize?: number;
  }) => {
    const olympiad = olympiads.find(o => o.id === olympId);
    if (!olympiad) return;

    const newInstance: EventInstance = {
      id: nanoid(8),
      templateId: cfg.templateId,
      name: cfg.name,
      type: cfg.type,
      rule: cfg.rule,
      teamSize: cfg.teamSize,
      matches: [],
    };

    const updatedInstances = [...olympiad.eventInstances, newInstance];
    
    const { error } = await supabase
      .from("olympiads")
      .update({ event_instances: updatedInstances as unknown as Json })
      .eq("id", olympId);

    if (!error) {
      setOlympiads(prev => prev.map(o => 
        o.id === olympId ? { ...o, eventInstances: updatedInstances } : o
      ));
    }
  };

  const removeEventInstance = async (olympId: ID, instanceId: ID) => {
    const olympiad = olympiads.find(o => o.id === olympId);
    if (!olympiad) return;

    const updatedInstances = olympiad.eventInstances.filter(e => e.id !== instanceId);
    
    const { error } = await supabase
      .from("olympiads")
      .update({ event_instances: updatedInstances as unknown as Json })
      .eq("id", olympId);

    if (!error) {
      setOlympiads(prev => prev.map(o => 
        o.id === olympId ? { ...o, eventInstances: updatedInstances } : o
      ));
    }
  };

  // Match actions
  const addMatch = async (olympId: ID, instanceId: ID, result: EventResult) => {
    const olympiad = olympiads.find(o => o.id === olympId);
    if (!olympiad) return;

    const newMatch: Match = {
      id: nanoid(8),
      createdAt: Date.now(),
      result,
    };

    const updatedInstances = olympiad.eventInstances.map(event => {
      if (event.id !== instanceId) return event;
      return { ...event, matches: [...event.matches, newMatch] };
    });

    const { error } = await supabase
      .from("olympiads")
      .update({ event_instances: updatedInstances as unknown as Json })
      .eq("id", olympId);

    if (!error) {
      setOlympiads(prev => prev.map(o => 
        o.id === olympId ? { ...o, eventInstances: updatedInstances } : o
      ));
    }
  };

  const removeMatch = async (olympId: ID, instanceId: ID, matchId: ID) => {
    const olympiad = olympiads.find(o => o.id === olympId);
    if (!olympiad) return;

    const updatedInstances = olympiad.eventInstances.map(event => {
      if (event.id !== instanceId) return event;
      return { ...event, matches: event.matches.filter(m => m.id !== matchId) };
    });

    const { error } = await supabase
      .from("olympiads")
      .update({ event_instances: updatedInstances as unknown as Json })
      .eq("id", olympId);

    if (!error) {
      setOlympiads(prev => prev.map(o => 
        o.id === olympId ? { ...o, eventInstances: updatedInstances } : o
      ));
    }
  };

  const inviteToOlympiad = async (olympId: ID, email: string) => {
    if (!user) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    const olympiad = olympiads.find((o) => o.id === olympId);
    if (!olympiad || olympiad.ownerId !== user.id) return;

    const { data, error } = await supabase
      .from("olympiad_invites")
      .insert({
        olympiad_id: olympiad.id,
        olympiad_title: olympiad.title,
        invited_email: trimmedEmail,
        invited_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (!error && data) {
      setInvites((prev) => [
        {
          id: data.id,
          olympiadId: data.olympiad_id,
          olympiadTitle: data.olympiad_title,
          invitedEmail: data.invited_email,
          invitedBy: data.invited_by,
          status: data.status as OlympiadInvite["status"],
          createdAt: new Date(data.created_at).getTime(),
        },
        ...prev,
      ]);

      const { error: emailError } = await supabase.functions.invoke("send-olympiad-invite", {
        body: {
          olympiadTitle: data.olympiad_title,
          invitedEmail: data.invited_email,
          invitedBy: user.email,
        },
      });
      if (emailError) {
        console.warn("Invite email error:", emailError.message);
      }
    }
  };

  const inviteUserToOlympiad = async (olympId: ID, invitedUserId: string) => {
    if (!user) return;
    const olympiad = olympiads.find((o) => o.id === olympId);
    if (!olympiad) return;

    // Get the user's email from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", invitedUserId)
      .maybeSingle();

    if (!profileData) {
      toast.error("Utilisateur non trouvé.");
      return;
    }

    // For now, just add them directly as member since we don't have email lookup
    const { error: memberError } = await supabase
      .from("olympiad_memberships")
      .insert({
        olympiad_id: olympiad.id,
        user_id: invitedUserId,
        role: "member",
      });

    if (memberError) {
      toast.error("Impossible d'inviter cet utilisateur.");
      return;
    }

    toast.success("Utilisateur ajouté à l'olympiade !");
    await fetchData();
  };

  const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return [];
    }
    // Search profiles by display_name
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", `%${trimmedQuery}%`)
      .limit(8);
    
    if (error) {
      toast.error("Impossible de rechercher des utilisateurs.");
      return [];
    }
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
    }));
  };

  const acceptInvite = async (inviteId: ID) => {
    if (!user) return;
    
    // Get the invite
    const invite = invites.find((i) => i.id === inviteId);
    if (!invite) return;

    // Update invite status
    const { error: inviteError } = await supabase
      .from("olympiad_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId);

    if (inviteError) {
      toast.error("Impossible d'accepter l'invitation.");
      return;
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from("olympiad_memberships")
      .insert({
        olympiad_id: invite.olympiadId,
        user_id: user.id,
        role: "member",
      });

    if (!memberError) {
      await fetchData();
      toast.success("Invitation acceptée !");
    }
  };

  const markNotificationRead = async (notificationId: ID) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, readAt: Date.now() }
            : notification
        )
      );
    }
  };

  const startSubscriptionCheckout = async (returnUrl: string) => {
    const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
      body: { returnUrl },
    });
    if (error) {
      toast.error("Impossible de demarrer le paiement.");
      return null;
    }
    const url = (data as { url?: string } | null)?.url ?? null;
    if (!url) {
      toast.error("Lien de paiement indisponible.");
      return null;
    }
    return url;
  };

  const currentOlympiad = olympiads.find(o => o.id === currentOlympiadId);

  return {
    players,
    activities,
    olympiads,
    membersByOlympiad,
    invites,
    notifications,
    subscription,
    currentOlympiadId,
    currentOlympiad,
    loading,
    addPlayer,
    addPlayerToOlympiad,
    removePlayerFromOlympiad,
    removePlayer,
    addActivity,
    removeActivity,
    createOlympiad,
    removeOlympiad,
    setCurrentOlympiad,
    addEventInstance,
    removeEventInstance,
    addMatch,
    removeMatch,
    inviteToOlympiad,
    inviteUserToOlympiad,
    acceptInvite,
    markNotificationRead,
    startSubscriptionCheckout,
    searchUsers,
    refetch: fetchData,
  };
}
