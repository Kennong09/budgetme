import { useState, useEffect } from "react";
import { useAuth } from "../../../../utils/AuthContext";
import { getCurrentUserData } from "../../../../data/mockData";

export interface UserInfo {
  name: string;
  email: string;
  profilePicture?: string;
}

/**
 * Custom hook to manage user data across layout components
 * @returns UserInfo object with name, email, and profilePicture
 */
export const useUserData = (): UserInfo => {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    email: "",
    profilePicture: "../images/placeholder.png"
  });

  useEffect(() => {
    loadUserData();
  }, [user]); // Re-run when auth user changes
  
  const loadUserData = () => {
    // Check if user is authenticated first
    if (!user) {
      // If not authenticated, clear user info
      setUserInfo({
        name: "",
        email: "",
        profilePicture: "../images/placeholder.png"
      });
      return;
    }
    
    // Use auth user data if available
    if (user) {
      const userData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
        email: user.email || "user@example.com",
        profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png"
      };
      setUserInfo(userData);
      return;
    }
    
    // Fallback to mock data only if authenticated but missing details
    const userData = getCurrentUserData();
    if (userData && userData.user) {
      // Cast userData.user to any to avoid type errors with properties
      const mockUser = userData.user as any;
      setUserInfo({
        name: mockUser.name || mockUser.full_name || mockUser.username || "User",
        email: mockUser.email || "user@example.com",
        profilePicture: mockUser.profilePicture || mockUser.avatar || "../images/placeholder.png"
      });
    }
  };

  return userInfo;
};

export default useUserData;