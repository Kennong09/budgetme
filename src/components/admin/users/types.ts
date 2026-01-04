// Shared interface for user data across admin components
export interface User {
  // Database fields from admin_user_overview
  id: string;
  email: string;
  created_at: string;
  role: string;
  full_name?: string;
  is_active: boolean;
  last_login?: string | null;
  email_verified: boolean;
  total_sessions?: number;
  active_sessions?: number;
  last_session_login?: string | null;
  
  // Computed/mapped properties for UI compatibility  
  status?: "active" | "inactive" | "suspended";
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned?: boolean;
}
