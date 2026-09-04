export interface JournalMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  mode?: "reflection" | "summary" | "brainstorm" | "action_items";
  modelUsed?: string;
}

export type MemoryCategory =
  | "Achievement"
  | "Decision"
  | "Person"
  | "Place"
  | "Challenge"
  | "Goal"
  | "Idea"
  | "Milestone";

export interface DecisionTracking {
  isDecision: boolean;
  stage: "considering" | "decided" | "outcome" | "reflection";
  decisionText?: string;
  outcomeText?: string;
  linkedDecisionId?: string; // Links related subsequent reflections to this decision
}

export interface EntryLocation {
  name: string; // User-defined label or place name, e.g. "Kyoto - Kamo River", "Home Studio", "Corner Cafe"
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  messages: JournalMessage[];
  sentimentScore?: number;
  sentimentLabel?: string;
  // Personal Memory Mirror fields
  location?: EntryLocation;
  isImportant?: boolean;
  importanceCategory?: MemoryCategory;
  decision?: DecisionTracking;
}

export interface FutureLetter {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  deliverAt: string; // ISO date string in future
  isRead?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type ReflectionMode = "reflection" | "summary" | "brainstorm" | "action_items";

export type ActiveView =
  | "journal"
  | "memory_mirror"
  | "ask_memory"
  | "pattern_radar"
  | "memory_map"
  | "reflection_replay"
  | "decisions"
  | "future_me"
  | "important"
  | "important_memories"
  | "constellation"
  | "semantic_search"
  | "privacy"
  | "privacy_center";

export interface MemoryQueryResult {
  answer: string;
  fromYourMemories?: string;
  possiblePattern?: string;
  hasSufficientEvidence?: boolean;
  insufficientEvidenceNote?: string;
  relevantEntryIds: string[];
  insights: string[];
  modelUsed?: string;
}

