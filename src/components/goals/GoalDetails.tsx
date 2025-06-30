import React, { useState, useEffect, FC, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import { Goal as GoalType, Transaction } from "../../types";
import { useCurrency } from "../../utils/CurrencyContext";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface RouteParams {
  id: string;
}

const GoalDetails: FC = () => {
  const { id } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const { currencySymbol } = useCurrency();
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Contribution modal states
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [contributionAmount, setContributionAmount] = useState<string>("");
  const [isContributing, setIsContributing] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("default");
  const [userAccounts, setUserAccounts] = useState<{id: string, account_name: string}[]>([]);
  
  // Family status states
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false);
  const [userFamilyId, setUserFamilyId] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<"admin" | "viewer" | null>(null);
  const [isSharedGoal, setIsSharedGoal] = useState<boolean>(false);
  const [isGoalOwner, setIsGoalOwner] = useState<boolean>(false);
  const [familyName, setFamilyName] = useState<string>("");
  
  // Create refs for Highcharts instances
  const progressChartRef = useRef<any>(null);
  const contributionsChartRef = useRef<any>(null);
  const timelineChartRef = useRef<any>(null);
  
  // Progress chart config
  const [progressConfig, setProgressConfig] = useState<any>(null);
  const [contributionsConfig, setContributionsConfig] = useState<any>(null);
  const [timelineConfig, setTimelineConfig] = useState<any>(null);

  // For real-time subscriptions
  const [goalSubscription, setGoalSubscription] = useState<any>(null);
  const [transactionSubscription, setTransactionSubscription] = useState<any>(null);

  // Function to fetch goal data from Supabase
  const fetchGoalData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        showErrorToast("Please sign in to view goal details");
        navigate("/login");
        return;
      }

      // Try fetching goal details from goal_details view
      let goalData;
      let goalError;
      
      try {
        // First try from goal_details view
        const result = await supabase
          .from('goal_details')
          .select('*')
          .eq('id', id)
          .single();
          
        goalData = result.data;
        goalError = result.error;
      } catch (err) {
        // Fall back to direct goals table
        console.log("Error with goal_details view, falling back to goals table");
        const result = await supabase
          .from('goals')
          .select('*')
          .eq('id', id)
          .single();
          
        goalData = result.data;
        goalError = result.error;
      }
      
      // If we have an error and no data, handle accordingly
      if (goalError && !goalData) {
        throw new Error(`Error fetching goal: ${goalError.message}`);
      }
      
      if (!goalData) {
        // Goal not found
        setLoading(false);
        return;
      }

      setGoal(goalData as unknown as GoalType);
      
      // Try fetching related transactions - first from transaction_details view
      let transactionsData;
      let transactionsError;
      
      try {
        // First try from transaction_details view
        const result = await supabase
          .from('transaction_details')
          .select('*')
          .eq('goal_id', id)
          .order('date', { ascending: false });
          
        transactionsData = result.data;
        transactionsError = result.error;
      } catch (err) {
        console.log("Error with transaction_details view, falling back to transactions table");
        
        // If that fails, try from transactions table directly
        const result = await supabase
          .from('transactions')
          .select('*')
          .eq('goal_id', id)
          .order('date', { ascending: false });
          
        transactionsData = result.data;
        transactionsError = result.error;
      }
      
      // If we still have an error and no data, log it but continue
      if (transactionsError && !transactionsData) {
        console.error("Error fetching transactions:", transactionsError.message);
        // Continue with empty transactions
        transactionsData = [];
      }
      
      // Also fetch goal_contributions specifically for this goal
      let contributionsData = [];
      try {
        console.log(`Fetching goal contributions for goal ID: ${id}`);
        const { data: contribData, error: contribError } = await supabase
          .from('goal_contributions')
          .select('*')
          .eq('goal_id', id)
          .order('date', { ascending: false });
          
        if (contribError) {
          console.error("Error fetching goal contributions:", contribError.message);
        } else if (contribData) {
          console.log(`Found ${contribData.length} contributions for this goal:`, contribData);
          
          // Convert contributions to transaction format for compatibility
          contributionsData = contribData.map(contribution => ({
            id: contribution.id,
            goal_id: contribution.goal_id,
            user_id: contribution.user_id,
            amount: contribution.amount,
            date: contribution.date,
            notes: "Goal contribution",
            type: "expense",
            category: "Goal Contribution",
            created_at: contribution.created_at
          }));
          
          // Merge with transactions if any exist
          if (transactionsData && transactionsData.length > 0) {
            // Filter out any potential duplicates by checking IDs
            const existingIds = new Set(transactionsData.map(t => t.id));
            const newContributions = contributionsData.filter(c => !existingIds.has(c.id));
            transactionsData = [...transactionsData, ...newContributions];
          } else {
            transactionsData = contributionsData;
          }
        }
      } catch (err) {
        console.error("Error processing goal contributions:", err);
      }
      
      // Sort the combined transactions by date (newest first)
      if (transactionsData && transactionsData.length > 0) {
        transactionsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      console.log(`Final transactions data (${transactionsData?.length || 0} items):`, transactionsData);
      setTransactions(transactionsData || []);
        
        // Create chart configurations after data is loaded
          createChartConfigs(
        goalData as unknown as GoalType,
        transactionsData || []
          );

      setLoading(false);
      setHighchartsLoaded(true);
    } catch (err) {
      console.error("Error loading goal data:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to load goal details: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Avoid dependency cycle with fetchGoalData and useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedFetchGoalData = React.useCallback(fetchGoalData, [id, user, navigate, showErrorToast]);

  // Initial data load and refresh when navigating back from contribution
  useEffect(() => {
    memoizedFetchGoalData();
    
    // Add listener for when user returns from contribution page
    const handleFocus = () => {
      console.log("Window focused, refreshing goal data");
      memoizedFetchGoalData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [memoizedFetchGoalData]);
  
  // Check if user is part of a family
  useEffect(() => {
    const checkFamilyStatus = async () => {
      if (!user || !goal) return;
      
      try {
        // First try to query the family_members directly
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select(`
            id,
            family_id,
            role,
            status,
            families:family_id (
              id,
              family_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (!memberError && memberData && memberData.length > 0) {
          setIsFamilyMember(true);
          setUserFamilyId(memberData[0].family_id);
          setFamilyRole(memberData[0].role as "admin" | "viewer");
          
          // Get the family name from the nested families object
          if (memberData[0].families && 
              typeof memberData[0].families === 'object' && 
              'family_name' in memberData[0].families) {
            setFamilyName(memberData[0].families.family_name as string);
          }
        } else {
          // Fallback to the function
          const { data: familyStatus, error: statusError } = await supabase.rpc(
            'check_user_family',
            { p_user_id: user.id }
          );
          
          if (!statusError && familyStatus && 
              ((Array.isArray(familyStatus) && familyStatus.length > 0 && familyStatus[0].is_member) || 
              (familyStatus.is_member))) {
            // Extract the family ID from the response based on format
            const familyId = Array.isArray(familyStatus) 
              ? familyStatus[0].family_id 
              : familyStatus.family_id;
              
            setIsFamilyMember(true);
            setUserFamilyId(familyId);
            
            // Fetch role
            const { data: roleData, error: roleError } = await supabase
              .from('family_members')
              .select('role')
              .eq('user_id', user.id)
              .eq('family_id', familyId)
              .single();
              
            if (!roleError && roleData) {
              setFamilyRole(roleData.role as "admin" | "viewer");
            }
            
            // Fetch family name
            const { data: familyData, error: familyError } = await supabase
              .from('families')
              .select('family_name')
              .eq('id', familyId)
              .single();
              
            if (!familyError && familyData) {
              setFamilyName(familyData.family_name);
            }
          } else {
            setIsFamilyMember(false);
            setUserFamilyId(null);
            setFamilyRole(null);
          }
        }
        
        // Check if this is a shared goal
        const isShared = goal.family_id !== undefined && goal.family_id !== null;
        setIsSharedGoal(isShared);
        
        // If this is a shared goal but we don't have the family name yet, fetch it
        if (isShared && goal.family_id && !familyName) {
          const { data: goalFamilyData, error: goalFamilyError } = await supabase
            .from('families')
            .select('family_name')
            .eq('id', goal.family_id)
            .single();
            
          if (!goalFamilyError && goalFamilyData) {
            setFamilyName(goalFamilyData.family_name);
          }
        }
        
        // Check if the user is the goal owner
        setIsGoalOwner(goal.user_id === user.id);
        
      } catch (err) {
        console.error("Error checking family status:", err);
        setIsFamilyMember(false);
      }
    };
    
    checkFamilyStatus();
  }, [user, goal, familyName]);
  
  // Contribution handling functions
  const openContributeModal = () => {
    setContributionAmount("");
    fetchUserAccounts();
    setShowContributeModal(true);
  };
  
  const closeContributeModal = () => {
    setShowContributeModal(false);
    setContributionAmount("");
    setIsContributing(false);
  };

  // Function to fetch user accounts
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
    if (!goal || !user) return;
    
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }
    
    // Debug goal type and family information
    console.log('Goal details before contribution:', {
      id: goal.id,
      name: goal.goal_name,
      isSharedGoal,
      familyId: goal.family_id,
      currentAmount: goal.current_amount
    });
    
    setIsContributing(true);
    try {
      // Create a contribution record
      const contributionData = {
        goal_id: goal.id,
        user_id: user.id,
        amount: amount,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // Note: family_id is not included in contribution data as that column doesn't exist
      // We'll only add family_id to the transaction record
      
      console.log('Creating contribution with data:', contributionData);
      
      // Create the contribution record
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
      const newAmount = goal.current_amount + amount;
      const newStatus = newAmount >= goal.target_amount ? 'completed' : 'in_progress';
      
      console.log(`Updating goal ${goal.id} with new amount: ${newAmount}, new status: ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: newStatus
        })
        .eq('id', goal.id);
        
      if (updateError) {
        console.error('Goal update error:', updateError);
        throw updateError;
      }
      
      console.log('Goal updated successfully');
      
      // Also create a transaction record to ensure it appears in transaction history
      // Check if the transactions table has all required fields
      const transactionData: any = {
        user_id: user.id,
        goal_id: goal.id,
        amount: amount,
        date: new Date().toISOString(),
        type: 'expense',
        account_id: selectedAccountId, // Use selected account
        notes: `Contribution to goal: ${goal.goal_name}`,
        category: 'Contribution', // Explicitly set as "Contribution"
        category_id: 'contribution', // Set category_id for proper categorization
        created_at: new Date().toISOString()
      };
      
      // Add family_id for family goals
      if (isSharedGoal && goal.family_id) {
        transactionData.family_id = goal.family_id;
      }
      
      console.log('Creating transaction record:', transactionData);
      
      try {
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
      } catch (txErr) {
        // If transaction insert fails completely, log it but don't fail the whole contribution
        console.error('Transaction creation error (contribution still succeeded):', txErr);
      }
      
      showSuccessToast(`Successfully contributed ${formatCurrency(amount)} to ${goal.goal_name}`);
      
      // Manually refresh data instead of relying just on subscription
      await memoizedFetchGoalData();
      
      // Close the modal
      closeContributeModal();
    } catch (error) {
      console.error("Error contributing to goal:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showErrorToast(`Failed to contribute to goal: ${errorMessage}`);
    } finally {
      setIsContributing(false);
    }
  };
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !id) return;
    
    // Clean up any existing subscriptions
    if (goalSubscription) {
      supabase.removeChannel(goalSubscription);
    }
    
    if (transactionSubscription) {
      supabase.removeChannel(transactionSubscription);
    }
    
    // Set up goal subscription
    const newGoalSubscription = supabase
      .channel(`goal_${id}_changes`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals', 
        filter: `id=eq.${id}`
      }, (payload) => {
        console.log('Goal update received:', payload);
        
        // Refresh the goal data
        const fetchUpdatedGoal = async () => {
          try {
            const { data, error } = await supabase
              .from('goal_details')
              .select('*')
              .eq('id', id)
              .single();
              
            if (error) throw error;
            
            if (data) {
              setGoal(data as unknown as GoalType);
              
              // Update chart configs if needed
              if (transactions.length > 0) {
                createChartConfigs(data as unknown as GoalType, transactions);
              }
            }
          } catch (err) {
            console.error("Error refreshing goal data:", err);
          }
        };
        
        fetchUpdatedGoal();
      })
      .subscribe();
    
    // Set up transactions subscription
    const newTransactionSubscription = supabase
      .channel(`goal_${id}_transactions`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions', 
        filter: `goal_id=eq.${id}`
      }, (payload) => {
        console.log('Transaction update received:', payload);
        
        // Refresh transactions related to this goal
        const fetchUpdatedTransactions = async () => {
          try {
            // Try fetching from transaction_details view first
            let result;
            
            try {
              result = await supabase
                .from('transaction_details')
                .select('*')
                .eq('goal_id', id)
                .order('date', { ascending: false });
            } catch (err) {
              // Fall back to transactions table
              console.log("Error with transaction_details view in subscription, falling back");
              result = await supabase
                .from('transactions')
                .select('*')
                .eq('goal_id', id)
                .order('date', { ascending: false });
            }
            
            // If we have an error, log it but don't fail
            if (result.error) {
              console.error("Error refreshing transaction data:", result.error);
            }
            
            // Update transactions if we have data
            if (result.data) {
              setTransactions(result.data);
              
              // Also fetch the latest goal data to ensure we have the most up-to-date current_amount
              const { data: updatedGoalData, error: goalError } = await supabase
                .from('goal_details')
                .select('*')
                .eq('id', id)
                .single();
                
              if (!goalError && updatedGoalData) {
                // Update goal data and charts with the latest information
                setGoal(updatedGoalData as unknown as GoalType);
                createChartConfigs(updatedGoalData as unknown as GoalType, result.data);
              } else {
                // If we can't get the latest goal data, still update the charts with what we have
                if (goal) {
                  createChartConfigs(goal, result.data);
                }
              }
            }
          } catch (err) {
            console.error("Error refreshing transaction data:", err);
          }
        };
        
        fetchUpdatedTransactions();
      })
      .subscribe();
    
    // Set up contributions subscription
    const contributionsSubscription = supabase
      .channel(`goal_${id}_contributions`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goal_contributions', 
        filter: `goal_id=eq.${id}`
      }, (payload) => {
        console.log('Goal contribution update received:', payload);
        
        // Refresh all goal data including transactions and contributions
        memoizedFetchGoalData();
      })
      .subscribe();
    
    // Save subscription references
    setGoalSubscription(newGoalSubscription);
    setTransactionSubscription(newTransactionSubscription);
    
    // Clean up subscriptions on component unmount
    return () => {
      console.log("Cleaning up subscriptions");
      if (newGoalSubscription) supabase.removeChannel(newGoalSubscription);
      if (newTransactionSubscription) supabase.removeChannel(newTransactionSubscription);
      if (contributionsSubscription) supabase.removeChannel(contributionsSubscription);
    };
  }, [id, user]);
  
  const createChartConfigs = (goal: GoalType, transactions: Transaction[]) => {
    // Progress gauge chart
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    setProgressConfig({
      chart: {
        type: 'solidgauge',
        height: 200,
        backgroundColor: 'transparent',
      },
      title: null,
      pane: {
        center: ['50%', '85%'],
        size: '140%',
        startAngle: -90,
        endAngle: 90,
        background: {
          backgroundColor: '#EEE',
          innerRadius: '60%',
          outerRadius: '100%',
          shape: 'arc'
        }
      },
      tooltip: {
        enabled: false
      },
      yAxis: {
        min: 0,
        max: 100,
        stops: [
          [0.3, '#e74a3b'], // red
          [0.5, '#f6c23e'], // yellow
          [0.7, '#1cc88a']  // green
        ],
        lineWidth: 0,
        tickWidth: 0,
        minorTickInterval: null,
        tickAmount: 2,
        labels: {
          enabled: false
        }
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true
          }
        }
      },
      credits: {
        enabled: false
      },
      series: [{
        name: 'Progress',
        data: [{
          y: Math.min(progressPercentage, 100),
          innerRadius: '60%',
          radius: '100%'
        }],
        dataLabels: {
          format: '<div style="text-align:center"><span style="font-size:24px;font-weight:bold">{y:.1f}%</span></div>'
        },
        rounded: true
      }]
    });
    
    // Fallback circular progress chart in case solidgauge module isn't loaded
    if (!Highcharts.seriesTypes.solidgauge) {
      setProgressConfig({
        chart: {
          type: 'pie',
          height: 200,
          backgroundColor: 'transparent'
        },
        title: null,
        tooltip: {
          enabled: false
        },
        plotOptions: {
          pie: {
            innerSize: '80%',
            dataLabels: {
              enabled: false
            },
            borderWidth: 0,
            startAngle: -90,
            endAngle: 90,
            center: ['50%', '85%']
          }
        },
        series: [{
          name: 'Progress',
          data: [
            {
              name: 'Completed',
              y: Math.min(progressPercentage, 100),
              color: progressPercentage >= 75 ? '#1cc88a' : 
                     progressPercentage >= 40 ? '#f6c23e' : '#e74a3b'
            },
            {
              name: 'Remaining',
              y: Math.max(0, 100 - progressPercentage),
              color: '#e9ecef'
            }
          ],
          size: '170%',
          innerSize: '80%'
        }],
        credits: {
          enabled: false
        }
      });
    }
    
    // Contributions over time chart
    const contributionsByMonth: { [key: string]: number } = {};
    
    // Make sure we have valid transactions with date and amount properties
    if (transactions && transactions.length > 0) {
      transactions.forEach(transaction => {
        if (transaction.date && transaction.amount) {
          const month = transaction.date.substring(0, 7); // Format: YYYY-MM
          if (!contributionsByMonth[month]) {
            contributionsByMonth[month] = 0;
          }
          contributionsByMonth[month] += transaction.amount;
        }
      });
    }
    
    const sortedMonths = Object.keys(contributionsByMonth).sort();
    const contributionData = sortedMonths.map(month => contributionsByMonth[month]);
    
    setContributionsConfig({
      chart: {
        type: 'column',
        height: 250,
        backgroundColor: 'transparent',
        style: {
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      title: {
        text: null
      },
      xAxis: {
        categories: sortedMonths.map(month => {
          const date = new Date(month + '-01');
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        crosshair: true,
        labels: {
          style: {
            color: '#858796'
          }
        }
      },
             yAxis: {
         min: 0,
         title: {
           text: null
         },
         gridLineColor: '#eaecf4',
         gridLineDashStyle: 'dash',
         labels: {
           format: `${currencySymbol}{value}`,
           style: {
             color: '#858796'
           }
         }
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          `<td style="padding:0"><b>${currencySymbol}{point.y:.2f}</b></td></tr>`,
        footerFormat: '</table>',
        shared: true,
        useHTML: true,
        style: {
          fontSize: '12px',
          fontFamily: "'Nunito', 'Segoe UI', Roboto, sans-serif"
        }
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 4
        },
        series: {
          animation: {
            duration: 1000
          }
        }
      },
      series: [{
        name: 'Contributions',
        data: contributionData,
        color: '#4e73df',
        type: 'column'
      }],
      credits: {
        enabled: false
      }
    });
    
    // Timeline/projection chart
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    const monthDiff = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
    
    // Create monthly projection data points
    const projectionData = [];
    const totalContributed = transactions && transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      : 0;
    const monthlyRate = calculateMonthlySavingsForGoal(goal);
    let currentAmount = goal.current_amount;
    
    // Historical data - assume we have the current amount already saved
    projectionData.push({
      x: today.getTime(),
      y: currentAmount,
      marker: {
        fillColor: '#4e73df',
        radius: 5
      }
    });
    
    // Future projection data
    for (let i = 1; i <= monthDiff + 1; i++) {
      const projDate = new Date(today);
      projDate.setMonth(today.getMonth() + i);
      
      currentAmount += monthlyRate;
      if (currentAmount > goal.target_amount) {
        // If we hit the target before the target date
        projectionData.push({
          x: projDate.getTime(),
          y: goal.target_amount,
          marker: {
            fillColor: '#1cc88a',
            radius: 6,
            symbol: 'circle'
          }
        });
        break;
      } else {
        projectionData.push({
          x: projDate.getTime(),
          y: currentAmount
        });
      }
    }
    
    // Add target point
    projectionData.push({
      x: targetDate.getTime(),
      y: goal.target_amount,
      marker: {
        fillColor: '#1cc88a',
        radius: 7,
        symbol: 'diamond'
      },
      dataLabels: {
        enabled: true,
        format: 'Target: ${y}'
      }
    });
    
    setTimelineConfig({
      chart: {
        type: 'spline',
        height: 250,
        backgroundColor: 'transparent'
      },
      title: {
        text: null
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%b %Y}'
        }
      },
             yAxis: {
         min: 0,
         max: Math.ceil(goal.target_amount * 1.1 / 1000) * 1000, // Round up to nearest 1000
         title: {
           text: null
         },
         labels: {
           format: `${currencySymbol}{value}`
         },
        plotLines: [{
          value: goal.target_amount,
          color: '#1cc88a',
          dashStyle: 'shortdash',
          width: 2,
          label: {
            text: `Target: ${currencySymbol}${goal.target_amount}`
          }
        }]
      },
      tooltip: {
        headerFormat: '<b>{point.x:%b %Y}</b><br>',
        pointFormat: `Projected Balance: ${currencySymbol}{point.y:,.2f}`
      },
      plotOptions: {
        spline: {
          marker: {
            enabled: false
          },
          lineWidth: 3
        }
      },
      series: [{
        name: 'Balance Projection',
        data: projectionData,
        color: '#4e73df'
      }],
      credits: {
        enabled: false
      }
    });
  };

  const openDeleteModal = (): void => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = (): void => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  const handleDelete = async (): Promise<void> => {
    try {
      setIsDeleting(true);
      
      if (!user) {
        showErrorToast("You must be signed in to delete goals");
        setIsDeleting(false);
        closeDeleteModal();
        return;
      }
      
      // Delete goal from Supabase
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw new Error(`Error deleting goal: ${error.message}`);
      }
      
      showSuccessToast("Goal deleted successfully!");
      closeDeleteModal();
      navigate("/goals");
    } catch (err) {
      console.error("Error deleting goal:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to delete goal: ${errorMessage}`);
      setIsDeleting(false);
    }
  };

  // Updated toggle tip function to position tooltips correctly below each info icon
  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        // Get the position of the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate position accounting for scroll
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <h4 className="text-gray-800 mt-3 mb-2">Loading goal details...</h4>
          <p className="text-gray-600">Please wait while we retrieve your goal information</p>
          <div className="progress mt-4" style={{ height: "10px", maxWidth: "300px", margin: "0 auto" }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 animate__animated animate__fadeIn">
          <div className="error-icon mb-4">
            <i className="fas fa-database fa-4x text-danger"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Error Loading Goal</h1>
          <p className="mb-4 text-gray-600">Unable to load goal details: {error}</p>
          <div className="mb-4">
            <p className="text-gray-600">You can try one of the following:</p>
            <div className="d-flex flex-column flex-md-row justify-content-center mt-3">
              <button 
                onClick={() => { 
                  setError(null); 
                  setLoading(true); 
                  memoizedFetchGoalData(); 
                }}
                className="btn btn-primary mb-2 mb-md-0 mr-md-3"
              >
                <i className="fas fa-sync-alt mr-2"></i> Try Again
              </button>
              <Link to="/goals" className="btn btn-secondary mb-2 mb-md-0 mr-md-3">
                <i className="fas fa-arrow-left mr-2"></i> Back to Goals
              </Link>
              <Link to="/goals/create" className="btn btn-success">
                <i className="fas fa-plus-circle mr-2"></i> Create New Goal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 animate__animated animate__fadeIn">
          <div className="error-icon mb-4">
            <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
          </div>
          <h1 className="h3 mb-3 font-weight-bold text-gray-800">Goal not found</h1>
          <p className="mb-4 text-gray-600">The goal you're looking for does not exist or has been deleted.</p>
          <div className="mb-4">
            <p className="text-gray-600">You can try one of the following:</p>
            <div className="d-flex flex-column flex-md-row justify-content-center mt-3">
              <Link to="/goals" className="btn btn-primary mb-2 mb-md-0 mr-md-3">
                <i className="fas fa-arrow-left mr-2"></i> View All Goals
              </Link>
              <Link to="/goals/create" className="btn btn-success">
                <i className="fas fa-plus-circle mr-2"></i> Create New Goal
          </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const remainingAmount = goal.target_amount - goal.current_amount;
  const remainingDays = getRemainingDays(goal.target_date);
  const monthlySavings = calculateMonthlySavingsForGoal(goal);

  let statusColor: string;
  let statusBg: string;
  let statusIcon: string;

  if (progressPercentage >= 75) {
    statusColor = "success";
    statusBg = "rgba(28, 200, 138, 0.1)";
    statusIcon = "check-circle";
  } else if (progressPercentage >= 40) {
    statusColor = "warning";
    statusBg = "rgba(246, 194, 62, 0.1)";
    statusIcon = "clock";
  } else {
    statusColor = "danger";
    statusBg = "rgba(231, 74, 59, 0.1)";
    statusIcon = "exclamation-circle";
  }

  let priorityColor: string;
  if (goal.priority === "high") {
    priorityColor = "danger";
  } else if (goal.priority === "medium") {
    priorityColor = "warning";
  } else {
    priorityColor = "info";
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Contribution Modal */}
      {showContributeModal && goal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Contribute to {goal.goal_name}</h5>
                  <button type="button" className="close" onClick={closeContributeModal} disabled={isContributing}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  {goal && (
                    <>
                      {/* Shared goal indicator in contribution modal */}
                      {isSharedGoal && (
                        <div className="alert alert-info mb-3 d-flex align-items-center">
                          <i className="fas fa-users mr-2"></i>
                          <div>
                            <strong>Family Goal:</strong> This contribution will be visible to all family members.
                            {familyName && <div className="small mt-1">Family: {familyName}</div>}
                          </div>
                        </div>
                      )}
                    
                      {/* Calculate percentage if it's not available */}
                      {(() => {
                        const calculatedPercentage = goal.percentage ?? 
                          (goal.target_amount > 0 ? (goal.current_amount / goal.target_amount * 100) : 0);
                        
                        return (
                          <div className="progress mb-3" style={{height: '10px'}}>
                            <div 
                              className={`progress-bar ${
                                calculatedPercentage >= 90 ? "bg-success" : 
                                calculatedPercentage >= 50 ? "bg-info" : 
                                calculatedPercentage >= 25 ? "bg-warning" : 
                                "bg-danger"
                              }`}
                              role="progressbar" 
                              style={{ width: `${Math.min(calculatedPercentage, 100)}%` }}
                              aria-valuenow={Math.min(calculatedPercentage, 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                        );
                      })()}

                      <div className="d-flex justify-content-between mb-3">
                        <div>Current: {formatCurrency(goal.current_amount)}</div>
                        <div>Target: {formatCurrency(goal.target_amount)}</div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="contributionAmount">Contribution Amount</label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text">{currencySymbol}</span>
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
                            disabled={isContributing}
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
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeContributeModal}
                    disabled={isContributing}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={isContributing || !contributionAmount || parseFloat(contributionAmount) <= 0}
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
    
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
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
                <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                {goal && (
                  <div className="alert alert-secondary mt-3">
                    <strong>Goal:</strong> {goal.goal_name}<br />
                    <strong>Current Amount:</strong> {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                  </div>
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
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Delete
                    </>
                  ) : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          {goal ? goal.goal_name : "Goal Details"}
          {isSharedGoal && (
            <span className="badge badge-info ml-2">
              <i className="fas fa-users mr-1"></i> Family Goal
            </span>
          )}
        </h1>
        <div className="d-flex">
          {/* Show contribution button for family shared goals or owner */}
          {goal && (
            <>
              <button 
                className="btn btn-success shadow-sm mr-2" 
                onClick={openContributeModal}
                disabled={goal.status === 'completed' || goal.status === 'cancelled'}
              >
                <i className="fas fa-plus-circle mr-2"></i> Contribute
              </button>
              
              {(isGoalOwner && goal.status !== 'completed' && goal.status !== 'cancelled') && (
                <Link to={`/goals/${id}/edit`} className="btn btn-primary shadow-sm mr-2">
                  <i className="fas fa-edit mr-2"></i> Edit
                </Link>
              )}
              
              {isGoalOwner && (
                <button className="btn btn-danger shadow-sm mr-2" onClick={openDeleteModal}>
                  <i className="fas fa-trash mr-2"></i> Delete
                </button>
              )}
            </>
          )}
          <Link to="/goals" className="btn btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goals
          </Link>
        </div>
      </div>

      {/* Shared Goal Banner */}
      {isSharedGoal && (
        <div className="card mb-4 border-left-info shadow-sm animate__animated animate__fadeIn">
          <div className="card-body py-3">
            <div className="row no-gutters align-items-center">
              <div className="col-auto pr-3">
                <i className="fas fa-users-cog fa-2x text-info"></i>
              </div>
              <div className="col">
                <div className="font-weight-bold text-info mb-1 d-flex align-items-center">
                  Family Shared Goal
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('sharedGoal', e)}
                      aria-label="Shared Goal Information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                </div>
                <div className="text-gray-800">
                  This goal is shared with {familyName ? `the "${familyName}" family` : "your family"}.
                  {!isGoalOwner && <span> Created by another family member.</span>}
                </div>
              </div>
              <div className="col-auto">
                <div className="badge badge-light p-2">
                  <i className="fas fa-eye mr-1"></i> Visible to family members
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Overview Row */}
      <div className="row">
        {/* Total Goal Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                    Target Amount
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('targetAmount', e)}
                        aria-label="Target Amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(goal.target_amount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-bullseye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                    Current Amount
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('currentAmount', e)}
                        aria-label="Current Amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(goal.current_amount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1 d-flex align-items-center">
                    Remaining
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('remaining', e)}
                        aria-label="Remaining amount information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-hourglass-half fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Days Remaining Card */}
        <div className="col-xl-3 col-md-6 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                    Time Remaining
                    <div className="ml-2 position-relative">
                      <i 
                        className="fas fa-info-circle text-gray-400 cursor-pointer" 
                        onClick={(e) => toggleTip('timeRemaining', e)}
                        aria-label="Time Remaining information"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </div>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {remainingDays} days
                  </div>
                  <div className="text-xs text-gray-500">
                    Target: {formatDate(goal.target_date)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Goal Progress Card with Highcharts */}
        <div className="col-lg-8 mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
          <div className="card shadow">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Goal Progress
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('goalProgress', e)}
                    aria-label="Goal Progress information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
                {isSharedGoal && (
                  <span className="badge badge-info ml-2">
                    <i className="fas fa-users mr-1"></i> Family Goal
                  </span>
                )}
              </h6>
              <div className={`badge badge-${statusColor}`}>{formatPercentage(progressPercentage)}</div>
            </div>
            <div className="card-body">
              {isSharedGoal && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between p-2 bg-light-info rounded" 
                        style={{background: 'rgba(78, 115, 223, 0.05)', border: '1px dashed rgba(78, 115, 223, 0.3)'}}>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-share-alt text-info mr-2"></i>
                        <span>Shared with {familyName ? <strong>{familyName}</strong> : "family members"}</span>
                      </div>
                      {isGoalOwner && (
                        <span className="badge badge-light">You created this goal</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="row mb-4">
                <div className="col-md-5">
                  <div className="position-relative">
                    {highchartsLoaded && progressConfig && (
                      <>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={progressConfig}
                          ref={progressChartRef}
                        />
                        {/* Only show this label for pie chart fallback */}
                        {progressConfig.chart?.type === 'pie' && (
                          <div className="position-absolute" style={{ 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -20%)',
                            textAlign: 'center'
                          }}>
                            <div className="font-weight-bold" style={{ fontSize: '24px' }}>
                              {formatPercentage(progressPercentage)}
                            </div>
                            <div className="text-xs text-gray-500">Complete</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="mb-4">
                    <div className="mb-2 d-flex justify-content-between">
                      <span>Progress</span>
                      <span>{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="progress mb-4">
                      <div
                        className={`progress-bar bg-${statusColor}`}
                        role="progressbar"
                        style={{
                          width: `${progressPercentage > 100 ? 100 : progressPercentage}%`,
                        }}
                        aria-valuenow={progressPercentage > 100 ? 100 : progressPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                      </div>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h4 className="small font-weight-bold mb-1">Status</h4>
                        <div className="d-flex align-items-center">
                          <div className={`bg-${statusColor} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                            <i className={`fas fa-${statusIcon} text-${statusColor}`}></i>
                          </div>
                          <span className="text-gray-800 font-weight-bold">{goal.status?.replace("_", " ").toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h4 className="small font-weight-bold mb-1">Priority</h4>
                        <div className="d-flex align-items-center">
                          <div className={`bg-${priorityColor} p-2 rounded mr-2`} style={{ opacity: 0.5 }}>
                            <i className={`fas fa-flag text-${priorityColor}`}></i>
                          </div>
                          <span className={`text-${priorityColor} font-weight-bold`}>{goal.priority.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline projection chart */}
              <div className="mt-4">
                <h6 className="font-weight-bold text-primary mb-3 d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center">
                  Goal Timeline Projection
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => toggleTip('goalTimeline', e)}
                      aria-label="Goal Timeline Projection information"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </div>
                  </span>
                  <span className="text-xs text-success">
                    <i className="fas fa-sync text-xs mr-1"></i> Real-time updates
                  </span>
                </h6>
                {highchartsLoaded && timelineConfig && (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={timelineConfig}
                    ref={timelineChartRef}
                  />
                )}
              </div>

              {goal.description && (
                <div className="mt-4">
                  <h4 className="small font-weight-bold">Description</h4>
                  <div className="p-3 bg-light rounded">
                    <p className="mb-0 text-gray-700">{goal.description}</p>
                  </div>
                </div>
              )}

              <div className="text-center mt-4">
                {goal.status === 'completed' && (
                  <div className="text-success mt-2">
                    <i className="fas fa-check-circle mr-1"></i> Goal target reached!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Saving Recommendation and History Card */}
        <div className="col-lg-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.6s" }}>
          {/* Monthly Recommendation Card */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Saving Recommendation
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('savingRec', e)}
                    aria-label="Saving Recommendation information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div className="rounded-circle bg-success p-2 mx-auto mb-3" style={{ width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-chart-line fa-lg text-white"></i>
                </div>

                <div className="text-xs text-gray-500 mb-1">Recommended Monthly Saving</div>
                <div className="h3 mb-0 font-weight-bold text-gray-800">
                  {formatCurrency(monthlySavings)}
                </div>
                <div className="text-sm text-gray-600 mt-1 mb-3">
                  to reach your goal by {formatDate(goal.target_date)}
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <div>
                  <div className="text-xs text-gray-500">Time Left</div>
                  <div className="font-weight-bold">
                    {remainingDays} days
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="font-weight-bold">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contribution History Chart */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Contribution History
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => toggleTip('contHistory', e)}
                    aria-label="Contribution History information"
                    style={{ cursor: "pointer" }}
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-4">
                  <div className="mb-3">
                    <i className="fas fa-chart-bar fa-3x text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-800 mb-2">No Contribution History</h5>
                  <p className="text-gray-600 mb-3">Track your progress by making contributions to this goal</p>
                  <Link to={`/goals/${id}/contribute`} className="btn btn-sm btn-success">
                    <i className="fas fa-plus-circle mr-1"></i> Add Contribution
                  </Link>
                </div>
              ) : (
                <>
                  {highchartsLoaded && contributionsConfig && (
                    <div className="animate__animated animate__fadeIn">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={contributionsConfig}
                        ref={contributionsChartRef}
                      />
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          <i className="fas fa-info-circle mr-1"></i>
                          {transactions.length} contribution{transactions.length !== 1 ? 's' : ''} recorded
                        </small>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Transactions */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.7s" }}>
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
            Goal Transactions
            <div className="ml-2 position-relative">
              <i 
                className="fas fa-info-circle text-gray-400 cursor-pointer" 
                onClick={(e) => toggleTip('goalTransactions', e)}
                aria-label="Goal Transactions information"
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </h6>
          <div className="d-flex align-items-center">
            <span className="text-xs text-success mr-3">
              <i className="fas fa-sync text-xs mr-1"></i> Real-time updates enabled
            </span>
          <div className="dropdown no-arrow">
            <button className="btn btn-link btn-sm dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i className="fas fa-ellipsis-v text-gray-400"></i>
            </button>
            <div className="dropdown-menu dropdown-menu-right shadow animated--fade-in" aria-labelledby="dropdownMenuButton">
              <a className="dropdown-item" href="#">Export to CSV</a>
              <a className="dropdown-item" href="#">Filter Transactions</a>
              <div className="dropdown-divider"></div>
              <a className="dropdown-item" href="#">View All Transactions</a>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fas fa-receipt fa-4x text-gray-300"></i>
              </div>
              <h4 className="text-gray-800 mb-2">No Transactions Yet</h4>
              <p className="text-gray-600">No contributions have been made towards this goal yet.</p>
              <div className="mt-4">
                <Link to={`/goals/${id}/contribute`} className="btn btn-primary">
                  <i className="fas fa-plus-circle mr-2"></i> Make First Contribution
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="animate__animated animate__fadeIn">
                      <td width="20%">{formatDate(transaction.date)}</td>
                      <td>
                        <Link
                          to={`/transactions/${transaction.id}`}
                          className="font-weight-bold text-primary"
                        >
                          {transaction.notes || "Contribution to goal"}
                        </Link>
                      </td>
                      <td width="20%">
                        <span className="badge badge-light">
                          {transaction.category || "Goal Contribution"}
                        </span>
                      </td>
                      <td className="text-right font-weight-bold" width="20%">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-light">
                    <td colSpan={3} className="font-weight-bold">
                      Total Contributions
                    </td>
                    <td className="text-right font-weight-bold text-success">
                      {formatCurrency(
                        transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Global tooltip */}
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
          {activeTip === 'targetAmount' && (
            <>
              <div className="tip-title">Target Amount</div>
              <p className="tip-description">
                The total amount you're aiming to save for this goal. This is your financial destination.
              </p>
            </>
          )}
          {activeTip === 'currentAmount' && (
            <>
              <div className="tip-title">Current Amount</div>
              <p className="tip-description">
                The amount you've already saved towards this goal. This represents your progress so far.
              </p>
            </>
          )}
          {activeTip === 'remaining' && (
            <>
              <div className="tip-title">Remaining Amount</div>
              <p className="tip-description">
                The amount still needed to reach your goal. This is the gap between your current savings and your target.
              </p>
            </>
          )}
          {activeTip === 'timeRemaining' && (
            <>
              <div className="tip-title">Time Remaining</div>
              <p className="tip-description">
                The number of days left until your target date. This helps you plan your saving schedule to reach your goal on time.
              </p>
            </>
          )}
          
          {activeTip === 'goalProgress' && (
            <>
              <div className="tip-title">Goal Progress</div>
              <p className="tip-description">
                Visual representation of your progress toward this financial goal. The percentage shows how much of your target amount you've already saved.
                {isSharedGoal && (
                  <span className="d-block mt-2 text-info">
                    <i className="fas fa-users mr-1"></i> This is a shared family goal. All family members can see and contribute to it.
                  </span>
                )}
              </p>
            </>
          )}
          
          {activeTip === 'savingRec' && (
            <>
              <div className="tip-title">Saving Recommendation</div>
              <p className="tip-description">
                Suggested monthly contribution amount to help you reach your goal by the target date. This is calculated based on your remaining amount and time left.
              </p>
            </>
          )}
          
          {activeTip === 'contHistory' && (
            <>
              <div className="tip-title">Contribution History</div>
              <p className="tip-description">
                Chart showing your historical contributions to this goal over time. This helps you track your saving consistency and patterns.
              </p>
            </>
          )}
          
          {activeTip === 'goalTransactions' && (
            <>
              <div className="tip-title">Goal Transactions</div>
              <p className="tip-description">
                Detailed list of all contributions made toward this goal, including dates, descriptions, and amounts. This provides a complete history of your saving activity.
              </p>
            </>
          )}
          
          {activeTip === 'goalTimeline' && (
            <>
              <div className="tip-title">Goal Timeline Projection</div>
              <p className="tip-description">
                This chart shows the projected growth of your savings towards this goal over time. It visualizes how your current saving rate will help you reach your target amount by the target date.
              </p>
            </>
          )}
          
          {activeTip === 'sharedGoal' && (
            <>
              <div className="tip-title">Family Shared Goal</div>
              <p className="tip-description">
                This goal is shared with all members of your family. Everyone in the family can see this goal and contribute towards it.
                {familyName && (
                  <span className="d-block mt-1">
                    Family: <strong>{familyName}</strong>
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalDetails;
