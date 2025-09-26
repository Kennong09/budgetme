// Goal related types and interfaces

export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  target_date?: string; // Alternative to deadline
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  progress_status?: 'good' | 'average' | 'poor';
  owner_name?: string;
  created_at: string;
  updated_at?: string;
  is_family_goal?: boolean;
  family_id?: string;
  // Computed fields
  percentage: number;
  remaining: number;
  daysLeft: number;
  monthlyTarget: number;
  weeklyTarget: number;
  dailyTarget: number;
  progressColor?: string;
  shared_by?: string; // ID of user who shared the goal
  shared_by_name?: string; // Name of user who shared the goal
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface Contributor {
  user_id: string;
  username: string;
  avatar_url?: string;
  amount: number;
}
