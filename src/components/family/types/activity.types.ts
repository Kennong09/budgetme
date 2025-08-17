// Activity and UI related types and interfaces

export interface RecentActivity {
  id: string;
  type: "join" | "goal" | "transaction";
  description: string;
  amount?: number;
  date: string;
  user?: string;
  icon?: string;
}

export type TabType = "overview" | "members" | "activity" | "goals";

export interface PendingJoinRequestsProps {
  familyId: string;
}
