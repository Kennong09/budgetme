import React, { useState, useEffect, FC, useRef, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
  refreshFamilyMembershipsView
} from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import JoinFamily from "./JoinFamily";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import shared dashboard styles
import "../dashboard/dashboard.css";

// --- INTERFACES ---

interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  user_metadata?: {
    username?: string;
    avatar_url?: string;
    full_name?: string;
  };
}

interface Family {
  id: string;
  family_name: string;
  description?: string;
  created_at: string;
  created_by: string;
  currency_pref: string;
  is_public?: boolean;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: "admin" | "viewer";
  status: "active" | "pending" | "inactive";
  created_at: string;
  updated_at?: string;
  user?: User;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  type: "income" | "expense";
  category_id?: number;
  account_id: string;
  created_at: string;
  updated_at?: string;
}

interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  percentage: number;
  progress_status?: string;
  target_date: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at?: string;
  is_overdue: boolean;
  family_id?: string;   // ID of the family if shared
  is_shared?: boolean;  // Indicates if goal is shared with family
  owner_name?: string; // Name of the owner of the goal
  shared_by?: string;   // User who shared the goal
  shared_by_name?: string; // Name of user who shared the goal
}

interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string;
  created_at: string;
}

interface Contributor {
  user_id: string;
  username: string;
  avatar_url?: string;
  amount: number;
}

interface FamilySummaryData {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

interface RecentActivity {
  id: string;
  type: "join" | "goal" | "transaction";
  description: string;
  date: string;
  icon: string;
  color: string;
  user?: User;
}

// Chart interfaces
interface MonthlyData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

interface BudgetPerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

type TabType = "overview" | "members" | "activity" | "goals";

// --- COMPONENTS ---

// PendingJoinRequestsSection Component
interface PendingJoinRequestsProps {
  familyId: string;
}

const PendingJoinRequestsSection: React.FC<PendingJoinRequestsProps> = ({ familyId }) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // Fetch pending join requests
  const fetchPendingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      // First, get the join requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('family_join_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (requestsError) {
        console.error("Error fetching join requests:", requestsError);
        showErrorToast("Failed to load join requests");
        setPendingRequests([]);
        setLoadingRequests(false);
        return;
      }

      // If we have requests, fetch the associated user profiles separately
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map(req => req.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
          
        if (profilesError) {
          console.error("Error fetching user profiles:", profilesError);
          // Continue with the requests data even if profiles can't be fetched
        }
        
        // Combine the data
        const combinedData = requestsData.map(request => {
          const profile = profilesData?.find(profile => profile.id === request.user_id);
          return {
            ...request,
            profiles: profile
          };
        });
        
        setPendingRequests(combinedData || []);
      } else {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error("Error in fetchPendingRequests:", err);
      showErrorToast("An error occurred while loading join requests");
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [familyId, showErrorToast]);
  
  // Handle approving or rejecting a join request
  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      // Find the request to process
      const request = pendingRequests.find(req => req.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }
      
      if (action === 'approve') {
        // First create a family member entry
        const { error: memberError } = await supabase
          .from('family_members')
          .insert({
            family_id: familyId,
            user_id: request.user_id,
            role: 'viewer', // Default role for joined members
            status: 'active',
            created_at: new Date().toISOString()
          });
          
        if (memberError) {
          throw new Error(`Error adding family member: ${memberError.message}`);
        }
        
        // Then update the request status
        const { error: requestError } = await supabase
          .from('family_join_requests')
          .update({ 
            status: 'approved',
            processed_at: new Date().toISOString()
          })
          .eq('id', requestId);
          
        if (requestError) {
          throw new Error(`Error updating request status: ${requestError.message}`);
        }
        
        showSuccessToast("Join request approved successfully! User added as a viewer.");
      } else {
        // Update request status to rejected
        const { error: requestError } = await supabase
          .from('family_join_requests')
          .update({ 
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          .eq('id', requestId);
          
        if (requestError) {
          throw new Error(`Error updating request status: ${requestError.message}`);
        }
        
        showSuccessToast("Join request rejected");
      }
      
      // Refresh the pending requests list
      fetchPendingRequests();
      
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showErrorToast(`Failed to ${action} request: ${errorMessage}`);
    } finally {
      setProcessingRequestId(null);
    }
  };
  
  // Load pending requests on component mount - with debounce
  useEffect(() => {
    // Only fetch on initial mount
    const timer = setTimeout(() => {
      fetchPendingRequests();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loadingRequests) {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading pending requests...</p>
        </div>
      </div>
    );
  }
  
  if (pendingRequests.length === 0) {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchPendingRequests} 
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="card-body text-center py-4">
          <i className="fas fa-check-circle fa-2x text-success mb-3"></i>
          <p className="text-gray-500">No pending join requests at this time.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 d-flex justify-content-between align-items-center">
        <h6 className="m-0 font-weight-bold text-primary">
          Pending Join Requests <span className="badge badge-warning ml-2">{pendingRequests.length}</span>
        </h6>
        <button 
          className="btn btn-sm btn-outline-primary" 
          onClick={fetchPendingRequests} 
          title="Refresh"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map(request => (
                <tr key={request.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        className="img-profile rounded-circle mr-3" 
                        src={request.profiles?.user_metadata?.avatar_url || `../images/placeholder.png`} 
                        width="40" 
                        height="40" 
                        alt="User" 
                      />
                      <div className="font-weight-bold">
                        {request.profiles?.user_metadata?.username || 
                         request.profiles?.user_metadata?.full_name || 
                         "User"}
                      </div>
                    </div>
                  </td>
                  <td>{request.profiles?.email || "Unknown"}</td>
                  <td>{formatDate(request.created_at)}</td>
                  <td>
                    <button 
                      className="btn btn-success btn-sm mr-2" 
                      onClick={() => handleRequestAction(request.id, 'approve')}
                      disabled={processingRequestId === request.id}
                      title="Approve request and add user as a viewer"
                    >
                      {processingRequestId === request.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="fas fa-check mr-1"></i>
                      )}
                      Approve as Viewer
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRequestAction(request.id, 'reject')}
                      disabled={processingRequestId === request.id}
                    >
                      <i className="fas fa-times mr-1"></i> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FamilyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { familyId: urlFamilyId } = useParams<{ familyId?: string }>();
  
  // State for family data
  const [familyData, setFamilyData] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [summaryData, setSummaryData] = useState<FamilySummaryData | null>(null);
  const [sharedGoalPerformanceChartData, setSharedGoalPerformanceChartData] = useState<any | null>(null);
  const [sharedGoalBreakdownChartData, setSharedGoalBreakdownChartData] = useState<any | null>(null);
  
  // Family goals state
  const [familyGoals, setFamilyGoals] = useState<Goal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState<boolean>(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Get initial tab from URL or use default
  const initialTab = searchParams.get('tab') as TabType || "overview";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Handle tab change with URL update
  const handleTabChange = (tab: TabType) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
    setActiveTab(tab);
  };
  
  // Goal contribution data states
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [contributionsByMember, setContributionsByMember] = useState<{[key: string]: number}>({});
  const [contributionChartData, setContributionChartData] = useState<any | null>(null);
  const [contributionPieChartData, setContributionPieChartData] = useState<any | null>(null);
  const [selectedGoalForContributions, setSelectedGoalForContributions] = useState<string | null>(null);
  const [loadingContributions, setLoadingContributions] = useState<boolean>(false);
  
  // Quick goal contribution modal state
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>("");
  const [isContributing, setIsContributing] = useState<boolean>(false);

  // Chart refs
  const sharedGoalPerformanceChartRef = useRef<HighchartsReact.RefObject>(null);
  const sharedGoalBreakdownChartRef = useRef<HighchartsReact.RefObject>(null);
  const contributionBarChartRef = useRef<HighchartsReact.RefObject>(null);
  const contributionPieChartRef = useRef<HighchartsReact.RefObject>(null);

  // Real-time subscription states
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  
  // Channel names for subscriptions
  const familyChannelName = `family-changes-${user?.id}`;
  const memberChannelName = `family-members-${user?.id}`;
  const goalChannelName = `family-goals-${user?.id}`;
  const transactionChannelName = `family-transactions-${user?.id}`;
  const activityChannelName = `family-activity-${user?.id}`;
  const userMembershipChannelName = `user-membership-${user?.id}`;
  
  // Join Requests Section - for managing requests to join family
  const JoinRequestsSection: React.FC = () => {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const [errorCount, setErrorCount] = useState<number>(0);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);
    const [fetchDisabled, setFetchDisabled] = useState<boolean>(false);
    
    // Fetch pending join requests
    const fetchPendingRequests = useCallback(async () => {
      if (!familyData?.id || fetchDisabled) return;
      
      // Prevent multiple simultaneous requests
      if (loadingRequests) return;
      
      // Implement rate limiting - only fetch once every 5 seconds
      const now = Date.now();
      if (now - lastFetchTime < 5000 && lastFetchTime !== 0) {
        return;
      }
      
      setLastFetchTime(now);
      setLoadingRequests(true);
      
      try {
        // First, get the join requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('family_join_requests')
          .select('*')
          .eq('family_id', familyData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (requestsError) {
          const newErrorCount = errorCount + 1;
          setErrorCount(newErrorCount);
          console.error("Error fetching join requests:", requestsError);
          
          // Only show toast on first few errors to avoid spamming
          if (newErrorCount < 3) {
            showErrorToast("Failed to load join requests");
          }
          
          // After too many errors, disable fetching completely
          if (newErrorCount >= 5) {
            setFetchDisabled(true);
            console.log("Disabled join requests fetching due to too many errors");
          }
          
          setPendingRequests([]);
          return;
        }

        // If we have requests, fetch the associated user profiles separately
        if (requestsData && requestsData.length > 0) {
          const userIds = requestsData.map(req => req.user_id).filter(Boolean);
          
          // Only proceed if we have valid user IDs
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, email, user_metadata')
              .in('id', userIds);
              
            if (profilesError) {
              console.error("Error fetching user profiles:", profilesError);
              // Continue with the requests data even if profiles can't be fetched
            }
            
            // Combine the data
            const combinedData = requestsData.map(request => {
              const profile = profilesData?.find(profile => profile.id === request.user_id);
              return {
                ...request,
                profiles: profile
              };
            });
            
            setPendingRequests(combinedData || []);
          } else {
            setPendingRequests(requestsData);
          }
        } else {
          setPendingRequests([]);
        }
        
        // Reset error count on success
        setErrorCount(0);
      } catch (err) {
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        console.error("Error in fetchPendingRequests:", err);
        
        // Only show toast on first few errors to avoid spamming
        if (newErrorCount < 3) {
          showErrorToast("An error occurred while loading join requests");
        }
        
        // After too many errors, disable fetching completely
        if (newErrorCount >= 5) {
          setFetchDisabled(true);
          console.log("Disabled join requests fetching due to too many errors");
        }
        
        setPendingRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }, [familyData?.id, showErrorToast, loadingRequests, errorCount, lastFetchTime, fetchDisabled]);
    
    // Handle approving or rejecting a join request
    const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
      if (!familyData?.id) return;
      
      setProcessingRequestId(requestId);
      try {
        // Find the request to process
        const request = pendingRequests.find(req => req.id === requestId);
        if (!request) {
          throw new Error("Request not found");
        }
        
        if (action === 'approve') {
          // First create a family member entry
          const { error: memberError } = await supabase
            .from('family_members')
            .insert({
              family_id: familyData.id,
              user_id: request.user_id,
              role: 'viewer', // Default role for joined members
              status: 'active',
              created_at: new Date().toISOString()
            });
            
          if (memberError) {
            throw new Error(`Error adding family member: ${memberError.message}`);
          }
          
          // Then update the request status
          const { error: requestError } = await supabase
            .from('family_join_requests')
            .update({ 
              status: 'approved',
              processed_at: new Date().toISOString()
            })
            .eq('id', requestId);
            
          if (requestError) {
            throw new Error(`Error updating request status: ${requestError.message}`);
          }
          
          showSuccessToast("Join request approved successfully! User added as a viewer.");
        } else {
          // Update request status to rejected
          const { error: requestError } = await supabase
            .from('family_join_requests')
            .update({ 
              status: 'rejected',
              processed_at: new Date().toISOString()
            })
            .eq('id', requestId);
            
          if (requestError) {
            throw new Error(`Error updating request status: ${requestError.message}`);
          }
          
          showSuccessToast("Join request rejected");
        }
        
        // Refresh the pending requests list
        fetchPendingRequests();
        
      } catch (err) {
        console.error(`Error ${action}ing request:`, err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        showErrorToast(`Failed to ${action} request: ${errorMessage}`);
      } finally {
        setProcessingRequestId(null);
      }
    };
    
    // Load pending requests on component mount - with debounce
    useEffect(() => {
      // Only fetch on initial mount with a delay
      const timer = setTimeout(() => {
        fetchPendingRequests();
      }, 1500);
      
      return () => clearTimeout(timer);
    }, []);
    
    if (loadingRequests) {
      return (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
          </div>
          <div className="card-body text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-gray-600">Loading pending requests...</p>
          </div>
        </div>
      );
    }
    
    if (pendingRequests.length === 0) {
      return (
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
            <button 
              className="btn btn-sm btn-outline-primary" 
              onClick={fetchPendingRequests} 
              disabled={fetchDisabled}
              title={fetchDisabled ? "Refresh disabled due to errors" : "Refresh"}
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="card-body text-center py-4">
            <i className="fas fa-check-circle fa-2x text-success mb-3"></i>
            <p className="text-gray-500">No pending join requests at this time.</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">
            Pending Join Requests <span className="badge badge-warning ml-2">{pendingRequests.length}</span>
            <small className="ml-2 text-muted font-weight-normal">
              (All approved users join as viewers)
            </small>
          </h6>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchPendingRequests} 
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Requested On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(request => (
                  <tr key={request.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img 
                          className="img-profile rounded-circle mr-3" 
                          src={request.profiles?.user_metadata?.avatar_url || `../images/placeholder.png`} 
                          width="40" 
                          height="40" 
                          alt="User" 
                        />
                        <div className="font-weight-bold">
                          {request.profiles?.user_metadata?.username || 
                           request.profiles?.user_metadata?.full_name || 
                           "User"}
                        </div>
                      </div>
                    </td>
                    <td>{request.profiles?.email || "Unknown"}</td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>
                      <button 
                        className="btn btn-success btn-sm mr-2" 
                        onClick={() => handleRequestAction(request.id, 'approve')}
                        disabled={processingRequestId === request.id}
                        title="Approve request and add user as a viewer"
                      >
                        {processingRequestId === request.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <i className="fas fa-check mr-1"></i>
                        )}
                        Approve as Viewer
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleRequestAction(request.id, 'reject')}
                        disabled={processingRequestId === request.id}
                      >
                        <i className="fas fa-times mr-1"></i> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Memoize data update functions to use in subscriptions
  const updateTransactionData = useCallback(async (memberUserIds: string[]) => {
    try {
      // Get current month date range
      const currentDate = new Date();
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .in('user_id', memberUserIds)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (!txError && txData) {
        setTransactions(txData);
        
        // Recalculate summary data
        const totalIncome = txData
          .filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        const totalExpenses = txData
          .filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
        
        setSummaryData({
          income: totalIncome,
          expenses: totalExpenses,
          balance: totalIncome - totalExpenses,
          savingsRate,
        });

        // We'll update goal charts in the updateGoalsData function
        
        // Update budget performance chart if needed
        // Update shared goal charts
        if (familyData?.id) {
          // This will be handled separately in updateGoalsData
        }
      }
    } catch (err) {
      console.error("Error updating transaction data:", err);
    }
  }, [familyData]);
  
    // Fetch family goals
  const fetchFamilyGoals = useCallback(async () => {
    if (!familyData?.id || !user) {
      return;
    }

    setIsLoadingGoals(true);
    setGoalError(null);
    
    try {
      // Fetch all goals associated with this family ID
      const { data, error } = await supabase
        .from("goals")
        .select('*')
        .eq("family_id", familyData.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching family goals:", error);
        setGoalError(`Failed to load family goals: ${error.message}`);
        setFamilyGoals([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setFamilyGoals([]);
        return;
      }

      // If we have goals, fetch the associated user data separately
      // Get unique user IDs from goals
      // Get unique user IDs from goals
      const userIdSet = new Set<string>();
      data.forEach(goal => {
        if (goal.user_id) userIdSet.add(goal.user_id);
        if (goal.shared_by) userIdSet.add(goal.shared_by);
      });
      
      // Convert to array for the IN query
      const allUserIds = Array.from(userIdSet);
      
      // Fetch user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .in('id', allUserIds);
        
      if (profilesError) {
        console.warn("Error fetching user profiles:", profilesError);
        // Continue with limited user data
      }
      
      // Create a lookup map for profiles
      const profileMap = new Map();
      if (profiles) {
        profiles.forEach((profile: any) => {
          profileMap.set(profile.id, profile);
        });
      }
      
      // Process goals to calculate derived properties and add display names
      const processedGoals = data.map(goal => {
        // Get user profile info
        const ownerProfile = profileMap.get(goal.user_id) || null;
        const sharedByProfile = goal.shared_by ? profileMap.get(goal.shared_by) || null : null;
        
        // Calculate percentage if not already set
        const percentage = goal.percentage || 
          ((goal.current_amount / goal.target_amount) * 100);
        
        // Calculate remaining amount
        const remaining = goal.target_amount - goal.current_amount;
        
        // Calculate progress status
        const progress_status = goal.progress_status || 
          (percentage >= 75 ? 'good' : 
           percentage >= 50 ? 'average' : 'poor');
        
        // Calculate if overdue
        const isOverdue = goal.is_overdue || 
          (new Date(goal.target_date) < new Date() && goal.status !== "completed");
            
        return {
          ...goal,
          percentage,
          remaining,
          progress_status,
          is_overdue: isOverdue,
          is_shared: true,
          owner_name: ownerProfile?.user_metadata?.username || 
                    ownerProfile?.user_metadata?.full_name || 
                    "Family Member",
          shared_by_name: sharedByProfile?.user_metadata?.username || 
                        sharedByProfile?.user_metadata?.full_name ||
                        "Family Member"
        };
      });

      setFamilyGoals(processedGoals);
      
      // Generate chart data for family goals
      setSharedGoalPerformanceChartData(prepareSharedGoalPerformanceData(processedGoals));
      setSharedGoalBreakdownChartData(prepareSharedGoalBreakdownData(processedGoals));
      
    } catch (err) {
      console.error("Error in fetchFamilyGoals:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setGoalError(`Failed to load family goals: ${errorMessage}`);
      setFamilyGoals([]);
    } finally {
      setIsLoadingGoals(false);
    }
  }, [familyData?.id, user]);

  const updateRecentActivity = useCallback(async (familyId: string, memberUserIds: string[]) => {
    if (!familyId || !memberUserIds.length) return;
    
    try {
      // Initialize array to hold activity items
      const activities: RecentActivity[] = [];
      
      // 1. Recent member joins (up to 3)
      const { data: recentJoins, error: joinsError } = await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('family_id', familyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!joinsError && recentJoins && recentJoins.length > 0) {
        // Get user profiles separately
        const joinUserIds = recentJoins.map(join => join.user_id);
        const { data: joinProfiles, error: joinProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', joinUserIds);
          
        if (!joinProfilesError && joinProfiles) {
          recentJoins.forEach(join => {
            const profile = joinProfiles.find(p => p.id === join.user_id);
            if (profile) {
              activities.push({
                id: `join-${join.id}`,
                type: 'join',
                user: {
                  id: profile.id,
                  email: profile.email,
                  created_at: join.created_at,
                  user_metadata: profile.user_metadata
                },
                description: "joined the family.",
                date: join.created_at,
                icon: "fa-user-plus",
                color: "primary"
              });
            }
          });
        }
      }
      
      // 2. Recent goals created (up to 3)
      const { data: recentGoals, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          user_id,
          goal_name,
          created_at
        `)
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!goalsError && recentGoals && recentGoals.length > 0) {
        // Get user profiles separately
        const goalUserIds = recentGoals.map(goal => goal.user_id);
        const { data: goalProfiles, error: goalProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', goalUserIds);
          
        if (!goalProfilesError && goalProfiles) {
          recentGoals.forEach(goal => {
            const profile = goalProfiles.find(p => p.id === goal.user_id);
            if (profile) {
              activities.push({
                id: `goal-${goal.id}`,
                type: 'goal',
                user: {
                  id: profile.id,
                  email: profile.email,
                  created_at: goal.created_at,
                  user_metadata: profile.user_metadata
                },
                description: `created a new goal '${goal.goal_name}'.`,
                date: goal.created_at,
                icon: "fa-flag-checkered",
                color: "info"
              });
            }
          });
        }
      }
      
      // 3. Recent transactions (up to 4)
      const { data: recentTransactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          amount,
          description,
          date,
          created_at,
          type
        `)
        .in('user_id', memberUserIds)
        .order('created_at', { ascending: false })
        .limit(4);
        
      if (!txError && recentTransactions && recentTransactions.length > 0) {
        // Get user profiles separately
        const txUserIds = recentTransactions.map(tx => tx.user_id);
        const { data: txProfiles, error: txProfilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', txUserIds);
          
        if (!txProfilesError && txProfiles) {
          recentTransactions.forEach(tx => {
            const profile = txProfiles.find(p => p.id === tx.user_id);
            if (profile) {
              activities.push({
                id: `tx-${tx.id}`,
                type: 'transaction',
                user: {
                  id: profile.id,
                  email: profile.email,
                  created_at: tx.created_at,
                  user_metadata: profile.user_metadata
                },
                description: `${tx.type === 'expense' ? 'spent' : 'received'} ${formatCurrency(tx.amount)} ${tx.description ? `for ${tx.description}` : ''}.`,
                date: tx.created_at,
                icon: tx.type === 'expense' ? "fa-credit-card" : "fa-money-bill-alt",
                color: tx.type === 'expense' ? "warning" : "success"
              });
            }
          });
        }
      }
      
      // Sort all activities by date (newest first)
      const sortedActivities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
        
      setRecentActivity(sortedActivities);
    } catch (err) {
      console.error("Error updating activity feed:", err);
    }
  }, []);

  // --- Main data fetching function ---
  const [isLoadingFamilyData, setIsLoadingFamilyData] = useState<boolean>(false);
  const [lastFamilyDataFetchTime, setLastFamilyDataFetchTime] = useState<number>(0);
  
  const fetchFamilyData = useCallback(async (retryCount = 0, maxRetries = 3, familyIdFromUrl?: string) => {
    if (!user) return;
    
    // Prevent multiple simultaneous requests
    if (isLoadingFamilyData) return;
    
    // Rate limiting - only fetch once every 5 seconds unless it's a retry
    const now = Date.now();
    if (retryCount === 0 && now - lastFamilyDataFetchTime < 5000 && lastFamilyDataFetchTime !== 0) {
      return;
    }
    
    setLastFamilyDataFetchTime(now);
    setIsLoadingFamilyData(true);
    
    try {
      // Enforce a maximum retry count to prevent infinite loops
      if (retryCount >= maxRetries) {
        showErrorToast("Could not load family data. Please refresh the page.");
        setIsLoadingFamilyData(false);
        return;
      }
      
      // First try to query the family_members directly to bypass materialized view issues
      const { data: directMemberQuery, error: directMemberError } = await supabase
        .from('family_members')
        .select(`
          id,
          family_id,
          user_id,
          role,
          status,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);
      
      // If direct query succeeds and returns a family membership
      if (!directMemberError && directMemberQuery && directMemberQuery.length > 0) {
        // Fetch the family details using the family_id we got from members table
        const familyId = directMemberQuery[0].family_id;
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();
        
        if (familyError) {
          console.error("Error fetching family data from direct query:", familyError);
          // Continue to fallback methods
        } else if (familyData) {
          setFamilyData(familyData);
          // Check if current user is the creator of the family
          setIsCreator(user.id === familyData.created_by);
          
          // Now get all members of this family
          const { data: allMembers, error: allMembersError } = await supabase
            .from('family_members')
            .select(`
              id,
              family_id,
              user_id,
              role,
              status,
              created_at,
              updated_at
            `)
            .eq('family_id', familyId)
            .eq('status', 'active');
            
          if (allMembersError) {
            console.error("Error fetching all family members:", allMembersError);
            // Continue with limited data rather than failing
          }
          
          // Process members just like we do below
          let processedMembers: FamilyMember[] = [];
          if (allMembers && allMembers.length > 0) {
            const memberUserIds = allMembers.map(member => member.user_id);
            
            // Get user profiles with minimal fields to avoid policy issues
            const { data: userProfiles, error: profilesError } = await supabase
              .from('profiles')
              .select(`
                id,
                email,
                created_at,
                updated_at,
                last_sign_in_at,
                user_metadata
              `)
              .in('id', memberUserIds);
              
            if (profilesError) {
              console.error("Error fetching user profiles:", profilesError);
              // Continue with limited data rather than failing
            }
            
            // Match profiles with members explicitly
            processedMembers = allMembers.map(member => {
              const userProfile = userProfiles?.find(profile => profile.id === member.user_id);
              return {
                ...member,
                user: userProfile ? {
                  id: userProfile.id,
                  email: userProfile.email,
                  created_at: userProfile.created_at,
                  updated_at: userProfile.updated_at,
                  last_sign_in_at: userProfile.last_sign_in_at,
                  user_metadata: userProfile.user_metadata || {}
                } : undefined
              };
            });
            
            setMembers(processedMembers);

            // Now that we have member IDs, fetch all relevant data
            if (processedMembers.length > 0) {
              // Use our callback functions to fetch and set all related data
              await Promise.all([
                updateTransactionData(processedMembers.map(member => member.user_id)),
                fetchFamilyGoals(),
                updateRecentActivity(familyId, processedMembers.map(member => member.user_id))
              ]);
            }
          } else {
            // No members - set empty state
                      setMembers([]);
          setTransactions([]);
          setFamilyGoals([]);
          setRecentActivity([]);
          setSummaryData({
            income: 0,
            expenses: 0,
            balance: 0,
            savingsRate: 0,
          });
          setSharedGoalPerformanceChartData(null);
          setSharedGoalBreakdownChartData(null);
          }
          
          return; // We successfully loaded data, no need to continue to other methods
        }
      }
      
      // Fallback 1: Try materialized view using the check_user_family function
      const { data: checkResult, error: checkError } = await supabase.rpc(
        'check_user_family',
        { p_user_id: user.id }
      );

      if (checkError) {
        console.error("Error checking family membership:", checkError);
        
        // Fallback 2: Try the newer direct function
        const { data: directResult, error: directError } = await supabase.rpc(
          'get_family_membership',
          { p_user_id: user.id }
        );
        
        if (directError) {
          console.error("Error using direct membership check:", directError);
          
          // If we've already tried and we're still getting errors,
          // it might be that the materialized view hasn't refreshed yet after creating the family
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
           
          // After max retries
          showErrorToast(`Error checking family status: ${checkError.message}`);
          return;
        }
        
        // Use the direct result if available
        if (directResult && directResult.is_member) {
          // Fetch family details directly since we have them already
          const familyFromDirect = {
            id: directResult.family_id,
            family_name: directResult.family_name,
            description: directResult.description || "",
            currency_pref: directResult.currency_pref || "",
            created_by: "", // We don't have this info in the direct query
            created_at: ""  // We don't have this info in the direct query
          };
          
          setFamilyData(familyFromDirect);
          
          // Fetch the rest of the family details including created_by if needed
          const { data: fullFamilyDetails, error: fullFamilyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', directResult.family_id)
            .single();
            
          if (!fullFamilyError && fullFamilyDetails) {
            setFamilyData(fullFamilyDetails);
            // Check if current user is the creator of the family
            setIsCreator(user.id === fullFamilyDetails.created_by);
          }
          
          // Fall through to the rest of the data loading code - no early return
        } else {
          // If we've just created a family, try a few times before giving up
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
           
          // After max retries
          setFamilyData(null);
          return;
        }
      } else if (checkResult) {
        // Now checkResult could be either a JSON object (old format) or a row from the table function (new format)
        
        // Handle both the old JSON format and the new table format
        let isMember = false;
        let familyId = null;
        
        if (Array.isArray(checkResult) && checkResult.length > 0) {
          // New table structure format (array of rows)
          isMember = checkResult[0].is_member;
          familyId = checkResult[0].family_id;
        } else if (checkResult.is_member !== undefined) {
          // Old JSON format
          isMember = checkResult.is_member;
          familyId = checkResult.family_id;
        }
        
        if (!isMember || !familyId) {
          // If we've just created a family, try a few times before giving up
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
           
          // After max retries
          setFamilyData(null);
          return;
        }
        
        // Fetch full family data using the family ID
        const { data, error } = await supabase
          .from("families")
          .select("*")
          .eq("id", familyId)
          .single();

        if (error) {
          console.error("Error fetching family data:", error);
          showErrorToast(`Error loading family data: ${error.message}`);
          return;
        }

        setFamilyData(data);
        
        // Check if current user is the creator of the family
        setIsCreator(user.id === data.created_by);

        // 2. Get family members using a more direct approach
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select(`
            id,
            family_id,
            user_id,
            role,
            status,
            created_at,
            updated_at
          `)
          .eq('family_id', data.id)
          .eq('status', 'active');

        if (membersError) {
          console.error(`Error fetching family members: ${membersError.message}`);
          // Don't throw error, continue with limited data
        }

        // Fetch user profiles separately to avoid recursion issues
        let processedMembers: FamilyMember[] = [];
        if (members && members.length > 0) {
          const memberUserIds = members.map(member => member.user_id);
          
          // Get user profiles with minimal fields to avoid policy issues
          const { data: userProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select(`
              id,
              email,
              created_at,
              updated_at,
              last_sign_in_at,
              user_metadata
            `)
            .in('id', memberUserIds);
            
          if (profilesError) {
            console.error("Error fetching user profiles:", profilesError);
            // Continue with limited data rather than failing
          }
          
          // Match profiles with members explicitly
          processedMembers = members.map(member => {
            const userProfile = userProfiles?.find(profile => profile.id === member.user_id);
            return {
              ...member,
              user: userProfile ? {
                id: userProfile.id,
                email: userProfile.email,
                created_at: userProfile.created_at,
                updated_at: userProfile.updated_at,
                last_sign_in_at: userProfile.last_sign_in_at,
                user_metadata: userProfile.user_metadata || {}
              } : undefined
            };
          });
          
          setMembers(processedMembers);

          // 3. Now that we have member IDs, fetch all relevant data
          if (processedMembers.length > 0) {
            try {
                          // Use our callback functions to fetch and set all related data
            await Promise.all([
              updateTransactionData(processedMembers.map(member => member.user_id)),
              fetchFamilyGoals(),
              updateRecentActivity(data.id, processedMembers.map(member => member.user_id))
            ]);
            } catch (err) {
              console.error("Error fetching related data:", err);
              // Continue with limited data
            }
          }
        } else {
          // No members - set empty state
          setMembers([]);
          setTransactions([]);
          setFamilyGoals([]);
          setRecentActivity([]);
          setSummaryData({
            income: 0,
            expenses: 0,
            balance: 0,
            savingsRate: 0,
          });
          setSharedGoalPerformanceChartData(null);
          setSharedGoalBreakdownChartData(null);
        }
      }
    } catch (err) {
      console.error("Error in fetchFamilyData:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Error loading family data: ${errorMessage}`);
    } finally {
      setIsLoadingFamilyData(false);
    }
  }, [user, showErrorToast, updateTransactionData, fetchFamilyGoals, updateRecentActivity, isLoadingFamilyData, lastFamilyDataFetchTime]);

  // --- DATA FETCHING & PROCESSING ---
  useEffect(() => {
    if (!user) {
      showErrorToast("Please sign in to view your family dashboard");
      navigate("/login");
      return;
    }

    // Handle URL parameters for direct linking
    const familyIdFromUrl = urlFamilyId || searchParams.get('familyId');
    
    // Initial data fetch - check if we've just created a family
    // or if we're directly accessing a specific family
    const queryParams = new URLSearchParams(window.location.search);
    const justCreated = queryParams.get('created') === 'true';
    
    // Use setTimeout to prevent immediate execution and allow component to fully mount
    const timer = setTimeout(() => {
      if (justCreated) {
        // Start with higher retry attempts for newly created families
        fetchFamilyData(0, 5); // Allow more retries for newly created families
      } else if (familyIdFromUrl) {
        // For direct access with family ID, attempt to fetch that specific family
        fetchFamilyData(0, 3, familyIdFromUrl);
      } else {
        fetchFamilyData(0, 3); // Standard number of retries
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, navigate, showErrorToast, fetchFamilyData, urlFamilyId, searchParams]);
  
  // Fetch family goals when component mounts or family data changes
  useEffect(() => {
    // Only proceed if we have family data and the user
    if (familyData?.id && user) {
      console.log('Fetching family goals on mount or family data change');
      // Add a slight delay to prevent immediate execution
      const timer = setTimeout(() => {
        fetchFamilyGoals();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [familyData?.id, user]);
  
  // Set up user-specific subscription to detect when the user is added to a family
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up user membership subscription");
    
    // Subscribe to changes in the family_members table specific to this user
    const userMembershipSubscription = supabase
      .channel(userMembershipChannelName)
      .on('postgres_changes', {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'family_members',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('User membership changed:', payload);
        
        try {
          // When a new membership is created or updated
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'active')) {
            // Refresh family data
            await fetchFamilyData();
          } 
          // Handle case where user is removed from family
          else if (payload.eventType === 'DELETE' || 
                  (payload.eventType === 'UPDATE' && payload.new && payload.new.status !== 'active')) {
            // User was removed from family or deactivated
            setFamilyData(null);
            setMembers([]);
            // Reset all other related data
            setTransactions([]);
            setFamilyGoals([]);
            setRecentActivity([]);
            setSummaryData(null);
            setSharedGoalPerformanceChartData(null);
            setSharedGoalBreakdownChartData(null);
          }
        } catch (error) {
          console.error("Error handling membership change:", error);
          // Don't show toast here to avoid spamming the user
        }
      })
      .subscribe();
    
    // Clean up subscription on unmount  
    return () => {
      supabase.removeChannel(userMembershipSubscription);
    };
  }, [user, userMembershipChannelName, fetchFamilyData]);
  
  // Set up real-time subscriptions for existing family data
  useEffect(() => {
    if (!user || !familyData) return;
    
    // Array to hold all subscriptions
    const newSubscriptions: any[] = [];
    
    // Add a delay before setting up subscriptions to prevent immediate execution
    const setupTimer = setTimeout(() => {
      console.log(`Setting up real-time subscriptions for family ${familyData.id}`);
      
      try {
        // 1. Set up family details subscription
        const newFamilySubscription = supabase
          .channel(familyChannelName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'families',
            filter: `id=eq.${familyData.id}`
          }, (payload) => {
            console.log('Family update received:', payload);
            // Update family data when it changes
            if (payload.eventType === 'UPDATE' && payload.new) {
              setFamilyData(payload.new as Family);
            }
          })
          .subscribe();
          
        newSubscriptions.push(newFamilySubscription);
  
        // 2. Set up family members subscription with simplified approach
        const newMemberSubscription = supabase
          .channel(memberChannelName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'family_members',
            filter: `family_id=eq.${familyData.id}`
          }, async (payload) => {
            console.log('Family member update received:', payload);
            
            // Refresh all members when there's a change - using the separate queries approach
            const { data, error } = await supabase
              .from('family_members')
              .select(`
                id,
                family_id,
                user_id,
                role,
                status,
                created_at,
                updated_at
              `)
              .eq('family_id', familyData.id)
              .eq('status', 'active');
    
            if (!error && data) {
              // Fetch user profiles separately with minimal fields
              let processedMembers: FamilyMember[] = [];
              if (data && data.length > 0) {
                const memberUserIds = data.map(member => member.user_id);
                
                // Simplified query to avoid recursion
                const { data: userProfiles, error: profilesError } = await supabase
                  .from('profiles')
                  .select(`
                    id,
                    email,
                    created_at,
                    updated_at,
                    last_sign_in_at,
                    user_metadata
                  `)
                  .in('id', memberUserIds);
                  
                if (profilesError) {
                  console.error("Error fetching user profiles:", profilesError);
                  // Continue with limited data rather than failing
                }
                
                // Match profiles with members more explicitly
                processedMembers = data.map(member => {
                  const userProfile = userProfiles?.find(profile => profile.id === member.user_id);
                  return {
                    ...member,
                    user: userProfile ? {
                      id: userProfile.id,
                      email: userProfile.email,
                      created_at: userProfile.created_at,
                      updated_at: userProfile.updated_at,
                      last_sign_in_at: userProfile.last_sign_in_at,
                      user_metadata: userProfile.user_metadata || {}
                    } : undefined
                  };
                });
              }
    
              setMembers(processedMembers);
              
              // Also update recent activity since membership has changed
              if (processedMembers.length > 0) {
                const memberUserIds = processedMembers.map(member => member.user_id);
                await updateRecentActivity(familyData.id, memberUserIds);
              }
            }
          })
          .subscribe();
          
        newSubscriptions.push(newMemberSubscription);
    
        // 3. Set up goals subscription - if members are available
        if (members.length > 0) {
          const memberUserIds = members.map(member => member.user_id);
          
          if (memberUserIds.length > 0) {
            // Create goal subscription channel - listen for family goals by family_id
            const newGoalSubscription = supabase
              .channel(goalChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'goals',
                filter: `family_id=eq.${familyData.id}`
              }, async (payload) => {
                console.log('Family goal update received:', payload);
                
                // Refresh goals data
                await fetchFamilyGoals();
                
                // Update activity feed since goals have changed
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            // Also listen for updates to any goals that might be shared with this family
            const goalSharingSubscription = supabase
              .channel(`${goalChannelName}-sharing`)
              .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'goals',
              }, async (payload) => {
                // Check if this update involves sharing with our family
                if (payload.new && payload.new.family_id === familyData.id) {
                  console.log('Goal shared with family:', payload);
                  await fetchFamilyGoals();
                  await updateRecentActivity(familyData.id, memberUserIds);
                }
              })
              .subscribe();
              
            newSubscriptions.push(goalSharingSubscription);
              
            // Add to subscriptions array
            newSubscriptions.push(newGoalSubscription);
            
            // Create transaction subscription channel
            const newTransactionSubscription = supabase
              .channel(transactionChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `user_id=in.(${memberUserIds.join(',')})`
              }, async (payload) => {
                console.log('Transaction update received:', payload);
                
                // Update transaction data, summary, and charts
                await updateTransactionData(memberUserIds);
                
                // Update activity feed since transactions have changed
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            // Add to subscriptions array  
            newSubscriptions.push(newTransactionSubscription);
            
            // Set up an activity-specific subscription for real-time updates to the activity feed
            const activitySubscription = supabase
              .channel(activityChannelName)
              .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'family_members',
                filter: `family_id=eq.${familyData.id}`
              }, async (payload) => {
                // Update activity feed when family membership changes
                await updateRecentActivity(familyData.id, memberUserIds);
              })
              .subscribe();
              
            newSubscriptions.push(activitySubscription);
          }
        }
        
        // Save subscription references
        setSubscriptions(newSubscriptions);
      } catch (err) {
        console.error("Error setting up subscriptions:", err);
      }
    }, 2000);
    
    // Clean up timer and subscriptions when component unmounts or familyData changes
    return () => {
      clearTimeout(setupTimer);
      subscriptions.forEach(subscription => supabase.removeChannel(subscription));
    };
  }, [user, familyData, members, familyChannelName, memberChannelName, goalChannelName, transactionChannelName, activityChannelName, updateTransactionData, fetchFamilyGoals, updateRecentActivity]);

  // --- NEW FUNCTIONS FOR FAMILY MANAGEMENT ---

  // State for account selection in contribution modal
  const [userAccounts, setUserAccounts] = useState<{id: string, account_name: string}[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("default");

  // Goal contribution functions
  const openContributeModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionAmount("");
    fetchUserAccounts();
    setShowContributeModal(true);
  };

  const closeContributeModal = () => {
    setShowContributeModal(false);
    setSelectedGoal(null);
  };
  
  // Function to fetch user accounts for contribution
  const fetchUserAccounts = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('user_id', user.id)
        .order('account_name');
        
      if (error) {
        console.error('Error fetching user accounts:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('User accounts fetched:', data);
        setUserAccounts(data);
        // Set first account as default selection if available
        setSelectedAccountId(data[0].id);
      } else {
        // If no accounts, use default
        setUserAccounts([{ id: 'default', account_name: 'Default Account' }]);
        setSelectedAccountId('default');
      }
    } catch (err) {
      console.error('Error in fetchUserAccounts:', err);
      // Set a default account if there's an error
      setUserAccounts([{ id: 'default', account_name: 'Default Account' }]);
      setSelectedAccountId('default');
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !user || !contributionAmount) return;
    
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }
    
    // Debug goal type and family information
    console.log('Selected goal details before contribution:', {
      id: selectedGoal.id,
      name: selectedGoal.goal_name,
      isShared: selectedGoal.is_shared,
      familyId: selectedGoal.family_id,
      currentAmount: selectedGoal.current_amount,
      owner: selectedGoal.user_id,
      currentUser: user.id
    });
    
    setIsContributing(true);
    try {
      // Create contribution data - note: goal_contributions table doesn't have family_id column
      const contributionData = {
        goal_id: selectedGoal.id,
        user_id: user.id,
        amount: amount,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // Note: We don't include family_id in contribution data as that column doesn't exist
      // We'll only add family_id to the transaction record
      
      console.log('Creating contribution with data:', contributionData);
      
      // Create a contribution record
      const { data: contribution, error: contribError } = await supabase
        .from('goal_contributions')
        .insert(contributionData)
        .select();
        
      if (contribError) {
        console.error('Contribution insert error:', contribError);
        throw contribError;
      }
      
      console.log('Contribution created successfully:', contribution);
      
      // Update goal progress
      const newAmount = selectedGoal.current_amount + amount;
      const newStatus = newAmount >= selectedGoal.target_amount ? 'completed' : 'in_progress';
      
      console.log(`Updating goal ${selectedGoal.id} with new amount: ${newAmount}, new status: ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: newStatus
        })
        .eq('id', selectedGoal.id);
        
      if (updateError) {
        console.error('Goal update error:', updateError);
        throw updateError;
      }
      
      console.log('Goal updated successfully');
      
      // Also create a transaction record to ensure it appears in transaction history
      const transactionData: any = {
        user_id: user.id,
        goal_id: selectedGoal.id,
        amount: amount,
        date: new Date().toISOString(),
        type: 'expense',
        account_id: selectedAccountId, // Use selected account
        notes: `Contribution to goal: ${selectedGoal.goal_name}`,
        category: 'Contribution', // Explicitly set as "Contribution"
        category_id: 'contribution', // Set category_id for proper categorization
        created_at: new Date().toISOString()
      };
      
      // Add family_id for family goals
      if (selectedGoal.family_id) {
        transactionData.family_id = selectedGoal.family_id;
        console.log('This is a family goal, adding family_id:', selectedGoal.family_id);
      }
      
      console.log('Creating transaction record:', transactionData);
      
      // Create the transaction record
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select();
        
      if (txError) {
        console.error('Transaction insert error:', txError);
        // Don't throw error here, as the contribution itself succeeded
        console.warn('Warning: Transaction record creation failed but contribution was successful');
      } else {
        console.log('Transaction record created successfully:', txData);
      }
      
      showSuccessToast(`Successfully contributed ${formatCurrency(amount)} to ${selectedGoal.goal_name}`);
      
      // Manually refresh family data to show updated values
      await fetchFamilyData();
      await fetchFamilyGoals();
      
      // The subscription will update the UI automatically too
      closeContributeModal();
    } catch (error) {
      console.error("Error contributing to goal:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showErrorToast(`Failed to contribute to goal: ${errorMessage}`);
    } finally {
      setIsContributing(false);
    }
  };

  // Delete family confirmation modal
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  // Leave family function for regular members (not creators)
  const handleLeaveFamily = async () => {
    if (!familyData || !user) return;
    
    setIsDeleting(true);
    try {
      // Verify user is not the creator - they can't leave, only delete
      if (user.id === familyData.created_by) {
        showErrorToast("As the family creator, you must delete the family instead of leaving it.");
        setIsDeleting(false);
        closeDeleteModal();
        return;
      }

      // Remove the user's membership
      const { error: memberDeleteError } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyData.id)
        .eq('user_id', user.id);
        
      if (memberDeleteError) {
        throw new Error(`Error leaving family: ${memberDeleteError.message}`);
      }
      
      // Try to refresh the materialized view, but don't block on failure
      try {
        await refreshFamilyMembershipsView();
      } catch (refreshError) {
        console.warn("Failed to refresh materialized view (non-critical):", refreshError);
        // Continue anyway as this isn't critical
      }
      
      // Success - navigate to create family page
      showSuccessToast("You've successfully left the family group");
      
      // Add a short timeout to ensure Supabase events have time to propagate
      // before redirecting the user
      setTimeout(() => {
        navigate('/family/create');
      }, 300);
      
    } catch (err) {
      console.error("Error leaving family:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      
      showErrorToast(`Failed to leave family: ${errorMessage}`);
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  // Edit family function
  const navigateToEdit = () => {
    if (!familyData) return;
    navigate(`/family/edit/${familyData.id}`);
  };

  // --- HELPER FUNCTIONS ---

  const getCategoryName = (categoryId: number): string => {
    const categoryNames: { [key: number]: string } = {
      1: "Housing", 2: "Utilities", 3: "Groceries", 4: "Transportation", 5: "Dining Out",
      6: "Entertainment", 7: "Healthcare", 8: "Education", 9: "Shopping",
      10: "Personal Care", 11: "Travel", 12: "Subscriptions",
    };
    return categoryNames[categoryId] || `Category ${categoryId}`;
  };

  const calculateFamilyCategoryData = (transactions: Transaction[], startDate: string, endDate: string): CategoryData => {
    // Filter transactions by date range
    const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
    });

    // Group expense transactions by category
    const expenseTransactions = monthTransactions.filter(tx => tx.type === 'expense');
    const categoryMap = new Map<number, number>();
    const categoryNames = new Map<number, string>();

    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        const currentTotal = categoryMap.get(tx.category_id) || 0;
        categoryMap.set(tx.category_id, currentTotal + tx.amount);
        categoryNames.set(tx.category_id, getCategoryName(tx.category_id));
      }
    });

    // Prepare data for chart
    const labels: string[] = [];
    const data: number[] = [];
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#7BC225"];
    let colorIndex = 0;
    const backgroundColor: string[] = [];

    categoryMap.forEach((amount, categoryId) => {
      labels.push(categoryNames.get(categoryId) || `Category ${categoryId}`);
      data.push(amount);
      backgroundColor.push(colors[colorIndex % colors.length]);
      colorIndex++;
    });

    return {
      labels,
      datasets: [{ data, backgroundColor }],
    };
  };

  // Prepare budget performance data comparing budgeted vs. actual expenses by category
  const prepareBudgetPerformanceData = (budgets: any[], transactions: Transaction[]): BudgetPerformanceData => {
    // Group budgets by category
    const budgetsByCategory = new Map<number, number>();
    budgets.forEach(budget => {
      const categoryId = budget.category_id;
      const currentAmount = budgetsByCategory.get(categoryId) || 0;
      budgetsByCategory.set(categoryId, currentAmount + budget.amount);
    });
    
    // Group expenses by category
    const expensesByCategory = new Map<number, number>();
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      if (tx.category_id) {
        const currentAmount = expensesByCategory.get(tx.category_id) || 0;
        expensesByCategory.set(tx.category_id, currentAmount + tx.amount);
      }
    });
    
    // Combine data for chart
    const categories = new Set([...Array.from(budgetsByCategory.keys()), ...Array.from(expensesByCategory.keys())]);
    const labels: string[] = [];
    const budgetedData: number[] = [];
    const actualData: number[] = [];
    
    categories.forEach(categoryId => {
      labels.push(getCategoryName(categoryId));
      budgetedData.push(budgetsByCategory.get(categoryId) || 0);
      actualData.push(expensesByCategory.get(categoryId) || 0);
    });
    
    return {
      labels,
      datasets: [
        { label: "Budgeted", data: budgetedData },
        { label: "Actual", data: actualData },
      ]
    };
  };

  const formatBudgetPerformanceForHighcharts = (data: BudgetPerformanceData | null): any | null => {
    if (!data) return null;
    return {
      chart: {
        type: "column", 
        style: { fontFamily: 'Nunito, sans-serif' }, 
        backgroundColor: "transparent", 
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      xAxis: { categories: data.labels, crosshair: true, labels: { style: { color: "#858796" } } },
      yAxis: { 
        min: 0, 
        title: { text: null }, 
        gridLineColor: "#eaecf4", 
        gridLineDashStyle: "dash", 
        labels: { 
          formatter: function () { return formatCurrency((this as any).value); }, 
          style: { color: "#858796" } 
        } 
      },
      tooltip: { 
        shared: true, 
        useHTML: true, 
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>', 
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>{point.y:,.2f}</b></td></tr>', 
        footerFormat: '</table>', 
        valuePrefix: "$",
        animation: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: { 
        column: { pointPadding: 0.2, borderWidth: 0, borderRadius: 5, grouping: true },
        series: {
          animation: {
            duration: 1000
          }
        }
      },
      credits: { enabled: false },
      series: [
        { name: "Total Budgeted", data: data.datasets[0].data, color: "#4e73df", type: "column" },
        { name: "Total Spent", data: data.datasets[1].data, color: "#e74a3b", type: "column" },
      ],
    };
  };
  
  const formatCategoryDataForHighcharts = (data: CategoryData | null): any | null => {
    if (!data) return null;
    const pieData = data.labels.map((label, index) => ({
      name: label,
      y: data.datasets[0].data[index],
      sliced: index === 0,
      selected: index === 0,
    }));
    return {
      chart: { 
        type: "pie", 
        backgroundColor: "transparent", 
        style: { fontFamily: 'Nunito, sans-serif' }, 
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      tooltip: { 
        pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}',
        animation: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: { 
        pie: { 
          allowPointSelect: true, 
          cursor: "pointer", 
          dataLabels: { 
            enabled: true, 
            format: "<b>{point.name}</b>: {point.percentage:.1f}%", 
            style: { fontWeight: 'normal' }, 
            connectorWidth: 0, 
            distance: 30 
          }, 
          showInLegend: false, 
          size: '85%',
          animation: {
            duration: 1000
          }
        } 
      },
      credits: { enabled: false },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 500
          },
          chartOptions: {
            plotOptions: {
              pie: {
                dataLabels: {
                  enabled: false
                },
                showInLegend: true
              }
            }
          }
        }]
      },
      series: [{ 
        name: "Spending", 
        colorByPoint: true, 
        data: pieData,
        animation: {
          duration: 800
        }
      }],
    };
  };

  // Prepare family goal performance chart data (progress % for each goal)
  const prepareSharedGoalPerformanceData = (goals: Goal[] = familyGoals): any => {
    if (!goals || goals.length === 0) return null;
    
    // Sort goals by percentage completion, highest first
    const sortedGoals = [...goals].sort((a, b) => b.percentage - a.percentage);
    
    // Take only top 10 goals to avoid overcrowding
    const topGoals = sortedGoals.slice(0, 10);
    
    const goalNames = topGoals.map(goal => goal.goal_name);
    const goalPercentages = topGoals.map(goal => goal.percentage);
    const goalTargetAmounts = topGoals.map(goal => goal.target_amount);
    const goalCurrentAmounts = topGoals.map(goal => goal.current_amount);
    
    return {
      chart: {
        type: "bar",
        backgroundColor: "transparent",
        style: { fontFamily: 'Nunito, sans-serif' },
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      xAxis: { 
        categories: goalNames,
        title: { text: null },
        gridLineWidth: 0,
        labels: { style: { color: "#858796" } }
      },
      yAxis: {
        min: 0,
        max: 100,
        title: { text: "Completion (%)" },
        gridLineColor: "#eaecf4",
        gridLineDashStyle: "dash",
        labels: { format: "{value}%", style: { color: "#858796" } }
      },
      legend: { enabled: false },
      tooltip: {
        formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
          // Using type assertion to access the category and y properties
          const point = this.point as any;
          // Find the index of this point's category
          const idx = goalNames.indexOf(point.category);
          const goalData = topGoals[idx];
          
          // Create a customized tooltip
          return `<b>${point.category}</b><br>` +
            `Progress: <b>${point.y.toFixed(1)}%</b><br>` +
            `Current: <b>${formatCurrency(goalData.current_amount)}</b><br>` +
            `Target: <b>${formatCurrency(goalData.target_amount)}</b><br>` +
            `Remaining: <b>${formatCurrency(goalData.remaining)}</b>`;
        },
        useHTML: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: {
        bar: {
          dataLabels: {
            enabled: true,
            format: "{y}%",
          },
          colorByPoint: true
        },
        series: {
          animation: {
            duration: 1000
          }
        }
      },
      credits: { enabled: false },
      series: [{
        name: "Goal Progress",
        data: goalPercentages.map((value, i) => ({
          y: value,
          color: value >= 75 ? "#1cc88a" : // Green for high progress
                value >= 50 ? "#4e73df" : // Blue for medium progress
                value >= 25 ? "#f6c23e" : // Yellow for low progress
                "#e74a3b"  // Red for very low progress
        }))
      }]
    };
  };
  
  // Prepare family goal breakdown chart data (by status)
  const prepareSharedGoalBreakdownData = (goals: Goal[] = familyGoals): any => {
    if (!goals || goals.length === 0) return null;
    
    // Count goals by status
    const statusCounts: {[key: string]: number} = {
      "not_started": 0,
      "in_progress": 0,
      "completed": 0,
      "cancelled": 0
    };
    
    goals.forEach(goal => {
      if (statusCounts[goal.status] !== undefined) {
        statusCounts[goal.status]++;
      }
    });
    
    // Prepare data for pie chart
    const statusLabels = {
      "not_started": "Not Started",
      "in_progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    };
    
    const chartData = Object.keys(statusCounts).map(status => ({
      name: statusLabels[status as keyof typeof statusLabels],
      y: statusCounts[status],
      color: status === "completed" ? "#1cc88a" :
             status === "in_progress" ? "#4e73df" :
             status === "not_started" ? "#f6c23e" :
             "#e74a3b"
    }));
    
    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: { fontFamily: 'Nunito, sans-serif' },
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      tooltip: {
        pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}% ({point.y} goals)',
        animation: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
            style: { fontWeight: 'normal' },
            connectorWidth: 0,
            distance: 30
          },
          showInLegend: false,
          size: '85%',
          animation: {
            duration: 1000
          }
        }
      },
      credits: { enabled: false },
      responsive: {
        rules: [{
          condition: { maxWidth: 500 },
          chartOptions: {
            plotOptions: {
              pie: {
                dataLabels: { enabled: false },
                showInLegend: true
              }
            }
          }
        }]
      },
      series: [{
        name: "Goal Status",
        colorByPoint: true,
        data: chartData,
        animation: {
          duration: 800
        }
      }]
    };
  };

  // We'll use filteredGoals directly from updateGoalsData function

  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ top: rect.bottom + window.scrollY, left: rect.left + (rect.width / 2) + window.scrollX });
      }
    }
  };

  const getMemberRoleBadge = (role: "admin" | "viewer", isOwner: boolean = false) => {
    if (isOwner) {
      return (
        <>
          <span className="badge badge-danger mr-1">Owner</span>
          <span className="badge badge-primary">Admin</span>
        </>
      );
    }
    return role === "admin"
      ? <span className="badge badge-primary">Admin</span>
      : <span className="badge badge-secondary">Viewer</span>;
  };

  // Refresh charts when needed
  useEffect(() => {
    // Force redraw charts when data changes
    if (sharedGoalPerformanceChartRef.current?.chart) {
      sharedGoalPerformanceChartRef.current.chart.reflow();
    }
    
    if (sharedGoalBreakdownChartRef.current?.chart) {
      sharedGoalBreakdownChartRef.current.chart.reflow();
    }
    
    if (contributionBarChartRef.current?.chart) {
      contributionBarChartRef.current.chart.reflow();
    }
    
    if (contributionPieChartRef.current?.chart) {
      contributionPieChartRef.current.chart.reflow();
    }
  }, [sharedGoalPerformanceChartData, sharedGoalBreakdownChartData, contributionChartData, contributionPieChartData, familyGoals]);

  // --- RENDER LOGIC ---
  
  // States for no family section
  const initialNoFamilyTab = searchParams.get('view') as "create" | "join" || "create";
  const [noFamilyActiveTab, setNoFamilyActiveTab] = useState<"create" | "join">(initialNoFamilyTab);

  // Handle no-family tab change with URL update
  const handleNoFamilyTabChange = (tab: "create" | "join") => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', tab);
      return newParams;
    });
    setNoFamilyActiveTab(tab);
  };

  // No family data - show create or join options
  if (!familyData) {
    return (
      <div className="container-fluid">
        {/* Header */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
            Family Dashboard
          </h1>
          <div className="animate__animated animate__fadeIn">
            <Link to="/family/create" className="btn btn-success shadow-sm mr-2" style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}>
              <i className="fas fa-home mr-2"></i>Create Family
            </Link>
            <button 
              className="btn btn-primary shadow-sm" 
              style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
              onClick={() => handleNoFamilyTabChange("join")}
            >
              <i className="fas fa-users mr-2"></i>Join Family
            </button>
          </div>
        </div>
        
        <div className="card shadow mb-4 animate__animated animate__fadeIn">
          <div className="card-header py-3">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <a 
                  className={`nav-link ${noFamilyActiveTab === "create" ? "active" : ""}`} 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleNoFamilyTabChange("create"); }}
                >
                  <i className="fas fa-plus-circle mr-1"></i> Create a Family
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className={`nav-link ${noFamilyActiveTab === "join" ? "active" : ""}`} 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleNoFamilyTabChange("join"); }}
                >
                  <i className="fas fa-sign-in-alt mr-1"></i> Join a Family
                </a>
              </li>
            </ul>
          </div>

          <div className="card-body">
            {noFamilyActiveTab === "create" && (
              <div className="text-center py-4">
                <div className="mb-4">
                  <i className="fas fa-home fa-3x text-gray-300 mb-3"></i>
                  <h5 className="text-gray-500 font-weight-light mb-2">No Family Group Found</h5>
                  <p className="text-gray-500 mb-4 small">You're not part of a family group yet. Create one to start managing household finances together.</p>
                  <Link to="/family/create" className="btn btn-success">
                    <i className="fas fa-plus-circle mr-2"></i>Create a Family Group
                  </Link>
                </div>
                <div className="row justify-content-center mt-5">
                  <div className="col-lg-4 col-md-6">
                    <div className="card bg-light mb-4 shadow-sm">
                      <div className="card-body text-center py-3">
                        <i className="fas fa-users text-primary mb-2"></i>
                        <p className="mb-0 small">Track and manage your household finances together</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4 col-md-6">
                    <div className="card bg-light mb-4 shadow-sm">
                      <div className="card-body text-center py-3">
                        <i className="fas fa-chart-pie text-success mb-2"></i>
                        <p className="mb-0 small">Get a complete picture of your family's financial health</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4 col-md-6">
                    <div className="card bg-light mb-4 shadow-sm">
                      <div className="card-body text-center py-3">
                        <i className="fas fa-flag-checkered text-warning mb-2"></i>
                        <p className="mb-0 small">Work together to achieve your financial targets</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {noFamilyActiveTab === "join" && (
              <JoinFamily onJoinSuccess={() => fetchFamilyData()} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Function component approach might be causing issues
  // Removed separate component function and will use inline JSX instead

  // Tooltip contents
  const tooltipContent = {
    'family-income': {
      title: 'Family Income',
      description: 'Family Income shows the combined income of all family members for the current month. This includes salaries, freelance work, investments, and other income sources.'
    },
    'family-expenses': {
      title: 'Family Expenses',
      description: 'Family Expenses displays the total amount spent by all family members during the current month. This includes all expenses across different categories.'
    },
    'family-balance': {
      title: 'Family Balance',
      description: 'Family Balance is the difference between total income and total expenses. A positive balance indicates the family is spending less than it earns.'
    },
    'family-savings-rate': {
      title: 'Family Savings Rate',
      description: 'Family Savings Rate shows what percentage of income the family saves. It\'s calculated by dividing the difference between income and expenses by total income.'
    },
    'goal-performance': {
      title: 'Family Goal Performance',
      description: 'This chart shows the progress of all family shared goals. Each bar represents a goal\'s completion percentage, helping you easily identify which goals are on track and which need attention.'
    },
    'goal-status-breakdown': {
      title: 'Family Goal Status Breakdown',
      description: 'This chart shows the distribution of family goals by status (completed, in progress, not started, cancelled). It helps you understand the overall progress of your family\'s financial goals.'
    },
    'goal-contributions': {
      title: 'Goal Contributions',
      description: 'This chart shows how much each family member has contributed to the selected goal, helping you track individual participation in achieving shared family goals.'
    },
    'family-visibility': {
      title: 'Family Visibility',
      description: familyData?.is_public 
        ? 'This family is public. Other users can discover and request to join this family.'
        : 'This family is private. Only people who are invited can join this family.'
    }
  };

  // Function to fetch goal contributions for a specific goal
  const fetchGoalContributions = async (goalId: string) => {
    if (!goalId) return;
    
    setLoadingContributions(true);
    setSelectedGoalForContributions(goalId);
    
    try {
      console.log(`Fetching contributions for goal ID: ${goalId}`);
      
      // Get all contributions for this goal
      const { data, error } = await supabase
        .from('goal_contributions')
        .select(`
          id,
          goal_id,
          user_id,
          amount,
          date,
          created_at
        `)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        console.log(`Found ${data.length} contributions for goal ID ${goalId}:`, data);
        setGoalContributions(data);
        
        // Process data to group by member
        const memberContributions: {[key: string]: number} = {};
        const userIds = new Set(data.map(contrib => contrib.user_id));
        
        // If no contributions exist yet, include the goal creator as default contributor
        if (data.length === 0) {
          const goal = familyGoals.find(g => g.id === goalId);
          if (goal && goal.user_id) {
            userIds.add(goal.user_id);
            // Use the current goal amount as contribution
            memberContributions[goal.user_id] = goal.current_amount;
          }
        }
        
        // Get user profiles for the contributors
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, user_metadata')
          .in('id', Array.from(userIds));
          
        if (profilesError) {
          console.warn("Error fetching contributor profiles:", profilesError);
        }
        
        // Calculate total contributions by each member
        if (data.length > 0) {
          data.forEach(contrib => {
            if (!memberContributions[contrib.user_id]) {
              memberContributions[contrib.user_id] = 0;
            }
            memberContributions[contrib.user_id] += contrib.amount;
          });
        }
        
        console.log("Member contributions:", memberContributions);
        setContributionsByMember(memberContributions);
        
        // Create formatted data for charts
        formatContributionChartData(memberContributions, profiles || []);
      } else {
        // No contribution data found
        console.log("No contribution data found for goal");
        
        // Handle the case where there are no contributions yet
        // Use goal creator as the default contributor
        const goal = familyGoals.find(g => g.id === goalId);
        if (goal && goal.user_id) {
          const defaultContributions: {[key: string]: number} = {
            [goal.user_id]: goal.current_amount
          };
          
          // Get user profile for the goal creator
          const { data: creatorProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, user_metadata')
            .eq('id', goal.user_id)
            .single();
            
          setContributionsByMember(defaultContributions);
          formatContributionChartData(defaultContributions, creatorProfile ? [creatorProfile] : []);
        } else {
          // Fallback with empty data
          setContributionsByMember({});
          formatContributionChartData({}, []);
        }
      }
    } catch (err) {
      console.error("Error fetching goal contributions:", err);
      showErrorToast("Failed to load goal contributions");
      
      // Set empty data on error
      setContributionsByMember({});
      formatContributionChartData({}, []);
    } finally {
      setLoadingContributions(false);
    }
  };
  
  // Format contribution data for Highcharts
  const formatContributionChartData = (contributions: {[key: string]: number}, profiles: any[]) => {
    // Prepare data for bar chart
    const contributorNames: string[] = [];
    const contributionAmounts: number[] = [];
    const colors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#6f42c1"];
    
    // Process each contributor
    Object.entries(contributions).forEach(([userId, amount], index) => {
      // Find user profile
      const profile = profiles.find(p => p.id === userId);
      const name = profile?.user_metadata?.username || 
                  profile?.user_metadata?.full_name || 
                  profile?.email || 
                  "Family Member";
                  
      contributorNames.push(name);
      contributionAmounts.push(amount);
    });
    
    // Create bar chart config
    const barChartConfig = {
      chart: {
        type: "column",
        style: { fontFamily: 'Nunito, sans-serif' },
        backgroundColor: "transparent",
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      xAxis: { 
        categories: contributorNames,
        crosshair: true,
        labels: { style: { color: "#858796" } }
      },
      yAxis: {
        min: 0,
        title: { text: "Contribution Amount" },
        gridLineColor: "#eaecf4",
        gridLineDashStyle: "dash",
        labels: {
          formatter: function() { return formatCurrency((this as any).value); },
          style: { color: "#858796" }
        }
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">Contribution: </td><td style="padding:0"><b>₱{point.y:,.2f}</b></td></tr>',
        footerFormat: '</table>',
        valuePrefix: "₱",
        shared: true,
        useHTML: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 5
        },
        series: {
          animation: {
            duration: 1000
          }
        }
      },
      credits: { enabled: false },
      series: [{
        name: "Contribution",
        data: contributionAmounts,
        colorByPoint: true,
        colors: colors
      }]
    };
    
    // Create pie chart config
    const pieData = contributorNames.map((name, index) => ({
      name: name,
      y: contributionAmounts[index],
      sliced: index === 0,
      selected: index === 0
    }));
    
    const pieChartConfig = {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: { fontFamily: 'Nunito, sans-serif' },
        height: 350,
        animation: {
          duration: 800,
          easing: 'easeOutBounce'
        }
      },
      title: { text: null },
      tooltip: {
        pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>₱{point.y:,.2f}',
        valuePrefix: "₱",
        animation: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderRadius: 8,
        shadow: true
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
            style: { fontWeight: 'normal' },
            connectorWidth: 0,
            distance: 30
          },
          showInLegend: false,
          size: '85%',
          animation: {
            duration: 1000
          }
        }
      },
      credits: { enabled: false },
      responsive: {
        rules: [{
          condition: { maxWidth: 500 },
          chartOptions: {
            plotOptions: {
              pie: {
                dataLabels: { enabled: false },
                showInLegend: true
              }
            }
          }
        }]
      },
      series: [{
        name: "Contribution",
        colorByPoint: true,
        data: pieData,
        animation: {
          duration: 800
        }
      }]
    };
    
    setContributionChartData(barChartConfig);
    setContributionPieChartData(pieChartConfig);
  };

  return (
    <div className="container-fluid">
      {/* Delete/Leave Modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isCreator ? "Confirm Deletion" : "Confirm Leave Family"}</h5>
                <button type="button" className="close" onClick={closeDeleteModal} disabled={isDeleting}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                    style={{ width: "80px", height: "80px", backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                    <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
                  </div>
                </div>
                {isCreator ? (
                  <>
                    <p>Are you sure you want to delete your family group "{familyData?.family_name}"?</p>
                    <p className="text-muted small">This will remove all family member associations. Individual user data like transactions and goals will remain intact, but will no longer be associated with this family.</p>
                  </>
                ) : (
                  <>
                    <p>Are you sure you want to leave the family group "{familyData?.family_name}"?</p>
                    <p className="text-muted small">You will no longer have access to family financial data or shared goals. Your personal data will remain intact.</p>
                  </>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleLeaveFamily}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Leaving...
                    </>
                  ) : "Leave"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Goal Contribution Modal */}
      {showContributeModal && selectedGoal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Contribute to {selectedGoal.goal_name}</h5>
                  <button type="button" className="close" onClick={closeContributeModal}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="progress mb-3" style={{height: '10px'}}>
                    <div 
                      className={`progress-bar ${
                        selectedGoal.percentage >= 90 ? "bg-success" : 
                        selectedGoal.percentage >= 50 ? "bg-info" : 
                        selectedGoal.percentage >= 25 ? "bg-warning" : 
                        "bg-danger"
                      }`}
                      role="progressbar" 
                      style={{ width: `${selectedGoal.percentage}%` }}
                      aria-valuenow={selectedGoal.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <div>Current: {formatCurrency(selectedGoal.current_amount)}</div>
                    <div>Target: {formatCurrency(selectedGoal.target_amount)}</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="contributionAmount">Contribution Amount</label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text">$</span>
                      </div>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="contributionAmount" 
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="accountSelect">Select Account</label>
                    <select
                      className="form-control"
                      id="accountSelect"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      disabled={isContributing}
                    >
                      {userAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Choose the account from which to make this contribution.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeContributeModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={isContributing || !contributionAmount}
                    onClick={handleContribute}
                  >
                    {isContributing ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Contributing...
                      </>
                    ) : (
                      'Contribute Now'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
          {familyData?.family_name || "Family Dashboard"}
          {isCreator && (
            <span className="badge badge-primary ml-2">Creator</span>
          )}
          {familyData && (
            <span 
              className={`badge ml-2 ${familyData.is_public ? 'badge-success' : 'badge-secondary'}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => toggleTip('family-visibility', e)}
            >
              <i className={`fas ${familyData.is_public ? 'fa-globe' : 'fa-lock'} mr-1`}></i> 
              {familyData.is_public ? 'Public' : 'Private'}
            </span>
          )}
        </h1>
        <div className="animate__animated animate__fadeIn">
          {!familyData ? (
            <Link to="/family/create" className="btn btn-success shadow-sm mr-2" style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}>
              <i className="fas fa-home mr-2"></i>Create Family
            </Link>
          ) : (
            <>
              {isCreator ? (
                // Creator can delete and edit family
                <>
                  <button 
                    onClick={openDeleteModal} 
                    className="btn btn-danger shadow-sm mr-2"
                    style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                  >
                    <i className="fas fa-trash mr-2"></i> Delete Family
                  </button>
                  <button 
                    onClick={navigateToEdit} 
                    className="btn btn-primary mr-2 shadow-sm"
                    style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                  >
                    <i className="fas fa-edit mr-2"></i> Edit Family
                  </button>
                </>
              ) : (
                // Regular members can leave family
                <button 
                  onClick={openDeleteModal} 
                  className="btn btn-warning shadow-sm mr-2"
                  style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i> Leave Family
                </button>
              )}
              <Link to="/family/invite" className="btn btn-success shadow-sm" style={{ minWidth: "145px", padding: "10px 20px", fontSize: "16px" }}>
                <i className="fas fa-user-plus mr-2"></i> Invite Member
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Family Income
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-income', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.income) : formatCurrency(0)}
                  </div>
                  {!summaryData || summaryData.income === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> No income recorded this month
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-calendar fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Family Expenses
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-expenses', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.expenses) : formatCurrency(0)}
                  </div>
                  {!summaryData || summaryData.expenses === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> No expenses recorded this month
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fa-solid fa-people-roof fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Family Balance
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-balance', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData ? formatCurrency(summaryData.balance) : formatCurrency(0)}
                  </div>
                  {!summaryData ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Add transactions to calculate balance
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-clipboard-list fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Family Savings Rate
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-savings-rate', e)}
                    ></i>
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto"><div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">{summaryData ? formatPercentage(summaryData.savingsRate) : "0%"}</div></div>
                    <div className="col"><div className="progress progress-sm mr-2"><div className="progress-bar bg-success" role="progressbar" style={{ width: `${summaryData ? summaryData.savingsRate : 0}%` }}></div></div></div>
                  </div>
                  {!summaryData || summaryData.savingsRate === 0 ? (
                    <div className="small text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Record income to calculate savings rate
                    </div>
                  ) : null}
                </div>
                <div className="col-auto"><i className="fas fa-percentage fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "12px 15px",
            borderRadius: "8px",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            maxWidth: "300px",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          {activeTip && (
            <>
              <div className="font-weight-bold mb-2">{tooltipContent[activeTip as keyof typeof tooltipContent].title}</div>
              <p className="mb-0">{tooltipContent[activeTip as keyof typeof tooltipContent].description}</p>
            </>
          )}
        </div>
      )}
      
      {/* Tabs */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "overview" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); handleTabChange("overview"); }}>
                <i className="fas fa-chart-pie mr-1"></i> Overview
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "goals" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); handleTabChange("goals"); }}>
                <i className="fas fa-flag-checkered mr-1"></i> Family Goals
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "members" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); handleTabChange("members"); }}>
                <i className="fas fa-users mr-1"></i> Members ({members.length})
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "activity" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); handleTabChange("activity"); }}>
                <i className="fas fa-history mr-1"></i> Recent Activity
              </a>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === "overview" && (
            <div className="row animate__animated animate__fadeIn">
              {/* Family Shared Goal Performance Chart */}
              <div className="col-xl-8 col-lg-7">
                <div className="card shadow mb-4">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Family Goal Performance
                      <i 
                        className="fas fa-info-circle ml-1 text-gray-400"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => toggleTip('goal-performance', e)}
                      ></i>
                    </h6>
                  </div>
                  <div className="card-body">
                    {sharedGoalPerformanceChartData && sharedGoalPerformanceChartData.series && sharedGoalPerformanceChartData.series[0].data && sharedGoalPerformanceChartData.series[0].data.length > 0 ? (
                        <HighchartsReact highcharts={Highcharts} options={sharedGoalPerformanceChartData} ref={sharedGoalPerformanceChartRef} />
                    ) : ( 
                      <div className="text-center p-4">
                        <div className="mb-3">
                          <i className="fas fa-chart-bar fa-3x text-gray-300"></i>
                        </div>
                        <h5 className="text-gray-500 font-weight-light">No family goals available</h5>
                        <p className="text-gray-500 mb-0 small">Create shared goals for your family to track progress together.</p>
                        {isCreator && (
                          <Link to="/goals/create?share=family" className="btn btn-sm btn-primary mt-3">
                            <i className="fas fa-plus fa-sm mr-1"></i> Create Family Goal
                          </Link>
                        )}
                        {!isCreator && (
                          <p className="text-muted mt-2"><small><i className="fas fa-info-circle mr-1"></i> Only family creators can add new family goals</small></p>
                        )}
                      </div> 
                    )}
                  </div>
                </div>
              </div>
              {/* Goal Status Breakdown Chart */}
              <div className="col-xl-4 col-lg-5">
                <div className="card shadow mb-4">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Family Goal Status Breakdown
                      <i 
                        className="fas fa-info-circle ml-1 text-gray-400"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => toggleTip('goal-status-breakdown', e)}
                      ></i>
                    </h6>
                  </div>
                  <div className="card-body">
                    {sharedGoalBreakdownChartData && sharedGoalBreakdownChartData.series && sharedGoalBreakdownChartData.series[0].data && sharedGoalBreakdownChartData.series[0].data.length > 0 ? (
                        <HighchartsReact highcharts={Highcharts} options={sharedGoalBreakdownChartData} ref={sharedGoalBreakdownChartRef} />
                    ) : ( 
                      <div className="text-center p-4">
                        <div className="mb-3">
                          <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                        </div>
                        <h5 className="text-gray-500 font-weight-light">No family goals</h5>
                        <p className="text-gray-500 mb-0 small">Add family goals to see status breakdown.</p>
                      </div> 
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "goals" && (
            <div className="animate__animated animate__fadeIn">
              {/* Family Goals Header */}
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h6 className="m-0 font-weight-bold text-primary">Family Goals</h6>
                  <div>
                    <span className="badge badge-primary">
                      {familyGoals.length} {familyGoals.length === 1 ? 'goal' : 'goals'} found
                    </span>
                  </div>
                </div>
              </div>

              {isLoadingGoals ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="mt-3 text-gray-600">Loading family goals...</p>
                </div>
              ) : goalError ? (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle mr-2"></i> {goalError}
                </div>
              ) : familyGoals.length > 0 ? (
                <>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Goal</th>
                        <th>Owner</th>
                        <th>Progress</th>
                        <th>Amount</th>
                        <th>Target Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyGoals.map((goal) => {
                        const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
                        const statusClass = goal.status === "completed" ? "badge-success" : 
                                          goal.status === "in_progress" ? "badge-primary" :
                                          goal.status === "not_started" ? "badge-secondary" : "badge-warning";
                        const priorityBadgeClass = goal.priority === "high" ? "badge-danger" : 
                                                 goal.priority === "medium" ? "badge-warning" : "badge-info";
                        
                        return (
                          <tr key={goal.id}>
                            <td>
                              <div className="font-weight-bold">{goal.goal_name}</div>
                              <div className="small text-muted">
                                <span className="badge badge-info">
                                  <i className="fas fa-users mr-1"></i> Family Goal
                                </span>
                                {goal.shared_by && goal.user_id !== goal.shared_by && (
                                  <span className="badge badge-secondary ml-1">
                                    <i className="fas fa-share-alt mr-1"></i> Shared
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div>{goal.owner_name || "Family Member"}</div>
                              </div>
                            </td>
                            <td style={{width: "150px"}}>
                              <div className="progress" style={{height: '10px'}}>
                                <div 
                                  className={`progress-bar ${
                                    goal.status === "completed" ? "bg-success" :
                                    goal.progress_status === "good" ? "bg-success" : 
                                    goal.progress_status === "average" ? "bg-info" : 
                                    goal.progress_status === "poor" ? "bg-warning" : 
                                    progressPercentage >= 90 ? "bg-success" : 
                                    progressPercentage >= 50 ? "bg-info" : 
                                    progressPercentage >= 25 ? "bg-warning" : 
                                    "bg-danger"
                                  }`}
                                  role="progressbar" 
                                  style={{ width: `${progressPercentage}%` }}
                                  aria-valuenow={progressPercentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                ></div>
                              </div>
                              <div className="small text-muted text-center mt-1">
                                {formatPercentage(progressPercentage)}
                              </div>
                            </td>
                            <td>
                              <div className="font-weight-bold">{formatCurrency(goal.current_amount)}</div>
                              <div className="small text-muted">of {formatCurrency(goal.target_amount)}</div>
                            </td>
                            <td>
                              <div>{formatDate(goal.target_date)}</div>
                              <div className="small text-muted">
                                {getRemainingDays(goal.target_date)} days left
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusClass}`}>
                                {goal.status === "not_started" ? "Not Started" : 
                                 goal.status === "in_progress" ? "In Progress" : 
                                 goal.status === "completed" ? "Completed" : 
                                 "Cancelled"}
                              </span>
                              <div className="small mt-1">
                                <span className={`badge ${priorityBadgeClass}`}>
                                  {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="btn-group">
                                <button 
                                  className="btn btn-success btn-sm" 
                                  title="Contribute"
                                  onClick={() => openContributeModal(goal)}
                                >
                                  <i className="fas fa-plus mr-1"></i> Contribute
                                </button>
                                <button 
                                  className="btn btn-info btn-sm ml-1" 
                                  onClick={() => fetchGoalContributions(goal.id)}
                                  disabled={loadingContributions && selectedGoalForContributions === goal.id}
                                >
                                  {loadingContributions && selectedGoalForContributions === goal.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <i className="fas fa-chart-bar"></i>
                                  )}
                                </button>
                                <Link to={`/goals/${goal.id}`} className="btn btn-primary btn-sm ml-1">
                                  <i className="fas fa-eye"></i>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                  
                  {/* Contribution Visualization Section */}
                  {selectedGoalForContributions && (
                    <div className="card shadow mb-4 mt-4 animate__animated animate__fadeIn">
                      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                        <h6 className="m-0 font-weight-bold text-primary">
                          Family Goal Contributions
                          <i 
                            className="fas fa-info-circle ml-2 text-gray-400"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => toggleTip('goal-contributions', e)}
                          ></i>
                        </h6>
                        <div>
                          <strong>{familyGoals.find(g => g.id === selectedGoalForContributions)?.goal_name || "Shared Goal"}</strong>
                        </div>
                      </div>
                      <div className="card-body">
                        {loadingContributions ? (
                          <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="sr-only">Loading...</span>
                            </div>
                            <p className="text-gray-600 mt-2">Loading contribution data...</p>
                          </div>
                        ) : goalContributions.length > 0 ? (
                          <div className="row">
                            <div className="col-xl-6 mb-4">
                              <div className="card h-100">
                                <div className="card-header py-3">
                                  <h6 className="m-0 font-weight-bold text-primary">Contribution by Member</h6>
                                </div>
                                <div className="card-body">
                                  {contributionChartData && (
                                      <HighchartsReact 
                                        highcharts={Highcharts} 
                                        options={contributionChartData}
                                        ref={contributionBarChartRef} 
                                      />
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="col-xl-6 mb-4">
                              <div className="card h-100">
                                <div className="card-header py-3">
                                  <h6 className="m-0 font-weight-bold text-primary">Contribution Breakdown</h6>
                                </div>
                                <div className="card-body">
                                  {contributionPieChartData && (
                                      <HighchartsReact 
                                        highcharts={Highcharts} 
                                        options={contributionPieChartData}
                                        ref={contributionPieChartRef} 
                                      />
                                  )}
                                </div>
                              </div>
                            </div>
                </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="mb-3">
                              <i className="fas fa-users fa-3x text-gray-300"></i>
                            </div>
                            <h5 className="text-gray-500 font-weight-light">No Contributions Yet</h5>
                            <p className="text-gray-500 mb-0 small">
                              No one has contributed to this goal yet. 
                              Be the first to contribute and help reach this family goal!
                            </p>
                            <button 
                              className="btn btn-primary mt-3" 
                              onClick={() => {
                                                const goal = familyGoals.find(g => g.id === selectedGoalForContributions);
                if (goal) openContributeModal(goal);
                              }}
                            >
                              <i className="fas fa-plus-circle mr-2"></i>
                              Make First Contribution
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-flag-checkered fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No family goals found</h5>
                  <p className="text-gray-500 mb-0 small">Create a goal and share it with family members to track progress together.</p>
                  {isCreator && (
                    <Link to="/goals/create?share=family" className="btn btn-sm btn-primary mt-3">
                      <i className="fas fa-plus fa-sm mr-1"></i> Create Family Goal
                    </Link>
                  )}
                  {!isCreator && (
                    <div className="alert alert-info mt-3 text-left" role="alert">
                      <i className="fas fa-info-circle mr-1"></i> As a family member, you can contribute to existing family goals, but only the family creator can add new family goals.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="animate__animated animate__fadeIn">
              {/* Pending Join Requests Section (only visible to admins) */}
              {isCreator && (
                <JoinRequestsSection />
              )}

              <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                <h5 className="text-primary font-weight-bold">Family Members</h5>
                <Link to="/family/invite" className="btn btn-sm btn-primary">
                  <i className="fas fa-user-plus mr-2"></i> Invite Member
                </Link>
              </div>
              
              {members.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered" width="100%" cellSpacing="0">
                    <thead><tr><th>User</th><th>Role</th><th>Join Date</th><th>Last Active</th><th>Actions</th></tr></thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img 
                                className="img-profile rounded-circle mr-3" 
                                src={member.user?.user_metadata?.avatar_url || `../images/placeholder.png`} 
                                alt={member.user?.user_metadata?.username || member.user?.user_metadata?.full_name || "User"} 
                                width="40" 
                                height="40" 
                              />
                              <div>
                                <div className="font-weight-bold">{member.user?.user_metadata?.username || member.user?.user_metadata?.full_name || "User"}</div>
                                <div className="small text-gray-600">{member.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{getMemberRoleBadge(member.role, familyData && member.user_id === familyData.created_by)}</td>
                          <td>{formatDate(member.created_at)}</td>
                          <td>{member.user?.last_sign_in_at ? formatDate(member.user.last_sign_in_at) : "Never"}</td>
                          <td>
                            <button className="btn btn-danger btn-circle btn-sm"><i className="fas fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-users fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No family members yet</h5>
                  <p className="text-gray-500 mb-0 small">Invite your family members to join and collaborate on your finances.</p>
                  <Link to="/family/invite" className="btn btn-sm btn-primary mt-3">
                    <i className="fas fa-user-plus fa-sm mr-1"></i> Invite Family Member
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="animate__animated animate__fadeIn">
              {recentActivity.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {recentActivity.map(activity => (
                    <li key={activity.id} className="list-group-item d-flex align-items-center">
                      <div className={`mr-3 text-white rounded-circle d-flex align-items-center justify-content-center bg-${activity.color}`} style={{width: '40px', height: '40px'}}>
                          <i className={`fas ${activity.icon}`}></i>
                      </div>
                      <div>
                        <strong>{activity.user?.user_metadata?.username || activity.user?.user_metadata?.full_name || "User"}</strong> {activity.description}
                        <div className="small text-gray-500">{formatDate(activity.date)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="fas fa-history fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-500 font-weight-light">No recent activity</h5>
                  <p className="text-gray-500 mb-3 small">Family activity feed will be shown here as you and your family members take financial actions.</p>
                  <div className="row justify-content-center">
                    <div className="col-md-4">
                      <div className="card bg-light mb-3 shadow-sm">
                        <div className="card-body text-center py-3">
                          <i className="fas fa-user-plus text-primary mb-2"></i>
                          <p className="mb-0 small">Add family members</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light mb-3 shadow-sm">
                        <div className="card-body text-center py-3">
                          <i className="fas fa-money-bill-alt text-success mb-2"></i>
                          <p className="mb-0 small">Record transactions</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light mb-3 shadow-sm">
                        <div className="card-body text-center py-3">
                          <i className="fas fa-flag-checkered text-warning mb-2"></i>
                          <p className="mb-0 small">Create shared goals</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default FamilyDashboard;
