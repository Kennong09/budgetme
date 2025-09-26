// Family related types and interfaces

export interface User {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Family {
  id: string;
  family_name: string;
  description?: string;
  currency_pref?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive' | 'removed';
  joined_at: string;
  created_at: string;
  updated_at: string;
  invited_by?: string;
  invited_at?: string;
  // Additional member permissions
  can_create_goals?: boolean;
  can_view_budgets?: boolean;
  can_contribute_goals?: boolean;
  // User profile data
  user?: User;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}
