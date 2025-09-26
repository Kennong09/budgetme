import React, { useState, useEffect } from "react";
import { useAuth } from "../../../utils/AuthContext";
import { useToast } from "../../../utils/ToastContext";
import { supabase } from "../../../utils/supabaseClient";
import { goalsDataService } from "../../goals/services/goalsDataService";
import { useFamilyPermissions } from "../../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../../common/PermissionErrorModal";

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

  return (
    <div className={`form-group selector-container ${className}`}>
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