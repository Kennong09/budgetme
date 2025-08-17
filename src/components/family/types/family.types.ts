// Family related types and interfaces

export interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    username?: string;
    name?: string;
    phone_number?: string;
  };
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
  role: 'admin' | 'viewer';
  joined_at: string;
  invited_by?: string;
  is_active?: boolean;
  user?: User;
}
