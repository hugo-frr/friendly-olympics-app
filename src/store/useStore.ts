import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  IStoreState,
  IPlayer,
  Activity,
  IOlympiad,
  EventInstance,
  EventResult,
  Match,
  EventType,
  ScoringRule,
  ID,
} from "@/lib/types";

// Default activities for quick start
const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "act-babyfoot",
    name: "Babyfoot",
    defaultType: "duel_1v1",
    defaultRule: { kind: "per_win", pointsPerPlayer: 3 },
  },
  {
    id: "act-flechettes",
    name: "Fléchettes",
    defaultType: "classement",
    defaultRule: { kind: "placement_table", table: [5, 3, 2, 1, 0] },
  },
  {
    id: "act-volley",
    name: "Volley",
    defaultType: "equipe",
    defaultRule: { kind: "per_win", pointsPerPlayer: 4 },
  },
  {
    id: "act-course",
    name: "Course",
    defaultType: "classement",
    defaultRule: { kind: "placement_table", table: [10, 7, 5, 3, 2, 1] },
  },
  {
    id: "act-petanque",
    name: "Pétanque",
    defaultType: "equipe",
    defaultRule: { kind: "per_win", pointsPerPlayer: 3 },
  },
];

export const useStore = create<IStoreState>()(
  persist(
    (set, get) => ({
      players: [],
      activities: DEFAULT_ACTIVITIES,
      olympiads: [],
      currentOlympiadId: undefined,

      addPlayer: (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;
        
        const newPlayer: IPlayer = {
          id: nanoid(8),
          name: trimmedName,
          userId: "local",
        };
        
        set((state) => ({
          players: [...state.players, newPlayer],
        }));
      },

      removePlayer: (id: ID) => {
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
        }));
      },

      addActivity: (name: string, defaultType: EventType, defaultRule?: ScoringRule) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const newActivity: Activity = {
          id: nanoid(8),
          name: trimmedName,
          defaultType,
          defaultRule: defaultRule ?? { kind: "placement_table", table: [5, 3, 2, 1, 0] },
        };

        set((state) => ({
          activities: [...state.activities, newActivity],
        }));
      },

      removeActivity: (id: ID) => {
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
        }));
      },

      createOlympiad: (title: string, playerIds: ID[]): ID => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || playerIds.length === 0) return "";

        const newOlympiad: IOlympiad = {
          id: nanoid(8),
          title: trimmedTitle,
          createdAt: Date.now(),
          playerIds,
          eventInstances: [],
        };

        set((state) => ({
          olympiads: [...state.olympiads, newOlympiad],
          currentOlympiadId: newOlympiad.id,
        }));

        return newOlympiad.id;
      },

      removeOlympiad: (id: ID) => {
        set((state) => ({
          olympiads: state.olympiads.filter((o) => o.id !== id),
          currentOlympiadId: state.currentOlympiadId === id ? undefined : state.currentOlympiadId,
        }));
      },

      setCurrentOlympiad: (id?: ID) => {
        set({ currentOlympiadId: id });
      },

      addEventInstance: (olympId: ID, cfg) => {
        set((state) => ({
          olympiads: state.olympiads.map((olymp) => {
            if (olymp.id !== olympId) return olymp;

            const newInstance: EventInstance = {
              id: nanoid(8),
              templateId: cfg.templateId,
              name: cfg.name,
              type: cfg.type,
              rule: cfg.rule,
              teamSize: cfg.teamSize,
              matches: [],
            };

            return {
              ...olymp,
              eventInstances: [...olymp.eventInstances, newInstance],
            };
          }),
        }));
      },

      removeEventInstance: (olympId: ID, instanceId: ID) => {
        set((state) => ({
          olympiads: state.olympiads.map((olymp) => {
            if (olymp.id !== olympId) return olymp;
            return {
              ...olymp,
              eventInstances: olymp.eventInstances.filter((e) => e.id !== instanceId),
            };
          }),
        }));
      },

      addMatch: (olympId: ID, instanceId: ID, result: EventResult) => {
        const newMatch: Match = {
          id: nanoid(8),
          createdAt: Date.now(),
          result,
        };

        set((state) => ({
          olympiads: state.olympiads.map((olymp) => {
            if (olymp.id !== olympId) return olymp;
            return {
              ...olymp,
              eventInstances: olymp.eventInstances.map((event) => {
                if (event.id !== instanceId) return event;
                return {
                  ...event,
                  matches: [...event.matches, newMatch],
                };
              }),
            };
          }),
        }));
      },

      removeMatch: (olympId: ID, instanceId: ID, matchId: ID) => {
        set((state) => ({
          olympiads: state.olympiads.map((olymp) => {
            if (olymp.id !== olympId) return olymp;
            return {
              ...olymp,
              eventInstances: olymp.eventInstances.map((event) => {
                if (event.id !== instanceId) return event;
                return {
                  ...event,
                  matches: event.matches.filter((m) => m.id !== matchId),
                };
              }),
            };
          }),
        }));
      },
    }),
    {
      name: "olympiades-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks for convenience
export const useCurrentOlympiad = () => {
  const olympiads = useStore((s) => s.olympiads);
  const currentId = useStore((s) => s.currentOlympiadId);
  return olympiads.find((o) => o.id === currentId);
};

export const usePlayerById = (id: ID) => {
  return useStore((s) => s.players.find((p) => p.id === id));
};

export const usePlayersMap = () => {
  const players = useStore((s) => s.players);
  return new Map(players.map((p) => [p.id, p]));
};
