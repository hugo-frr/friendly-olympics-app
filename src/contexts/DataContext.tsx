import { createContext, useContext, ReactNode } from "react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type {
  IPlayer,
  Activity,
  IOlympiad,
  EventType,
  ScoringRule,
  EventResult,
  ID,
} from "@/lib/types";

interface DataContextValue {
  players: IPlayer[];
  activities: Activity[];
  olympiads: IOlympiad[];
  currentOlympiadId: ID | undefined;
  currentOlympiad: IOlympiad | undefined;
  loading: boolean;
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: ID) => Promise<void>;
  addActivity: (name: string, defaultType: EventType, defaultRule?: ScoringRule) => Promise<void>;
  removeActivity: (id: ID) => Promise<void>;
  createOlympiad: (title: string, playerIds: ID[]) => Promise<ID>;
  removeOlympiad: (id: ID) => Promise<void>;
  setCurrentOlympiad: (id?: ID) => Promise<void>;
  addEventInstance: (olympId: ID, cfg: {
    templateId: ID;
    name: string;
    type: EventType;
    rule: ScoringRule;
    teamSize?: number;
  }) => Promise<void>;
  removeEventInstance: (olympId: ID, instanceId: ID) => Promise<void>;
  addMatch: (olympId: ID, instanceId: ID, result: EventResult) => Promise<void>;
  removeMatch: (olympId: ID, instanceId: ID, matchId: ID) => Promise<void>;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const data = useSupabaseData();

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within DataProvider");
  }
  return context;
}
