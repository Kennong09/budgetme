import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { Family, FamilyMember, FamilyStats, FamilyUser, FamilyFilters, UserProfile } from "./types";
import { RealtimeChannel } from "@supabase/supabase-js";

export const useFamilyData = () => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [users, setUsers] = useState<FamilyUser[]>([]);
  const [stats, setStats] = useState<FamilyStats>({
    totalFamilies: 0,
    activeFamilies: 0,
    totalMembers: 0,
    avgMembersPerFamily: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const [subscription, setSubscription] = useState<any>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  // Fetch user profiles for quick lookup (matching transactions/users pattern)
  const fetchUserProfiles = useCallback(async () => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      // Fetch users from auth - this is the primary source like in transactions/users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      
      if (authError) throw authError;
      
      // Create a map of user profiles by ID for quick access
      const profilesMap: {[key: string]: UserProfile} = {};
      
      // Process auth users data (matching transactions pattern exactly)
      authData?.users?.forEach((user: any) => {
        const userMeta = user.user_metadata || {};
        
        // Get best available name (same logic as transactions)
        const bestName = userMeta.full_name || 
                        userMeta.name || 
                        (userMeta.first_name && userMeta.last_name ? 
                         `${userMeta.first_name} ${userMeta.last_name}` : null) ||
                        user.email?.split('@')[0] || 
                        'Unknown User';
        
        // Avatar fetching (same as transactions) 
        const bestAvatar = userMeta.avatar_url || userMeta.picture || "../images/placeholder.png";
        
        profilesMap[user.id] = {
          id: user.id,
          full_name: bestName,
          email: user.email || 'No Email',
          avatar_url: bestAvatar
        };
      });
      
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      showErrorToast("Failed to load user data");
    }
  }, [showErrorToast]);

  // Fetch users from Supabase Auth (matching transaction pattern exactly)
  const fetchUsers = useCallback(async () => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }
      
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (error) throw error;

      // Format exactly like transactions AddTransactionModal
      const formattedUsers = (data?.users || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata || {}
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast("Failed to load users");
    }
  }, [showErrorToast]);

  // Load user profiles and users on mount
  useEffect(() => {
    fetchUserProfiles();
    fetchUsers();
  }, [fetchUserProfiles, fetchUsers]);

  // Auto-refresh families when user profiles are loaded to update owner info
  useEffect(() => {
    if (Object.keys(userProfiles).length > 0 && families.length > 0) {
      // Re-process families with updated user profiles
      setFamilies(prevFamilies => 
        prevFamilies.map(family => ({
          ...family,
          owner: userProfiles[family.created_by] || family.owner
        }))
      );
    }
  }, [userProfiles]); // Only depend on userProfiles, not families to avoid infinite loop

  // Calculate summary statistics
  const calculateStats = useCallback((familyData: Family[]) => {
    const activeFamilies = familyData.filter(family => family.status === 'active').length;
    const totalMembers = familyData.reduce((sum, family) => sum + (family.members_count || 0), 0);
    
    setStats({
      totalFamilies: familyData.length,
      activeFamilies,
      totalMembers,
      avgMembersPerFamily: familyData.length > 0 ? totalMembers / familyData.length : 0,
    });
  }, []);

  // Apply filters to query
  const applyFiltersToQuery = useCallback((query: any, filters: FamilyFilters) => {
    // Filter by name (search)
    if (filters.name) {
      query = query.ilike('family_name', `%${filters.name}%`);
    }
    
    // Note: Status filtering and member count filtering will be handled client-side
    // to prevent 400 errors if columns don't exist in the schema
    
    return query;
  }, []);

  // Fetch families from Supabase
  const fetchFamilies = useCallback(async (filters: FamilyFilters) => {
    try {
      setLoading(true);
      
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      // User profiles will be used if available, but don't block family loading
      
      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('families')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      countQuery = applyFiltersToQuery(countQuery, filters);
      
      // Get total count with filters applied
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      // Construct query for families with all data
      let dataQuery = supabaseAdmin
        .from('families')
        .select('id, family_name, description, created_by, created_at, updated_at, currency_pref, is_public, status');
      
      // Apply sorting
      if (filters.sortBy === "name") {
        dataQuery = dataQuery.order('family_name', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy !== "members") { // Handle members sorting separately
        dataQuery = dataQuery.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      }
      
      // Apply same filters to main query
      dataQuery = applyFiltersToQuery(dataQuery, filters);
      
      // Apply pagination
      const from = (filters.currentPage - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      
      // Final query with pagination
      const { data: familiesData, error: familiesError } = await dataQuery
        .range(from, to);
      
      if (familiesError) throw familiesError;
      
      if (!familiesData) {
        setFamilies([]);
        setTotalItems(0);
        setTotalPages(1);
        calculateStats([]);
        setLoading(false);
        return;
      }
      
      // Get member counts for each family
      const familyIds = familiesData.map(family => family.id);
      
      // Create a map of member counts by family ID
      const memberCountMap: {[key: string]: number} = {};
      
      // Fetch member counts for each family separately
      await Promise.all(
        familyIds.map(async (familyId) => {
          try {
            const { count, error } = await supabaseAdmin
              .from('family_members')
              .select('*', { count: 'exact', head: true })
              .eq('family_id', familyId)
              .eq('status', 'active');
              
            if (!error && count !== null) {
              memberCountMap[familyId] = count;
            }
          } catch (err) {
            console.warn(`Error getting count for family ${familyId}:`, err);
          }
        })
      );
      
      // Process families and add owner info + member counts
      const processedFamilies: Family[] = await Promise.all(familiesData.map(async (family: any) => {
        // Get creator profile from current userProfiles state
        let creatorProfile = userProfiles[family.created_by];
        
        // If not in userProfiles, try to fetch from auth admin
        if (!creatorProfile && supabaseAdmin) {
          try {
            const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(family.created_by);
            if (!error && authUser?.user) {
              const userMeta = authUser.user.user_metadata || {};
              creatorProfile = {
                id: authUser.user.id,
                full_name: userMeta.full_name || userMeta.name || authUser.user.email?.split('@')[0] || 'Unknown Owner',
                email: authUser.user.email || 'No email',
                avatar_url: userMeta.avatar_url || userMeta.picture || "../images/placeholder.png"
              };
            }
          } catch (err) {
            console.warn(`Error fetching owner for family ${family.id}:`, err);
          }
        }
        
        // If still no profile, try profiles table as fallback
        if (!creatorProfile && supabaseAdmin) {
          try {
            const { data: profileData, error } = await supabaseAdmin
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', family.created_by)
              .single();
            
            if (!error && profileData) {
              creatorProfile = {
                id: profileData.id,
                full_name: profileData.full_name || 'Unknown Owner',
                email: profileData.email || 'No email',
                avatar_url: profileData.avatar_url || "../images/placeholder.png"
              };
            }
          } catch (err) {
            console.warn(`Error fetching profile for family ${family.id}:`, err);
          }
        }
        
        // Create fallback profile if creator not found anywhere
        const ownerProfile = creatorProfile || {
          id: family.created_by,
          full_name: 'Unknown Owner',
          email: 'No email',
          avatar_url: "../images/placeholder.png"
        };
        
        return {
          id: family.id,
          family_name: family.family_name,
          description: family.description,
          created_by: family.created_by,
          created_at: family.created_at,
          updated_at: family.updated_at,
          currency_pref: family.currency_pref || 'PHP',
          is_public: family.is_public !== undefined ? family.is_public : false,
          status: family.status || 'active',
          members_count: memberCountMap[family.id] || 0,
          owner: ownerProfile
        };
      }));
      
      // Apply client-side filtering for fields that might not exist in schema
      let filteredFamilies = [...processedFamilies];
      
      // Apply status filtering client-side
      if (filters.status !== "all") {
        filteredFamilies = filteredFamilies.filter(family => 
          family.status === filters.status
        );
      }
      
      // Apply member count filtering
      if (filters.minMembers) {
        const minMembers = parseInt(filters.minMembers);
        filteredFamilies = filteredFamilies.filter(family => 
          (family.members_count || 0) >= minMembers
        );
      }
      
      if (filters.maxMembers) {
        const maxMembers = parseInt(filters.maxMembers);
        filteredFamilies = filteredFamilies.filter(family => 
          (family.members_count || 0) <= maxMembers
        );
      }
      
      // Apply member count sorting if selected
      if (filters.sortBy === "members") {
        filteredFamilies = filteredFamilies.sort((a, b) => {
          const countA = a.members_count || 0;
          const countB = b.members_count || 0;
          return filters.sortOrder === 'asc' ? countA - countB : countB - countA;
        });
      }
      
      // Set families data
      setFamilies(filteredFamilies);
      
      // Calculate summary data
      calculateStats(filteredFamilies);
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.max(1, Math.ceil((totalCount || 0) / filters.pageSize)));
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching families:", error);
      showErrorToast("Failed to load family data");
      setLoading(false);
    }
  }, [applyFiltersToQuery, calculateStats, showErrorToast]);

  // Refresh family data
  const refreshFamilyData = useCallback(async (filters: FamilyFilters) => {
    setRefreshing(true);
    try {
      await fetchUserProfiles(); // Ensure profiles are fresh first
      await fetchUsers();
      await fetchFamilies(filters);
      showSuccessToast("Family data refreshed successfully");
    } catch (error: any) {
      showErrorToast("Failed to refresh family data");
      console.error("Error refreshing family data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUserProfiles, fetchUsers, fetchFamilies, showSuccessToast, showErrorToast]);

  // Delete family
  const deleteFamily = useCallback(async (familyId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      const { error } = await supabaseAdmin
        .from("families")
        .delete()
        .eq("id", familyId);

      if (error) throw error;

      // Update local state
      setFamilies(prev => prev.filter(family => family.id !== familyId));
      
      showSuccessToast("Family deleted successfully!");
      return true;
    } catch (error: any) {
      console.error("Error deleting family:", error);
      showErrorToast("Failed to delete family");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Get family members
  const getFamilyMembers = useCallback(async (familyId: string): Promise<FamilyMember[]> => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      // First fetch the family members
      const { data: membersData, error: membersError } = await supabaseAdmin
        .from("family_members")
        .select("*")
        .eq("family_id", familyId)
        .eq("status", "active")
        .order("role", { ascending: false })
        .order("created_at", { ascending: true });
      
      if (membersError) throw membersError;
      
      if (!membersData || membersData.length === 0) {
        return [];
      }
      
      // Get all user IDs to fetch their profiles
      const userIds = membersData.map(member => member.user_id);
      
      // Create a map of profiles by user ID
      const profileMap: {[key: string]: UserProfile} = {};
      
      // Fetch user profiles from auth admin (primary source)
      await Promise.all(userIds.map(async (userId) => {
        try {
          const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!error && authUser?.user) {
            const userMeta = authUser.user.user_metadata || {};
            profileMap[userId] = {
              id: authUser.user.id,
              full_name: userMeta.full_name || userMeta.name || authUser.user.email?.split('@')[0] || 'Unknown User',
              email: authUser.user.email || 'No Email',
              avatar_url: userMeta.avatar_url || userMeta.picture || "../images/placeholder.png"
            };
          }
        } catch (err) {
          console.warn(`Error fetching auth user ${userId}:`, err);
        }
      }));
      
      // Fallback: fetch from profiles table for any missing users
      const missingUserIds = userIds.filter(id => !profileMap[id]);
      if (missingUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", missingUserIds);
        
        if (!profilesError && profilesData) {
          profilesData.forEach(profile => {
            profileMap[profile.id] = {
              id: profile.id,
              full_name: profile.full_name || 'Unknown User',
              email: profile.email || 'No Email',
              avatar_url: profile.avatar_url || "../images/placeholder.png"
            };
          });
        }
      }
      
      // Combine member data with user profiles
      return membersData.map(member => ({
        ...member,
        user: profileMap[member.user_id] || {
          id: member.user_id,
          full_name: 'Unknown User',
          email: 'No Email',
          avatar_url: "../images/placeholder.png"
        }
      }));
    } catch (error: any) {
      console.error("Error fetching family members:", error);
      showErrorToast("Failed to fetch family members");
      return [];
    }
  }, [showErrorToast]);

  // Remove family member
  const removeFamilyMember = useCallback(async (memberId: string, familyId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      const { error } = await supabaseAdmin
        .from('family_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      showSuccessToast("Family member removed successfully");
      return true;
    } catch (error: any) {
      console.error("Error removing family member:", error);
      showErrorToast("Failed to remove family member");
      return false;
    }
  }, [showSuccessToast, showErrorToast]);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        return;
      }
      
      channel = supabaseAdmin.channel('admin-families-channel');
      
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'families' }, 
          () => {
            // Real-time update will be handled by the component
          }
        )
        .subscribe();
      
      setSubscription(channel);
    } catch (error) {
      console.error("Error setting up real-time subscriptions:", error);
    }
    
    // Cleanup function
    return () => {
      if (channel && supabaseAdmin) {
        try {
          supabaseAdmin.removeChannel(channel);
        } catch (cleanupError) {
          console.error("Error cleaning up channel:", cleanupError);
        }
      }
    };
  }, []);

  // Clean up subscription when component unmounts
  useEffect(() => {
    return () => {
      if (subscription && supabaseAdmin) {
        try {
          supabaseAdmin.removeChannel(subscription);
        } catch (error) {
          console.error("Error removing channel on unmount:", error);
        }
      }
    };
  }, [subscription]);

  return {
    families,
    users,
    stats,
    loading,
    refreshing,
    totalPages,
    totalItems,
    userProfiles,
    fetchFamilies,
    fetchUsers,
    refreshFamilyData,
    deleteFamily,
    getFamilyMembers,
    removeFamilyMember,
  };
};
