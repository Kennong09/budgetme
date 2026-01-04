import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../utils/AuthContext";
import { useToast } from "../../../utils/ToastContext";
import { supabase } from "../../../utils/supabaseClient";
import { goalsDataService } from "../../goals/services/goalsDataService";
import { useFamilyPermissions } from "../../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../../common/PermissionErrorModal";
import { formatCurrency } from "../../../utils/currencyUtils";

export interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: string;
  status: string;
  is_family_goal: boolean;
}

export interface GoalSelectorProps {
  selectedGoal?: Goal | null;
  onGoalSelect: (goal: Goal | null) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  isContributionType?: boolean;
  showValidationError?: boolean;
  onGoalsLoaded?: (hasGoals: boolean) => void;
  validateFamilyGoalAccess?: boolean; // New prop for family goal validation
}

const GoalSelector: React.FC<GoalSelectorProps> = ({
  selectedGoal = null,
  onGoalSelect,
  className = "",
  disabled = false,
  label = "Goal Assignment (Optional)",
  required = false,
  isContributionType = false,
  showValidationError = false,
  onGoalsLoaded,
  validateFamilyGoalAccess = false,
}) => {
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  const familyPermissions = useFamilyPermissions();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionErrorModal, setPermissionErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    suggestedActions?: string[];
    userRole?: string;
  }>({ isOpen: false, title: '', message: '' });
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Mobile modal handlers
  const handleMobileOpen = () => {
    if (!disabled && !loading) {
      setIsMobileModalOpen(true);
      setSearchTerm("");
    }
  };

  const handleMobileClose = () => {
    setIsMobileModalOpen(false);
    setSearchTerm("");
  };

  const handleMobileGoalSelect = async (goal: Goal) => {
    await handleGoalSelect(goal);
    setIsMobileModalOpen(false);
  };

  // Calculate progress percentage
  const getProgressPercentage = (goal: Goal) => {
    if (goal.target_amount <= 0) return 0;
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return { bg: 'rose', text: 'rose' };
      case 'medium': return { bg: 'amber', text: 'amber' };
      case 'low': return { bg: 'emerald', text: 'emerald' };
      default: return { bg: 'gray', text: 'gray' };
    }
  };

  // Filter goals based on search term
  const filteredGoals = goals.filter((goal: Goal) =>
    goal.goal_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGoalSelect = async (goal: Goal) => {
    // If family goal validation is enabled and this is a family goal, check permissions
    if (validateFamilyGoalAccess && goal.is_family_goal) {
      const accessResult = await familyPermissions.checkCanAccessGoal(goal.id);
      
      if (!accessResult.hasPermission) {
        setPermissionErrorModal({
          isOpen: true,
          title: 'Access Denied',
          message: accessResult.errorMessage || 'You do not have permission to access this family goal.',
          suggestedActions: accessResult.restrictions || ['Contact your family admin for assistance'],
          userRole: accessResult.userRole
        });
        return;
      }
      
      // Additional check for contribution-specific permissions
      if (isContributionType) {
        const contributionResult = await familyPermissions.checkCanContributeToGoals();
        
        if (!contributionResult.hasPermission) {
          setPermissionErrorModal({
            isOpen: true,
            title: 'Contribution Access Denied',
            message: contributionResult.errorMessage || 'You do not have permission to contribute to family goals.',
            suggestedActions: contributionResult.restrictions || ['Contact your family admin for assistance'],
            userRole: contributionResult.userRole
          });
          return;
        }
      }
    }
    
    onGoalSelect(goal);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    onGoalSelect(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Fetch goals when component mounts
  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setGoals([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use robust data service with automatic fallback (same as Goals module)
        const { data: personalGoals, error: personalGoalsError } = await goalsDataService.fetchGoals(user.id);
          
        if (personalGoalsError) {
          throw personalGoalsError;
        }
        
        if (!personalGoals) {
          console.warn('No personal goals data received');
          setGoals([]);
          setLoading(false);
          return;
        }
        
        // Mark personal goals, ensuring any with family_id are correctly marked as shared
        const formattedPersonalGoals = personalGoals.map(goal => ({
          ...goal,
          is_family_goal: !!goal.family_id || !!goal.is_family_goal,
          // Ensure required fields are available
          percentage: goal.percentage || (goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0),
          remaining: goal.remaining || Math.max(0, goal.target_amount - goal.current_amount)
        }));
        
        // Filter goals based on family permissions if validation is enabled
        let filteredPersonalGoals = formattedPersonalGoals;
        if (validateFamilyGoalAccess && !familyPermissions.loading) {
          filteredPersonalGoals = formattedPersonalGoals.filter(goal => {
            // Always include personal goals
            if (!goal.is_family_goal) return true;
            
            // For family goals, check if user has basic family access
            return familyPermissions.hasBasicAccess;
          });
        }
        
        let allGoals = [...filteredPersonalGoals];
        
        // Check if user is in a family and fetch shared goals
        const { data: familyMemberData, error: familyError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .single();

        if (!familyError && familyMemberData?.family_id) {
          // Fetch shared goals from other family members
          const { data: sharedGoals, error: sharedError } = await supabase
            .from('goals')
            .select(`
              *,
              profiles!user_id (
                full_name,
                email
              )
            `)
            .eq('family_id', familyMemberData.family_id)
            .eq('is_family_goal', true)
            .in('status', ['not_started', 'in_progress'])
            .neq('user_id', user.id);
            
          if (!sharedError && sharedGoals) {
            // Format shared goals with owner information
            const formattedSharedGoals = sharedGoals.map(goal => ({
              ...goal,
              is_family_goal: true,
              shared_by: goal.user_id,
              shared_by_name: goal.profiles?.full_name || 
                             goal.profiles?.email?.split('@')[0] || 
                             "Family Member"
            }));
            
            allGoals = [...filteredPersonalGoals, ...formattedSharedGoals];
          }
        }

        // Filter for available goals only (not completed, cancelled, or already achieved) and transform to Goal interface
        const activeGoals = allGoals
          .filter((goal: any) => {
            // Exclude completed and cancelled goals
            if (goal.status === 'completed' || goal.status === 'cancelled') {
              return false;
            }
            // Exclude goals that have already reached or exceeded their target (100% or above)
            if (goal.current_amount >= goal.target_amount) {
              return false;
            }
            // Only show goals that are not started or in progress and under 100%
            return goal.status === 'not_started' || goal.status === 'in_progress';
          })
          .map((goal: any) => ({
            id: goal.id,
            goal_name: goal.goal_name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            target_date: goal.target_date,
            priority: goal.priority,
            status: goal.status,
            is_family_goal: goal.is_family_goal || false
          }));

        console.log(`GoalSelector: Retrieved ${activeGoals.length} active goals (${filteredPersonalGoals.filter(g => g.status === 'not_started' || g.status === 'in_progress').length} personal, ${activeGoals.length - filteredPersonalGoals.filter(g => g.status === 'not_started' || g.status === 'in_progress').length} shared)`);
        
        // Apply additional filtering for contribution type and family permissions
        let finalGoals = activeGoals;
        if (isContributionType && validateFamilyGoalAccess && !familyPermissions.loading) {
          finalGoals = activeGoals.filter(goal => {
            // Always include personal goals
            if (!goal.is_family_goal) return true;
            
            // For family goals, check contribution permissions
            return familyPermissions.hasContributionAccess;
          });
        }
        
        setGoals(finalGoals);
        
        // Notify parent component about goals availability
        if (onGoalsLoaded) {
          onGoalsLoaded(activeGoals.length > 0);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load goals';
        console.error('GoalSelector: Error loading goals:', err);
        setError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user?.id, showErrorToast, validateFamilyGoalAccess, familyPermissions.loading, familyPermissions.hasBasicAccess, familyPermissions.hasContributionAccess, isContributionType]);

// Mobile Modal Component
const MobileGoalModal = () => {
if (!isMobileModalOpen) return null;
  
return createPortal(
<div 
className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate__animated animate__fadeIn animate__faster"
onClick={handleMobileClose}
>
<div 
className="w-full max-h-[85vh] bg-white rounded-t-2xl shadow-xl animate__animated animate__slideInUp animate__faster overflow-hidden"
onClick={(e) => e.stopPropagation()}
>
<div className="flex justify-center pt-2 pb-1">
<div className="w-10 h-1 bg-gray-300 rounded-full"></div>
</div>
<div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
<h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
<i className="fas fa-flag text-indigo-500 text-xs"></i>
Select Goal
</h6>
<button 
onClick={handleMobileClose}
className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
>
<i className="fas fa-times text-xs"></i>
</button>
</div>
<div className="px-4 py-2.5 border-b border-gray-100">
<div className="relative">
<i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
<input
type="text"
className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
placeholder="Search goals..."
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
autoFocus
/>
</div>
</div>
<div className="overflow-y-auto max-h-[60vh] pb-4">
{filteredGoals.length === 0 ? (
<div className="px-4 py-8 text-center">
<i className="fas fa-flag text-gray-300 text-2xl mb-2"></i>
<p className="text-sm text-gray-500">{searchTerm ? 'No goals found' : 'No goals available'}</p>
</div>
) : (
<div className="px-3 py-2 space-y-1.5">
{filteredGoals.map((goal) => {
const progress = getProgressPercentage(goal);
return (
<div
key={goal.id}
className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
selectedGoal?.id === goal.id 
? 'bg-indigo-50 border-indigo-300 shadow-sm' 
: 'bg-white border-gray-100'
}`}
onClick={() => handleMobileGoalSelect(goal)}
>
<div className="flex items-start justify-between mb-2">
<div className="flex items-center gap-2.5 flex-1 min-w-0">
<div className={`w-9 h-9 rounded-full flex items-center justify-center ${
goal.is_family_goal ? 'bg-blue-100' : 'bg-indigo-100'
}`}>
<i className={`${goal.is_family_goal ? 'fas fa-users text-blue-500' : 'fas fa-flag text-indigo-500'} text-xs`}></i>
</div>
<div className="flex-1 min-w-0">
<span className="text-sm font-semibold text-gray-800 truncate block">{goal.goal_name}</span>
<span className={`text-[10px] ${goal.is_family_goal ? 'text-blue-600' : 'text-gray-500'}`}>
{goal.is_family_goal ? 'Family' : 'Personal'}
</span>
</div>
</div>
{selectedGoal?.id === goal.id && (
<i className="fas fa-check-circle text-indigo-500 text-sm"></i>
)}
</div>
<div className="mb-1.5">
<div className="flex items-center justify-between text-[10px] mb-1">
<span className="text-gray-500">Progress</span>
<span className="font-semibold text-indigo-600">{progress.toFixed(0)}%</span>
</div>
<div className="w-full bg-gray-200 rounded-full h-1">
<div className="h-1 rounded-full bg-indigo-500" style={{ width: `${progress}%` }}></div>
</div>
</div>
<div className="flex items-center justify-between text-[10px]">
<span className="text-gray-500">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
<span className="text-emerald-600 font-medium">{formatCurrency(goal.target_amount - goal.current_amount)} left</span>
</div>
</div>
);
})}
</div>
)}
</div>
</div>
</div>,
document.body
);
};

return (
<div className={`form-group selector-container ${className}`}>
{/* ===== MOBILE VIEW ===== */}
<div className="block md:hidden">
<label className="text-xs font-bold text-gray-700 mb-1.5 block">
{label} {required && <span className="text-rose-500">*</span>}
</label>
  
{loading ? (
<div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
<div className="flex items-center gap-1">
<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
</div>
<span className="text-xs text-gray-500">Loading goals...</span>
</div>
) : (
<>
<div
className={`flex items-center justify-between p-2.5 bg-white border rounded-xl transition-all active:scale-[0.99] ${
disabled ? 'opacity-50 bg-gray-50' : ''
} ${selectedGoal 
? selectedGoal.is_family_goal ? 'border-blue-200' : 'border-indigo-200'
: showValidationError && required ? 'border-rose-300' : 'border-gray-200'}`}
onClick={handleMobileOpen}
>
{selectedGoal ? (
<div className="flex items-center gap-2.5 flex-1 min-w-0">
<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
selectedGoal.is_family_goal ? 'bg-blue-100' : 'bg-indigo-100'
}`}>
<i className={`${selectedGoal.is_family_goal ? 'fas fa-users text-blue-500' : 'fas fa-flag text-indigo-500'} text-xs`}></i>
</div>
<div className="flex-1 min-w-0">
<span className="text-sm font-semibold text-gray-800 truncate block">{selectedGoal.goal_name}</span>
<span className="text-[10px] text-indigo-600 font-medium">{getProgressPercentage(selectedGoal).toFixed(0)}% complete</span>
</div>
</div>
) : (
<span className={`text-sm ${showValidationError && required ? 'text-rose-400' : 'text-gray-400'}`}>
{required ? "Select Goal" : "Select Goal (Optional)"}
</span>
)}
<div className="flex items-center gap-1.5">
{selectedGoal && !disabled && (
<button
type="button"
className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}
>
<i className="fas fa-times text-[10px]"></i>
</button>
)}
<i className="fas fa-chevron-right text-gray-400 text-xs"></i>
</div>
</div>

{selectedGoal && (
  <div className={`mt-2 p-2.5 rounded-xl border ${selectedGoal.is_family_goal ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100'}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
          <i className="fas fa-chart-line text-emerald-600 text-xs"></i>
        </div>
        <div>
          <p className="text-[9px] text-gray-500 uppercase font-semibold">Progress</p>
          <p className="text-sm font-bold text-indigo-600">{getProgressPercentage(selectedGoal).toFixed(0)}%</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-gray-500 uppercase font-semibold">Remaining</p>
        <p className="text-xs font-bold text-emerald-600">{formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</p>
      </div>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${getProgressPercentage(selectedGoal)}%` }}></div>
    </div>
  </div>
)}

<p className="text-[10px] text-gray-400 mt-1.5">
  {isContributionType && required ? "Goal selection required" : "Link to a goal"}
</p>

{showValidationError && required && !selectedGoal && (
  <div className="flex items-center gap-1.5 mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg">
    <i className="fas fa-exclamation-triangle text-rose-500 text-[10px]"></i>
    <span className="text-[10px] text-rose-600">Please select a goal</span>
  </div>
)}
<MobileGoalModal />
</>
)}
</div>

{/* ===== DESKTOP VIEW ===== */}
<div className="hidden md:block">
  <label className="font-weight-bold text-gray-800">
    {label} {required && <span className="text-danger">*</span>}
  </label>
  
  <div className="position-relative">
    {/* Selected Goal Display */}
    <div
          className={`d-flex align-items-center justify-content-between px-3 py-2 border bg-white ${
            disabled || loading ? 'bg-light' : ''
          } ${
            isOpen ? 'border-primary' : 'border-secondary'
          } ${
            showValidationError && required && !selectedGoal ? 'border-danger is-invalid' : ''
          }`}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          style={{ 
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            borderRadius: '0.375rem',
            minHeight: '38px'
          }}
        >
          {selectedGoal ? (
            <div className="d-flex align-items-center">
              <div>
                <div className="font-weight-medium text-gray-800">
                  {selectedGoal.goal_name}
                </div>
                <small className={`${selectedGoal.is_family_goal ? 'text-info' : 'text-muted'}`}>
                  {selectedGoal.is_family_goal ? (
                    <>
                      <i className="fas fa-users mr-1"></i>
                      Family Goal
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user mr-1"></i>
                      Personal Goal
                    </>
                  )}
                </small>
              </div>
            </div>
          ) : (
            <span className={`${
              showValidationError && required ? 'text-danger' : 'text-muted'
            }`}>
              {loading ? "Loading goals..." : 
                required ? "Select Goal" : "Select Goal (Optional)"
              }
            </span>
          )}
          
          <div className="d-flex align-items-center">
            {selectedGoal && (
              <button
                type="button"
                className="btn btn-sm text-danger mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                title="Clear selection"
                style={{ border: 'none', background: 'none', padding: '2px 6px' }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="position-absolute w-100 bg-white border shadow-lg"
            style={{ 
              zIndex: 1050, 
              maxHeight: '300px', 
              overflowY: 'auto', 
              top: '100%',
              borderRadius: '0.375rem',
              borderColor: '#dee2e6'
            }}
          >
            {/* Search Box */}
            <div className="p-3 border-bottom">
              <input
                type="text"
                className="px-3 py-2 w-100 border"
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  borderRadius: '0.25rem',
                  fontSize: '14px',
                  borderColor: '#dee2e6',
                  outline: 'none'
                }}
              />
            </div>

            {/* Goal Options */}
            <div className="py-1">
              {filteredGoals.length === 0 ? (
                <div className="px-3 py-2 text-muted text-center">
                  {searchTerm ? 'No goals found' : 'No goals available'}
                </div>
              ) : (
                filteredGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`px-3 py-2 d-flex align-items-center ${
                      selectedGoal?.id === goal.id ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => handleGoalSelect(goal)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedGoal?.id !== goal.id) {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedGoal?.id !== goal.id) {
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    <div className="flex-grow-1">
                      <div className="font-weight-medium">
                        {goal.goal_name}
                      </div>
                      <small className={`${goal.is_family_goal ? 'text-info' : 'text-muted'}`}>
                        {goal.is_family_goal ? (
                          <>
                            <i className="fas fa-users mr-1"></i>
                            Family Goal
                          </>
                        ) : (
                          <>
                            <i className="fas fa-user mr-1"></i>
                            Personal Goal
                          </>
                        )}
                      </small>
                    </div>
                    {selectedGoal?.id === goal.id && (
                      <i className="fas fa-check text-white"></i>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <small className="form-text text-muted">
        {isContributionType && required ? (
          <>
            <i className="fas fa-info-circle mr-1"></i>
            Goal selection is required for contribution transactions
            {validateFamilyGoalAccess && familyPermissions.isFamilyMember && (
              <>
                {' • '}
                <span className="text-info">
                  Family goal access checked
                </span>
              </>
            )}
          </>
        ) : (
          <>
            Is this transaction related to one of your financial goals?
            {validateFamilyGoalAccess && goals.some(g => g.is_family_goal) && (
              <>
                {' '}
                <span className="text-info">
                  <i className="fas fa-shield-alt mr-1"></i>
                  Family goals require proper permissions
                </span>
              </>
            )}
          </>
        )}
      </small>
      
      {/* Permission Info for Family Members */}
      {validateFamilyGoalAccess && familyPermissions.isFamilyMember && (
        <div className="mt-2">
          <small className="text-muted d-flex align-items-center">
            <i className="fas fa-info-circle text-info mr-1"></i>
            Role: <span className="font-weight-bold text-capitalize ml-1">{familyPermissions.familyRole}</span>
            {!familyPermissions.hasContributionAccess && isContributionType && (
              <span className="ml-2 text-warning">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Limited contribution access
              </span>
            )}
          </small>
        </div>
      )}
      
      {/* Validation Error Message */}
      {showValidationError && required && !selectedGoal && (
        <div className="invalid-feedback d-block">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          Please select a goal for your contribution
        </div>
      )}
    </div>
    
    {/* Permission Error Modal */}
    <PermissionErrorModal
      isOpen={permissionErrorModal.isOpen}
      onClose={() => setPermissionErrorModal({ isOpen: false, title: '', message: '' })}
      errorTitle={permissionErrorModal.title}
      errorMessage={permissionErrorModal.message}
      suggestedActions={permissionErrorModal.suggestedActions}
      userRole={permissionErrorModal.userRole}
    />
  </div>
  );
};

export default GoalSelector;