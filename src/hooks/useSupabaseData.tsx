import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { nanoid } from "nanoid";
import type {
  IPlayer,
  Activity,
  IOlympiad,
  EventType,
  ScoringRule,
  EventInstance,
  EventResult,
  Match,
  ID,
} from "@/lib/types";
import { Json } from "@/integrations/supabase/types";

// Default activities for new users
const DEFAULT_ACTIVITIES: Omit<Activity, "id">[] = [
  { name: "Babyfoot", defaultType: "duel_1v1", defaultRule: { kind: "per_win", pointsPerPlayer: 3 } },
  { name: "Fléchettes", defaultType: "score_num", defaultRule: { kind: "numeric_rank", higherIsBetter: true, table: [5, 3, 2, 1, 0] } },
  { name: "Volley", defaultType: "equipe", defaultRule: { kind: "per_win", pointsPerPlayer: 4 } },
  { name: "Course", defaultType: "classement", defaultRule: { kind: "placement_table", table: [10, 7, 5, 3, 2, 1] } },
  { name: "Pétanque", defaultType: "equipe", defaultRule: { kind: "per_win", pointsPerPlayer: 3 } },
];

export function useSupabaseData() {
  const { user } = useAuthContext();
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [olympiads, setOlympiads] = useState<IOlympiad[]>([]);
  const [currentOlympiadId, setCurrentOlympiadId] = useState<ID | undefined>();
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch players
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: true });
      
      setPlayers(playersData?.map(p => ({ id: p.id, name: p.name })) ?? []);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (activitiesData && activitiesData.length === 0) {
        // Create default activities for new users
        const defaultActs = DEFAULT_ACTIVITIES.map(a => ({
          id: nanoid(8),
          user_id: user.id,
          name: a.name,
          default_type: a.defaultType,
          default_rule: a.defaultRule as unknown as Json,
        }));
        
        await supabase.from("activities").insert(defaultActs);
        setActivities(defaultActs.map(a => ({
          id: a.id,
          name: a.name,
          defaultType: a.default_type as EventType,
          defaultRule: a.default_rule as unknown as ScoringRule,
        })));
      } else {
        setActivities(activitiesData?.map(a => ({
          id: a.id,
          name: a.name,
          defaultType: a.default_type as EventType,
          defaultRule: a.default_rule as ScoringRule | undefined,
        })) ?? []);
      }

      // Fetch olympiads
      const { data: olympiadsData } = await supabase
        .from("olympiads")
        .select("*")
        .order("created_at", { ascending: false });
      
      const mappedOlympiads = olympiadsData?.map(o => ({
        id: o.id,
        title: o.title,
        createdAt: new Date(o.created_at).getTime(),
        playerIds: o.player_ids ?? [],
        eventInstances: (o.event_instances as unknown as EventInstance[]) ?? [],
      })) ?? [];
      
      setOlympiads(mappedOlympiads);
      
      // Set current olympiad
      const current = olympiadsData?.find(o => o.current);
      setCurrentOlympiadId(current?.id);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Player actions
  const addPlayer = async (name: string) => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newPlayer = { id: nanoid(8), user_id: user.id, name: trimmedName };
    const { error } = await supabase.from("players").insert(newPlayer);
    if (!error) {
      setPlayers(prev => [...prev, { id: newPlayer.id, name: newPlayer.name }]);
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
      default_rule: (defaultRule ?? { kind: "placement_table", table: [5, 3, 2, 1, 0] }) as unknown as Json,
    };

    const { error } = await supabase.from("activities").insert(newActivity);
    if (!error) {
      setActivities(prev => [...prev, {
        id: newActivity.id,
        name: newActivity.name,
        defaultType: newActivity.default_type as EventType,
        defaultRule: newActivity.default_rule as unknown as ScoringRule,
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
    if (!trimmedTitle || playerIds.length === 0) return "";

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
        title: newOlympiad.title,
        createdAt: Date.now(),
        playerIds: newOlympiad.player_ids,
        eventInstances: [],
      }, ...prev]);
      setCurrentOlympiadId(newOlympiad.id);
      return newOlympiad.id;
    }
    return "";
  };

  const removeOlympiad = async (id: ID) => {
    const { error } = await supabase.from("olympiads").delete().eq("id", id);
    if (!error) {
      setOlympiads(prev => prev.filter(o => o.id !== id));
      if (currentOlympiadId === id) {
        setCurrentOlympiadId(undefined);
      }
    }
  };

  const setCurrentOlympiad = async (id?: ID) => {
    if (!user) return;
    
    // Reset all current flags
    await supabase.from("olympiads").update({ current: false }).eq("user_id", user.id);
    
    if (id) {
      await supabase.from("olympiads").update({ current: true }).eq("id", id);
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

  const currentOlympiad = olympiads.find(o => o.id === currentOlympiadId);

  return {
    players,
    activities,
    olympiads,
    currentOlympiadId,
    currentOlympiad,
    loading,
    addPlayer,
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
    refetch: fetchData,
  };
}
