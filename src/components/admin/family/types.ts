// Types for Family Management Admin Components

// User profile interface for consistency with other admin components
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

// Main family interface matching the existing schema
export interface Family {
  id: string;
  family_name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  currency_pref: string;
  is_public: boolean;
  status: "active" | "inactive";
  members_count: number;
  owner?: UserProfile;
}

// Family member interface
export interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: "admin" | "viewer";
  status: "active" | "pending" | "inactive";
  created_at: string;
  updated_at?: string;
  user?: UserProfile;
}

// Statistics for the family dashboard
export interface FamilyStats {
  totalFamilies: number;
  activeFamilies: number;
  totalMembers: number;
  avgMembersPerFamily: number;
}

// Filter interface for family management
export interface FamilyFilters {
  name: string;
  status: string;
  minMembers: string;
  maxMembers: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  currentPage: number;
  pageSize: number;
}

// Raw family data from Supabase (for internal use)
export interface SupabaseFamily {
  id: string;
  family_name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  currency_pref: string;
  is_public?: boolean;
  status?: "active" | "inactive";
}

// User data structure for API responses
export interface FamilyUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Form data interfaces for modals
export interface AddFamilyFormData {
  family_name: string;
  description: string;
  currency_pref: string;
  is_public: boolean;
}

export interface EditFamilyFormData extends AddFamilyFormData {
  id: string;
  status: "active" | "inactive";
}
