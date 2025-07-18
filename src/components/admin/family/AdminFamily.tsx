import React, { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
} from "../../../utils/helpers";
import { supabase, supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { RealtimeChannel } from "@supabase/supabase-js";

// Import any necessary CSS
import "../admin.css";

// Interface for Supabase user profile
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

// Interface for Supabase family group
interface SupabaseFamily {
  id: string;
  family_name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  currency_pref: string;
  is_public: boolean;
  status: "active" | "inactive";
  members_count?: number;
  owner?: UserProfile;
}

// Interface for family member
interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: "admin" | "viewer";
  status: "active" | "pending" | "inactive";
  created_at: string;
  updated_at?: string;
  user?: UserProfile;
}

const AdminFamily: React.FC = () => {
  // State for family groups data
  const [familyGroups, setFamilyGroups] = useState<SupabaseFamily[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<SupabaseFamily[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<FamilyMember[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const { showSuccessToast, showErrorToast } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  // Real-time subscription state
  const [subscription, setSubscription] = useState<any>(null);
  
  // User profiles map for quick lookup
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});

  // State for summary data
  const [summary, setSummary] = useState({
    totalFamilies: 0,
    activeFamilies: 0,
    totalMembers: 0,
    avgMembersPerFamily: 0,
  });

  // Set up filter state
  const [filter, setFilter] = useState({
    name: "",
    status: "all",
    minMembers: "",
    maxMembers: "",
    sortBy: "created_at",
    sortOrder: "desc" as "asc" | "desc"
  });

  // Fetch families on component mount and when filters change
  useEffect(() => {
    fetchFamilies();
    fetchUserProfiles();
  }, [currentPage, filter.name, filter.status, filter.minMembers, filter.maxMembers, filter.sortBy, filter.sortOrder, pageSize]);

  // Set up real-time subscription
  useEffect(() => {
    // Create channel reference outside to ensure we can clean it up
    let channel: RealtimeChannel | undefined;
    
    try {
      channel = supabaseAdmin.channel('admin-families-channel');
      
      // Set up the subscription
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'families' }, 
          () => {
            // Refresh family data when families table changes
            fetchFamilies();
          }
        )
        .subscribe();
      
      // Store subscription reference
      setSubscription(channel);
    } catch (error: any) {
      console.error('Error setting up real-time subscription:', error);
      // Don't let subscription errors block the UI
    }
    
    // Cleanup subscription on component unmount
    return () => {
      if (channel) {
        try {
          supabaseAdmin.removeChannel(channel);
        } catch (error: any) {
          console.error('Error removing channel:', error);
        }
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Fetch user profiles
  const fetchUserProfiles = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, avatar_url');
      
      if (error) {
        throw error;
      }
      
      // Create a map of user profiles by ID for quick access
      const profilesMap: {[key: string]: UserProfile} = {};
      data?.forEach(profile => {
        profilesMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || 'No Email',
          avatar_url: profile.avatar_url
        };
      });
      
      setUserProfiles(profilesMap);
    } catch (error: any) {
      console.error("Error fetching user profiles:", error);
      showErrorToast("Failed to load user data");
    }
  };

  // Fetch families from Supabase
  const fetchFamilies = async () => {
    try {
      setLoading(true);
      
      // Base query for counting total items
      let countQuery = supabaseAdmin
        .from('families')
        .select('id', { count: 'exact' });
      
      // Apply filters for count query
      applyFiltersToQuery(countQuery);
      
      // Get total count with filters applied
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }
      
      // Construct query for families with all data
      // Use a simpler query first to avoid 400 errors if schema is incomplete
      let dataQuery = supabaseAdmin
        .from('families')
        .select('id, family_name, description, created_by, created_at, updated_at, currency_pref');
      
      // Apply sorting
      if (filter.sortBy === "name") {
        dataQuery = dataQuery.order('family_name', { ascending: filter.sortOrder === 'asc' });
      } else if (filter.sortBy !== "members") { // Handle members sorting separately
        dataQuery = dataQuery.order(filter.sortBy, { ascending: filter.sortOrder === 'asc' });
      }
      
      // Apply same filters to main query
      applyFiltersToQuery(dataQuery);
      
      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Final query with pagination
      const { data: familiesData, error: familiesError } = await dataQuery
        .range(from, to);
      
      if (familiesError) {
        throw familiesError;
      }
      
      if (!familiesData) {
        setFamilyGroups([]);
        setFilteredGroups([]);
        setTotalItems(0);
        setTotalPages(1);
        calculateSummary([]);
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
      
      // Define a type for the raw family data from Supabase
      type RawFamilyData = {
        id: string;
        family_name: string;
        description?: string;
        created_by: string;
        created_at: string;
        updated_at?: string;
        currency_pref: string;
        is_public?: boolean;
        status?: "active" | "inactive";
      };
      
      // Add creator info and member counts to families
      const processedFamilies = await Promise.all(familiesData.map(async (family) => {
        // Get creator profile
        const creatorProfile = userProfiles[family.created_by];
        
        // Cast family to the right type for proper property access
        const typedFamily = family as RawFamilyData;
        
        // Create a properly typed family object with all required properties
        return {
          ...typedFamily,
          // Add default values for potentially missing columns
          is_public: typedFamily.is_public !== undefined ? typedFamily.is_public : false,
          status: typedFamily.status || 'active',
          members_count: memberCountMap[typedFamily.id] || 0,
          owner: creatorProfile
        } as SupabaseFamily;
      }));
      
      // Apply member count filtering here (client-side)
      let filteredFamilies = [...processedFamilies];
      
      // Apply status filtering client-side since the column might be missing
      if (filter.status !== "all") {
        filteredFamilies = filteredFamilies.filter(family => 
          family.status === filter.status
        );
      }
      
      if (filter.minMembers) {
        const minMembers = parseInt(filter.minMembers);
        filteredFamilies = filteredFamilies.filter(family => 
          (family.members_count || 0) >= minMembers
        );
      }
      
      if (filter.maxMembers) {
        const maxMembers = parseInt(filter.maxMembers);
        filteredFamilies = filteredFamilies.filter(family => 
          (family.members_count || 0) <= maxMembers
        );
      }
      
      // Apply member count sorting if selected
      if (filter.sortBy === "members") {
        filteredFamilies = filteredFamilies.sort((a, b) => {
          const countA = a.members_count || 0;
          const countB = b.members_count || 0;
          return filter.sortOrder === 'asc' ? countA - countB : countB - countA;
        });
      }
      
      // Set families data
      setFamilyGroups(filteredFamilies);
      setFilteredGroups(filteredFamilies);
      
      // Calculate summary data
      calculateSummary(filteredFamilies);
      
      // Calculate pagination
      setTotalItems(totalCount || 0);
      setTotalPages(Math.max(1, Math.ceil((totalCount || 0) / pageSize)));
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching families:", error);
      showErrorToast("Failed to load family data");
      setLoading(false);
    }
  };
  
  // Helper function to apply filters to a query
  const applyFiltersToQuery = (query: any) => {
    // Filter by name (search)
    if (filter.name) {
      query = query.ilike('family_name', `%${filter.name}%`);
    }
    
    // Don't filter by status on server side anymore since we handle it client-side
    // This prevents 400 errors if the status column doesn't exist
    
    // Note: Member count filtering is handled client-side after fetching data
    // since it requires a join or separate query
    
    return query;
  };

  // Function to calculate family groups summary
  const calculateSummary = (groups: SupabaseFamily[]) => {
    const activeFamilies = groups.filter(group => group.status === 'active').length;
    const totalMembers = groups.reduce((sum, group) => sum + (group.members_count || 0), 0);
    
    setSummary({
      totalFamilies: groups.length,
      activeFamilies,
      totalMembers,
      avgMembersPerFamily: groups.length > 0 ? totalMembers / groups.length : 0,
    });
  };

  // Apply filters when filter state changes
  useEffect(() => {
    if (familyGroups.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    setTimeout(() => {
      let result = [...familyGroups];
      
      // Filter by name
      if (filter.name) {
        const searchTerm = filter.name.toLowerCase();
        result = result.filter(group => 
          group.family_name.toLowerCase().includes(searchTerm) || 
          (group.owner?.full_name?.toLowerCase() || '').includes(searchTerm)
        );
      }
      
      // Filter by status
      if (filter.status !== "all") {
        result = result.filter(group => group.status === filter.status);
      }
      
      // Filter by min members
      if (filter.minMembers) {
        result = result.filter(group => (group.members_count || 0) >= parseInt(filter.minMembers));
      }
      
      // Filter by max members
      if (filter.maxMembers) {
        result = result.filter(group => (group.members_count || 0) <= parseInt(filter.maxMembers));
      }
      
      // Sort results
      result = sortFamilyGroups(result, filter.sortBy, filter.sortOrder);
      
      setFilteredGroups(result);
      calculateSummary(result);
      setIsFiltering(false);
    }, 300);
  }, [filter, familyGroups]);

  // Function to sort family groups
  const sortFamilyGroups = (groupsToSort: SupabaseFamily[], sortBy: string, sortOrder: "asc" | "desc"): SupabaseFamily[] => {
    return [...groupsToSort].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      if (sortBy === "created_at") {
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.family_name.localeCompare(b.family_name) : b.family_name.localeCompare(a.family_name);
      }
      if (sortBy === "members") {
        return sortOrder === "asc" ? (a.members_count || 0) - (b.members_count || 0) : (b.members_count || 0) - (a.members_count || 0);
      }
      return 0;
    });
  };

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset to first page when filtering
    setCurrentPage(1);
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      name: "",
      status: "all",
      minMembers: "",
      maxMembers: "",
      sortBy: "created_at",
      sortOrder: "desc"
    });
    
    // Reset to first page
    setCurrentPage(1);
  };

  // Handle family group deletion
  const handleDeleteClick = (familyId: string): void => {
    setSelectedFamilyId(familyId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (selectedFamilyId) {
      try {
        const { error } = await supabaseAdmin
          .from("families")
          .delete()
          .eq("id", selectedFamilyId);

        if (error) {
          showErrorToast(`Failed to delete family group: ${error.message}`);
          return;
        }

        showSuccessToast("Family group deleted successfully!");
      
      // Filter out the deleted family group
      const updatedGroups = familyGroups.filter(group => group.id !== selectedFamilyId);
      setFamilyGroups(updatedGroups);
      setFilteredGroups(filteredGroups.filter(group => group.id !== selectedFamilyId));
      calculateSummary(updatedGroups);
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedFamilyId(null);
      } catch (error: any) {
        console.error("Error deleting family group:", error);
        showErrorToast("Failed to delete family group");
      }
    }
  };

  // Handle viewing family members
  const handleViewMembers = async (familyId: string): Promise<void> => {
    setSelectedFamilyId(familyId);
    
    try {
      // First fetch the family members
      const { data: membersData, error: membersError } = await supabaseAdmin
        .from("family_members")
        .select("*")
        .eq("family_id", familyId)
        .eq("status", "active") // Only active members
        .order("role", { ascending: false }) // Sort by role (admin first)
        .order("created_at", { ascending: true }); // Then by join date
      
      if (membersError) {
        showErrorToast("Failed to fetch family members");
        console.error("Error fetching family members:", membersError);
        return;
      }
      
      if (!membersData || membersData.length === 0) {
        setSelectedFamilyMembers([]);
        setShowMembersModal(true);
        return;
      }
      
      // Get all user IDs to fetch their profiles
      const userIds = membersData.map(member => member.user_id);
      
      // Fetch user profiles for these members
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      
      if (profilesError) {
        console.warn("Error fetching member profiles:", profilesError);
        // Continue with limited data
      }
      
      // Create a map of profiles by user ID
      const profileMap: {[key: string]: UserProfile} = {};
      profilesData?.forEach(profile => {
        profileMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || 'No Email',
          avatar_url: profile.avatar_url
        };
      });
      
      // Combine member data with user profiles
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        user: profileMap[member.user_id] || undefined
      }));
      
      setSelectedFamilyMembers(membersWithProfiles);
    setShowMembersModal(true);
    } catch (error: any) {
      showErrorToast("Failed to fetch family members");
      console.error("Error in handleViewMembers:", error);
    }
  };

  // Get family group by ID
  const getSelectedFamily = (): SupabaseFamily | undefined => {
    return familyGroups.find(group => group.id === selectedFamilyId);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Manual refresh function
  const refreshFamilyData = async () => {
    setLoading(true);
    try {
      await fetchFamilies();
      await fetchUserProfiles();
      showSuccessToast("Family data refreshed successfully");
    } catch (error: any) {
      showErrorToast("Failed to refresh family data");
      console.error("Error refreshing family data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a family member
  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!selectedFamilyId) return;
    
    try {
      // Delete the family member record
      const { error } = await supabaseAdmin
        .from('family_members')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        console.error("Error removing family member:", error);
        showErrorToast("Failed to remove family member");
        return;
      }
      
      // Update the local state
      setSelectedFamilyMembers(prev => prev.filter(member => member.id !== memberId));
      
      // Show success message
      showSuccessToast("Family member removed successfully");
      
      // Refresh family data to update member counts
      fetchFamilies();
    } catch (error: any) {
      console.error("Error in handleRemoveMember:", error);
      showErrorToast("Failed to remove family member");
    }
  };

  if (loading && familyGroups.length === 0) {
    return (
      <div className="admin-loader-container">
        <div className="admin-loader-spinner"></div>
        <h2 className="admin-loader-title">Loading Family Groups</h2>
        <p className="admin-loader-subtitle">Please wait while we fetch your family connections...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Family Group Management</h1>
        <div>
          <button className="btn btn-sm btn-danger shadow-sm mr-2">
            <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Data
          </button>
          <Link to="/admin/family/create" className="btn btn-sm btn-success shadow-sm">
            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Create Family Group
          </Link>
        </div>
      </div>

      {/* Summary Stats Cards Row */}
      <div className="row">
        {/* Total Family Groups Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Total Family Groups
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.totalFamilies}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Family Groups Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Family Groups
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.activeFamilies}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-check fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Members Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Members
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.totalMembers}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-user-friends fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Members Per Family Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Avg. Members Per Family
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.avgMembersPerFamily.toFixed(1)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-danger">Filter Family Groups</h6>
          <button onClick={resetFilters} className="btn btn-sm btn-outline-danger">
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <label htmlFor="name" className="font-weight-bold text-gray-800">Search</label>
              <div className="input-group">
              <input
                type="text"
                id="name"
                name="name"
                value={filter.name}
                onChange={handleFilterChange}
                  placeholder="Search by family name..."
                className="form-control"
              />
                <div className="input-group-append">
                  <button 
                    className="btn btn-danger" 
                    type="button"
                    onClick={() => fetchFamilies()}
                  >
                    <i className="fas fa-search fa-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="status" className="font-weight-bold text-gray-800">Status</label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="minMembers" className="font-weight-bold text-gray-800">Min Members</label>
              <input
                type="number"
                id="minMembers"
                name="minMembers"
                value={filter.minMembers}
                onChange={handleFilterChange}
                placeholder="Min"
                className="form-control"
                min="1"
              />
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="maxMembers" className="font-weight-bold text-gray-800">Max Members</label>
              <input
                type="number"
                id="maxMembers"
                name="maxMembers"
                value={filter.maxMembers}
                onChange={handleFilterChange}
                placeholder="Max"
                className="form-control"
                min="1"
              />
            </div>

            <div className="col-md-2 mb-3">
              <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filter.sortBy}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Family Name</option>
                <option value="members">Member Count</option>
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label htmlFor="sortOrder" className="font-weight-bold text-gray-800">Sort Order</label>
              <select
                id="sortOrder"
                name="sortOrder"
                value={filter.sortOrder}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            
            <div className="col-md-12 mt-2 text-center">
              <button 
                className="btn btn-danger" 
                onClick={() => fetchFamilies()}
                disabled={loading}
              >
                <i className="fas fa-filter mr-1"></i> Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Family Groups Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-danger">
              All Family Groups
              {loading && (
                <span className="ml-2">
                  <i className="fas fa-spinner fa-spin fa-sm"></i>
                </span>
              )}
            </h6>
            <div className="d-flex align-items-center">
              <div className="input-group input-group-sm mr-3" style={{ width: "auto" }}>
                <div className="input-group-prepend">
                  <span 
                    className="input-group-text border-right-0" 
                    style={{ 
                      backgroundColor: "#e74a3b", 
                      color: "white", 
                      borderColor: "#e74a3b"
                    }}
                  >Show</span>
                </div>
                <select 
                  className="form-control form-control-sm border-left-0 border-right-0" 
                  style={{ width: "70px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <div className="input-group-append">
                  <span 
                    className="input-group-text border-left-0" 
                    style={{ 
                      backgroundColor: "#e74a3b", 
                      color: "white", 
                      borderColor: "#e74a3b" 
                    }}
                  >entries</span>
                </div>
              </div>
              <button 
                className="btn btn-sm btn-outline-danger" 
                onClick={refreshFamilyData}
                disabled={loading}
                title="Refresh Family Data"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {isFiltering || loading ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <p className="text-gray-600 mb-0">No family groups found matching your criteria.</p>
            </div>
          ) : (
            <>
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Family Name</th>
                    <th>Owner</th>
                    <th>Members</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    return (
                      <tr key={group.id}>
                          <td className="font-weight-bold">{group.family_name}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                                src={group.owner?.avatar_url || "/images/placeholder.png"} 
                              className="rounded-circle mr-2" 
                              width="30" 
                              height="30"
                                alt={group.owner?.full_name}
                            />
                            <div>
                                <div>{group.owner?.full_name}</div>
                              <div className="small text-gray-600">{group.owner?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                            <span className="badge badge-primary p-2">{group.members_count || 0}</span>
                        </td>
                        <td>{formatDate(group.created_at)}</td>
                        <td>
                          <span className={`badge badge-${group.status === 'active' ? 'success' : 'danger'} p-2`}>
                            {group.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button 
                              onClick={() => handleViewMembers(group.id)} 
                              className="btn btn-sm btn-outline-primary mr-1" 
                              title="View Members"
                            >
                              <i className="fas fa-users"></i>
                            </button>
                            <Link to={`/admin/family/${group.id}/edit`} className="btn btn-sm btn-outline-warning mr-1" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(group.id)} 
                              className="btn btn-sm btn-outline-danger" 
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              
              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <span className="text-muted">
                    {filteredGroups.length === 0 ? (
                      "Showing 0 to 0 of 0 entries"
                    ) : (
                      `Showing ${Math.min((currentPage - 1) * pageSize + 1, totalItems)} to ${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} entries`
                    )}
                  </span>
                </div>
                {totalPages > 0 && (
                  <nav>
                    <ul className="pagination admin-pagination">
                      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                        <button 
                          className="page-link"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                        // Show pages around current page
                        let pageNumber: number;
                        if (totalPages <= 5) {
                          pageNumber = index + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + index;
                        } else {
                          pageNumber = currentPage - 2 + index;
                        }
                        
                        if (pageNumber <= totalPages) {
                          return (
                            <li
                              key={index}
                              className={`page-item ${pageNumber === currentPage ? "active" : ""}`}
                            >
                              <button 
                                className="page-link"
                                onClick={() => handlePageChange(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            </li>
                          );
                        }
                        return null;
                      })}
                      <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                        <button 
                          className="page-link"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </>
          )}
            </div>
          </div>

      {/* Family Members Modal */}
      {showMembersModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {getSelectedFamily()?.family_name} - Members ({selectedFamilyMembers.length})
                </h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowMembersModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {selectedFamilyMembers.length === 0 ? (
                  <div className="text-center p-4">
                    <div className="mb-3">
                      <i className="fas fa-users fa-3x text-gray-300"></i>
                    </div>
                    <p className="text-gray-600 mb-0">No members found for this family group.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered" width="100%" cellSpacing="0">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Join Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFamilyMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={member.user?.avatar_url || "/images/placeholder.png"} 
                                  className="rounded-circle mr-2" 
                                  width="30" 
                                  height="30"
                                  alt={member.user?.full_name}
                                />
                                <div>
                                  <div>{member.user?.full_name || "Unknown User"}</div>
                                  <div className="small text-gray-600">{member.user?.email || "No email"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge badge-${member.role === 'admin' ? 'primary' : 'secondary'} p-2`}>
                                {member.role === 'admin' ? 'Admin' : 'Viewer'}
                              </span>
                            </td>
                            <td>{formatDate(member.created_at)}</td>
                            <td>
                              <div className="btn-group">
                                <Link to={`/admin/users/${member.user_id}`} className="btn btn-sm btn-outline-info mr-1" title="View User">
                                  <i className="fas fa-user"></i>
                                </Link>
                                <button 
                                  className="btn btn-sm btn-outline-danger" 
                                  title="Remove from Family"
                                  onClick={() => handleRemoveMember(member.id, member.user_id)}
                                >
                                  <i className="fas fa-user-minus"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowMembersModal(false)}
                >
                  Close
                </button>
                <Link to={`/admin/family/${selectedFamilyId}/add-member`} className="btn btn-primary">
                  <i className="fas fa-user-plus mr-1"></i> Add Member
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this family group? This action cannot be undone.</p>
                <p className="text-danger font-weight-bold">Note: This will remove all family connections and shared financial data.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  Delete Family Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFamily; 