export type ID = string;

export type EventType = "classement" | "duel_1v1" | "equipe" | "score_num";

export type ScoringRule =
  | { kind: "placement_table"; table: number[] }
  | { kind: "per_win"; pointsPerPlayer: number }
  | { kind: "numeric_rank"; higherIsBetter: boolean; table: number[] };

export type Activity = {
  id: ID;
  name: string;
  defaultRule?: ScoringRule;
  defaultType: EventType;
  supportedTypes?: EventType[];
};

export type EventResult =
  | { kind: "classement"; order: ID[] }
  | { kind: "duel_1v1"; winner: ID; loser: ID }
  | { kind: "equipe"; winnerTeam: { players: ID[] }; loserTeam: { players: ID[] } }
  | { kind: "score_num"; entries: { playerId: ID; value: number }[] };

export type Match = {
  id: ID;
  createdAt: number;
  result: EventResult;
};

export type EventInstance = {
  id: ID;
  templateId: ID;
  name: string;
  type: EventType;
  rule: ScoringRule;
  teamSize?: number;
  matches: Match[];
};

export interface IPlayer {
  id: ID;
  name: string;
  userId: string;
  linkedUserId?: string | null;
}

export interface IOlympiad {
  id: ID;
  ownerId: string;
  title: string;
  createdAt: number;
  playerIds: ID[];
  eventInstances: EventInstance[];
}

export type OlympiadRole = "owner" | "editor" | "viewer";

export interface OlympiadMember {
  id: ID;
  olympiadId: ID;
  userId: string;
  role: OlympiadRole;
  displayName?: string | null;
}

export interface OlympiadInvite {
  id: ID;
  olympiadId: ID;
  olympiadTitle: string;
  invitedEmail: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export interface AppNotification {
  id: ID;
  title: string;
  body?: string | null;
  type: string;
  data?: Record<string, unknown> | null;
  createdAt: number;
  readAt?: number | null;
}

export interface IStoreState {
  players: IPlayer[];
  activities: Activity[];
  olympiads: IOlympiad[];
  currentOlympiadId?: ID;

  addPlayer: (name: string) => void;
  removePlayer: (id: ID) => void;

  addActivity: (name: string, defaultType: EventType, defaultRule?: ScoringRule) => void;
  removeActivity: (id: ID) => void;

  createOlympiad: (title: string, playerIds: ID[]) => ID;
  removeOlympiad: (id: ID) => void;
  setCurrentOlympiad: (id?: ID) => void;

  addEventInstance: (olympId: ID, cfg: {
    templateId: ID;
    name: string;
    type: EventType;
    rule: ScoringRule;
    teamSize?: number;
  }) => void;

  removeEventInstance: (olympId: ID, instanceId: ID) => void;

  addMatch: (olympId: ID, instanceId: ID, result: EventResult) => void;
  removeMatch: (olympId: ID, instanceId: ID, matchId: ID) => void;
}

// Helper types for UI
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  classement: "Classement",
  duel_1v1: "Duel 1v1",
  equipe: "Équipe",
  score_num: "Score numérique",
};

export const SCORING_RULE_LABELS = {
  placement_table: "Barème par place",
  per_win: "Points par victoire",
  numeric_rank: "Classement numérique",
} as const;
