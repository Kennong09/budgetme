import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { Goal as GoalType, Account } from "../../../types";
import { formatCurrency, formatPercentage, formatDate, getRemainingDays } from "../../../utils/helpers";
import { useAuth } from "../../../utils/AuthContext";
import { useToast } from "../../../utils/ToastContext";
import { supabase } from "../../../utils/supabaseClient";
import { goalsDataService } from "../services/goalsDataService";
import { useFamilyPermissions } from "../../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../../common/PermissionErrorModal";

// Enhanced styles for interactive elements
const modalStyles = `
  .hover-lift {
    transition: all 0.3s ease;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.25) !important;
  }
  .icon-circle {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .animate-pulse {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: GoalType[];
  onContributionSuccess: () => void;
}

interface ContributionData {
  goalId: string;
  amount: string;
  account_id: string;
  notes: string;
}

type ModalStep = 'selection' | 'contribution' | 'review';

const ContributionModal: FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  goals,
  onContributionSuccess
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const familyPermissions = useFamilyPermissions();

  // Modal state - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [step, setStep] = useState<ModalStep>('selection');
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contributionData, setContributionData] = useState<ContributionData>({
    goalId: '',
    amount: '',
    account_id: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [showGoalAnalytics, setShowGoalAnalytics] = useState<boolean>(false);
  const [selectedGoalAnalytics, setSelectedGoalAnalytics] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  
  // Permission error modal state
  const [showPermissionError, setShowPermissionError] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<{
    title: string;
    message: string;
    suggestedActions?: string[];
  } | null>(null);

  // Filter eligible goals (active goals with remaining amount > 0) - ALWAYS CALCULATE
  const eligibleGoals = isOpen ? goals.filter(goal => {
    const status = goal.status?.toLowerCase();
    const hasRemainingAmount = (goal.target_amount - goal.current_amount) > 0;
    const isEligible = (status === 'not_started' || status === 'in_progress') && hasRemainingAmount;
    
    // If it's a family goal, check family permissions
    if (isEligible && goal.is_family_goal) {
      return familyPermissions.permissionState.canContributeToGoals;
    }
    
    return isEligible;
  }) : [];

  // Load user accounts when modal opens and step changes to contribution
  useEffect(() => {
    if (isOpen && step === 'contribution' && user) {
      loadUserAccounts();
    }
  }, [isOpen, step, user]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('selection');
      setSelectedGoal(null);
      setContributionData({
        goalId: '',
        amount: '',
        account_id: '',
        notes: ''
      });
      setError(null);
      setIsSubmitting(false);
      setActiveTip(null);
      setTooltipPosition(null);
      setShowPermissionError(false);
      setPermissionError(null);
    }
  }, [isOpen]);

  // Inject styles
  useEffect(() => {
    if (!isOpen) return;
    
    const styleId = 'contribution-modal-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = modalStyles;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isOpen]);

  // NOW IT'S SAFE TO RETURN NULL
  if (!isOpen) return null;

  const loadUserAccounts = async () => {
    if (!user) return;
    
    try {
      setLoadingAccounts(true);
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
        
      if (accountsError) {
        throw new Error(`Error fetching accounts: ${accountsError.message}`);
      }
      
      setAccounts(accountsData || []);
    } catch (err) {
      console.error("Error loading accounts:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load accounts";
      showErrorToast(errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleGoalSelection = async (goal: GoalType) => {
    // Check family goal permissions before allowing selection
    if (goal.is_family_goal) {
      const accessResult = await familyPermissions.checkCanAccessGoal(goal.id);
      if (!accessResult.hasPermission) {
        const role = familyPermissions.permissionState.familyRole;
        setPermissionError({
          title: "Goal Contribution Restricted",
          message: accessResult.message || `As a family ${role}, you cannot contribute to this family goal.`,
          suggestedActions: accessResult.suggestedActions
        });
        setShowPermissionError(true);
        return;
      }
    }
    
    setSelectedGoal(goal);
    setContributionData(prev => ({
      ...prev,
      goalId: goal.id.toString(),
      notes: `Contribution to ${goal.goal_name}`
    }));
    
    // Calculate goal analytics
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    const remainingAmount = goal.target_amount - goal.current_amount;
    const remainingDays = goal.target_date ? getRemainingDays(goal.target_date) : null;
    const dailyRequired = remainingDays && remainingDays > 0 ? remainingAmount / remainingDays : 0;
    
    setSelectedGoalAnalytics({
      progressPercentage,
      remainingAmount,
      remainingDays,
      dailyRequired,
      isOnTrack: remainingDays ? (dailyRequired * remainingDays) <= remainingAmount : true
    });
    
    setStep('contribution');
    setError(null);
  };

  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ 
          top: rect.bottom + window.scrollY, 
          left: rect.left + (rect.width / 2) + window.scrollX 
        });
      }
    }
  };

  const getTooltipContent = () => {
    const tooltipContent: Record<string, { title: string; description: string }> = {
      'goal-selection': {
        title: 'Goal Selection Tips',
        description: 'Choose goals that need the most attention. Focus on goals with approaching deadlines or those closest to completion for maximum impact.'
      },
      'contribution-tips': {
        title: 'Contribution Strategy',
        description: 'Regular small contributions are often more effective than large irregular ones. Consider your budget and make sustainable contributions.'
      },
      'goal-analytics': {
        title: 'Goals Overview',
        description: 'View summary statistics of all your goals including total targets, current progress, and remaining amounts to track your overall financial progress.'
      },
      'smart-suggestions': {
        title: 'Smart Suggestions',
        description: 'AI-powered recommendations based on your spending patterns and goal priorities to optimize your contribution strategy.'
      }
    };

    const content = tooltipContent[activeTip || ''];
    if (!content) return null;

    return (
      <>
        <div className="font-weight-bold mb-2 text-primary">{content.title}</div>
        <p className="mb-0 small">{content.description}</p>
      </>
    );
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContributionData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleBackToSelection = () => {
    setStep('selection');
    setSelectedGoal(null);
    setError(null);
  };

  const validateContribution = (): boolean => {
    if (!contributionData.amount || parseFloat(contributionData.amount) <= 0) {
      setError("Please enter a valid amount greater than zero");
      return false;
    }

    if (!contributionData.account_id) {
      setError("Please select an account");
      return false;
    }

    if (!selectedGoal) {
      setError("No goal selected");
      return false;
    }

    // Check account balance
    const contributionAmount = parseFloat(contributionData.amount);
    const selectedAccount = accounts.find(acc => acc.id && acc.id.toString() === contributionData.account_id);
    
    if (!selectedAccount) {
      setError("Selected account not found");
      return false;
    }

    if (selectedAccount.balance < contributionAmount) {
      setError(`Insufficient funds in ${selectedAccount.account_name}. Available balance: ${formatCurrency(selectedAccount.balance)}`);
      return false;
    }

    // Check if contribution would exceed goal target
    const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
    if (contributionAmount > remainingAmount) {
      setError(`Contribution exceeds goal target. Maximum contribution: ${formatCurrency(remainingAmount)}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateContribution() || !user || !selectedGoal) return;

    // Move to review step instead of submitting directly
    setStep('review');
    setError(null);
  };

  const handleFinalSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!user) {
        showErrorToast("You must be signed in to make contributions");
        setIsSubmitting(false);
        setStep('contribution');
        return;
      }

      if (!selectedGoal) {
        showErrorToast("Goal information is missing");
        setIsSubmitting(false);
        setStep('contribution');
        return;
      }

      // Additional family permission check for family goals
      if (selectedGoal.is_family_goal) {
        const accessResult = await familyPermissions.checkCanContributeToGoal(selectedGoal.id);
        if (!accessResult.hasPermission) {
          const role = familyPermissions.permissionState.familyRole;
          setPermissionError({
            title: "Contribution Access Denied",
            message: accessResult.message || `As a family ${role}, you cannot contribute to this family goal.`,
            suggestedActions: accessResult.suggestedActions
          });
          setShowPermissionError(true);
          setIsSubmitting(false);
          return;
        }
      }

      const contributionAmount = parseFloat(contributionData.amount);
      
      const result = await goalsDataService.createGoalContribution(
        contributionData.goalId,
        user.id,
        {
          amount: contributionAmount,
          account_id: contributionData.account_id,
          notes: contributionData.notes
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create contribution');
      }

      showSuccessToast("Contribution made successfully!");
      onContributionSuccess();
      onClose();
    } catch (err) {
      console.error("Error making contribution:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showErrorToast(`Failed to make contribution: ${errorMessage}`);
      setError(errorMessage);
      setStep('contribution'); // Go back to form on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content animate__animated animate__slideInUp">
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
              {getTooltipContent()}
            </div>
          )}

          <div className="modal-header border-0 pb-0">
            <div className="d-sm-flex align-items-center justify-content-between w-100">
              <h5 className="modal-title d-flex align-items-center mb-0">
                <i className="fas fa-bullseye text-primary mr-2"></i>
                {step === 'selection' && 'Select Goal to Contribute'}
                {step === 'contribution' && 'Make Your Contribution'}
                {step === 'review' && 'Review Your Contribution'}
              </h5>
              <button 
                onClick={onClose}
                className="btn btn-sm btn-secondary shadow-sm"
                type="button"
              >
                <i className="fas fa-times fa-sm mr-2"></i>
                {step === 'selection' ? 'Skip for now' : 'Cancel'}
              </button>
            </div>
          </div>

          {step === 'selection' && (
            <div className="modal-body p-0">
              <div className="container-fluid">
                <div className="row">
                  {/* Goal Selection Area */}
                  <div className="col-md-8">
                    <div className="p-4">
                      {eligibleGoals.length === 0 ? (
                        <div className="text-center py-5">
                          <div className="mb-4">
                            <i className="fas fa-exclamation-circle fa-4x text-warning animate__animated animate__pulse"></i>
                          </div>
                          <h4 className="text-gray-700 mb-3">No Active Goals Available</h4>
                          <p className="text-muted mb-4">You don't have any active goals to contribute to. Create a new goal to start tracking your financial objectives.</p>
                          <div className="d-flex justify-content-center">
                            <button 
                              type="button" 
                              className="btn btn-primary btn-icon-split"
                              onClick={onClose}
                            >
                              <span className="icon text-white-50">
                                <i className="fas fa-plus"></i>
                              </span>
                              <span className="text">Create a New Goal</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Header with Statistics */}
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                              <h6 className="font-weight-bold text-gray-800 mb-1">
                                Choose Your Goal
                                <i 
                                  className="fas fa-info-circle ml-2 text-gray-400 cursor-pointer"
                                  onClick={(e) => toggleTip('goal-selection', e)}
                                  style={{ cursor: 'pointer' }}
                                ></i>
                              </h6>
                              <p className="text-muted small mb-0">You have {eligibleGoals.length} active goal{eligibleGoals.length !== 1 ? 's' : ''} ready for contributions</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-uppercase text-gray-500 font-weight-bold">Total Progress</div>
                              <div className="h6 text-primary font-weight-bold mb-0">
                                {formatPercentage(eligibleGoals.reduce((sum, goal) => sum + (goal.current_amount / goal.target_amount) * 100, 0) / eligibleGoals.length)}
                              </div>
                            </div>
                          </div>

                          {/* Goal Cards Grid */}
                          <div className="row">
                            {eligibleGoals.map((goal) => {
                              const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
                              const remainingAmount = goal.target_amount - goal.current_amount;
                              const remainingDays = goal.target_date ? getRemainingDays(goal.target_date) : null;
                              const isUrgent = remainingDays !== null && remainingDays <= 30;
                              const isNearComplete = progressPercentage >= 80;
                              
                              return (
                                <div key={goal.id} className="col-12 mb-3">
                                  <div 
                                    className={`card shadow-sm h-100 cursor-pointer hover-lift border-left-${
                                      isNearComplete ? 'success' : isUrgent ? 'warning' : 'primary'
                                    }`}
                                    style={{ 
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      border: '1px solid #e3e6f0'
                                    }}
                                    onClick={() => handleGoalSelection(goal)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.25)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0px)';
                                      e.currentTarget.style.boxShadow = '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)';
                                    }}
                                  >
                                    <div className="card-body p-3">
                                      <div className="row align-items-center">
                                        <div className="col-auto">
                                          <div className={`icon-circle bg-${
                                            isNearComplete ? 'success' : isUrgent ? 'warning' : 'primary'
                                          } text-white`}>
                                            <i className="fas fa-bullseye"></i>
                                          </div>
                                        </div>
                                        <div className="col">
                                          <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="font-weight-bold text-gray-800 mb-0">{goal.goal_name}</h6>
                                            {(isUrgent || isNearComplete) && (
                                              <span className={`badge badge-${
                                                isNearComplete ? 'success' : 'warning'
                                              } ml-2`}>
                                                {isNearComplete ? 'Near Complete' : 'Urgent'}
                                              </span>
                                            )}
                                          </div>
                                          
                                          {/* Progress Bar */}
                                          <div className="progress mb-2" style={{ height: '10px' }}>
                                            <div
                                              className={`progress-bar bg-${
                                                progressPercentage >= 75 ? 'success' :
                                                progressPercentage >= 40 ? 'warning' : 'primary'
                                              } progress-bar-striped progress-bar-animated`}
                                              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                            ></div>
                                          </div>
                                          
                                          {/* Goal Details Grid */}
                                          <div className="row text-sm">
                                            <div className="col-6">
                                              <div className="text-xs text-uppercase text-gray-500 font-weight-bold">Progress</div>
                                              <div className="font-weight-bold text-primary">
                                                {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                                              </div>
                                              <div className="text-success small">{formatPercentage(progressPercentage)} Complete</div>
                                            </div>
                                            <div className="col-6">
                                              <div className="text-xs text-uppercase text-gray-500 font-weight-bold">Remaining</div>
                                              <div className="font-weight-bold text-warning">
                                                {formatCurrency(remainingAmount)}
                                              </div>
                                              {remainingDays !== null && (
                                                <div className={`small ${
                                                  remainingDays <= 30 ? 'text-danger' : 
                                                  remainingDays <= 90 ? 'text-warning' : 'text-muted'
                                                }`}>
                                                  {remainingDays > 0 ? `${remainingDays} days left` : 'Overdue'}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Quick Insights */}
                                          {remainingDays !== null && remainingDays > 0 && (
                                            <div className="mt-2 p-2 bg-light rounded">
                                              <div className="d-flex justify-content-between align-items-center">
                                                <small className="text-muted">
                                                  <i className="fas fa-lightbulb text-warning mr-1"></i>
                                                  Daily target: {formatCurrency(remainingAmount / remainingDays)}
                                                </small>
                                                <small className={`font-weight-bold ${
                                                  progressPercentage >= 50 ? 'text-success' : 'text-primary'
                                                }`}>
                                                  {progressPercentage >= 50 ? 'On Track' : 'Needs Attention'}
                                                </small>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        <div className="col-auto">
                                          <i className="fas fa-chevron-right text-gray-300 fa-lg"></i>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tips and Analytics Sidebar */}
                  <div className="col-md-4 bg-light border-left">
                    <div className="p-4">
                      {/* Contribution Tips */}
                      <div className="card shadow-sm mb-4">
                        <div className="card-header py-3 bg-white">
                          <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                            <i className="fas fa-lightbulb mr-2"></i>
                            Smart Tips
                            <i 
                              className="fas fa-info-circle ml-2 text-gray-400 cursor-pointer"
                              onClick={(e) => toggleTip('contribution-tips', e)}
                              style={{ cursor: 'pointer' }}
                            ></i>
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <div className="icon-circle bg-success text-white mr-3" style={{ width: '35px', height: '35px', fontSize: '14px' }}>
                                <i className="fas fa-chart-line"></i>
                              </div>
                              <div>
                                <div className="font-weight-bold text-gray-800 small">Prioritize High Impact</div>
                                <div className="text-muted" style={{ fontSize: '11px' }}>Focus on goals closest to completion</div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <div className="icon-circle bg-warning text-white mr-3" style={{ width: '35px', height: '35px', fontSize: '14px' }}>
                                <i className="fas fa-clock"></i>
                              </div>
                              <div>
                                <div className="font-weight-bold text-gray-800 small">Mind the Deadlines</div>
                                <div className="text-muted" style={{ fontSize: '11px' }}>Urgent goals need immediate attention</div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-0">
                            <div className="d-flex align-items-center mb-2">
                              <div className="icon-circle bg-primary text-white mr-3" style={{ width: '35px', height: '35px', fontSize: '14px' }}>
                                <i className="fas fa-coins"></i>
                              </div>
                              <div>
                                <div className="font-weight-bold text-gray-800 small">Regular Contributions</div>
                                <div className="text-muted" style={{ fontSize: '11px' }}>Small, consistent amounts work best</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Goal Analytics Summary */}
                      {eligibleGoals.length > 0 && (
                        <div className="card shadow-sm">
                          <div className="card-header py-3 bg-white">
                            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                              <i className="fas fa-chart-bar mr-2"></i>
                              Your Goals Overview
                              <i 
                                className="fas fa-info-circle ml-2 text-gray-400 cursor-pointer"
                                onClick={(e) => toggleTip('goal-analytics', e)}
                                style={{ cursor: 'pointer' }}
                              ></i>
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-xs font-weight-bold text-gray-500">TOTAL GOALS</span>
                                <span className="font-weight-bold text-primary">{eligibleGoals.length}</span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-xs font-weight-bold text-gray-500">TOTAL TARGET</span>
                                <span className="font-weight-bold text-success">
                                  {formatCurrency(eligibleGoals.reduce((sum, goal) => sum + goal.target_amount, 0))}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-xs font-weight-bold text-gray-500">CURRENT TOTAL</span>
                                <span className="font-weight-bold text-info">
                                  {formatCurrency(eligibleGoals.reduce((sum, goal) => sum + goal.current_amount, 0))}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-xs font-weight-bold text-gray-500">REMAINING</span>
                                <span className="font-weight-bold text-warning">
                                  {formatCurrency(eligibleGoals.reduce((sum, goal) => sum + (goal.target_amount - goal.current_amount), 0))}
                                </span>
                              </div>
                            </div>
                            
                            <div className="progress mb-2" style={{ height: '8px' }}>
                              <div
                                className="progress-bar bg-gradient-primary"
                                style={{ 
                                  width: `${Math.min(
                                    (eligibleGoals.reduce((sum, goal) => sum + goal.current_amount, 0) / 
                                     eligibleGoals.reduce((sum, goal) => sum + goal.target_amount, 0)) * 100, 
                                    100
                                  )}%` 
                                }}
                              ></div>
                            </div>
                            
                            <div className="text-center">
                              <small className="text-muted">
                                Overall Progress: {formatPercentage(
                                  (eligibleGoals.reduce((sum, goal) => sum + goal.current_amount, 0) / 
                                   eligibleGoals.reduce((sum, goal) => sum + goal.target_amount, 0)) * 100
                                )}
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'contribution' && selectedGoal && (
            <div className="modal-body">
              <div className="row">
                <div className="col-md-8">
                  <form onSubmit={handleSubmit}>
                    {error && (
                      <div className="alert alert-danger animate__animated animate__shakeX" role="alert">
                        <i className="fas fa-exclamation-circle mr-2"></i>
                        {error}
                      </div>
                    )}

                    {/* Selected Goal Display */}
                    <div className="form-group mb-4">
                      <label className="font-weight-bold text-gray-800">
                        Contributing To Goal
                      </label>
                      <div className="card bg-light py-3 shadow-sm">
                        <div className="card-body p-3">
                          <div className="row align-items-center">
                            <div className="col-auto">
                              <i className="fas fa-flag fa-2x text-primary"></i>
                            </div>
                            <div className="col">
                              <h6 className="mb-0 font-weight-bold">{selectedGoal.goal_name}</h6>
                              <div className="text-xs text-gray-600 mt-1">
                                Current Progress: {formatPercentage((selectedGoal.current_amount / selectedGoal.target_amount) * 100)} • 
                                {' '}{formatCurrency(selectedGoal.current_amount)} of {formatCurrency(selectedGoal.target_amount)}
                              </div>
                              <div className="progress mt-2" style={{ height: '6px' }}>
                                <div
                                  className={`progress-bar ${
                                    ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 75 ? 'bg-success' :
                                    ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 40 ? 'bg-warning' : 'bg-danger'
                                  }`}
                                  style={{ width: `${Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="amount" className="font-weight-bold">
                            Amount <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <div className="input-group-prepend">
                              <span className="input-group-text">₱</span>
                            </div>
                            <input
                              type="number"
                              id="amount"
                              name="amount"
                              value={contributionData.amount}
                              onChange={handleInputChange}
                              className="form-control form-control-user"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>
                          <small className="form-text text-muted">
                            Enter the amount you want to contribute towards this goal
                          </small>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="account_id" className="font-weight-bold">
                            From Account <span className="text-danger">*</span>
                          </label>
                          {loadingAccounts ? (
                            <div className="form-control d-flex align-items-center">
                              <div className="spinner-border spinner-border-sm mr-2" role="status"></div>
                              Loading accounts...
                            </div>
                          ) : (
                            <select
                              id="account_id"
                              name="account_id"
                              value={contributionData.account_id}
                              onChange={handleInputChange}
                              className="form-control"
                              required
                            >
                              <option value="">Select Account</option>
                              {accounts.filter(account => account.id).map((account) => (
                                <option key={account.id} value={account.id!.toString()}>
                                  {account.account_name} ({formatCurrency(account.balance)})
                                </option>
                              ))}
                            </select>
                          )}
                          <small className="form-text text-muted">
                            Select the account to withdraw funds from
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="notes" className="font-weight-bold">
                        Description
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={contributionData.notes}
                        onChange={handleInputChange}
                        className="form-control"
                        rows={3}
                        placeholder="Add any notes about this contribution"
                      ></textarea>
                      <small className="form-text text-muted">
                        Briefly describe this contribution (optional)
                      </small>
                    </div>

                    <div className="modal-footer border-0 px-0">
                      <button 
                        type="button" 
                        className="btn btn-secondary d-inline-flex align-items-center mr-2"
                        onClick={handleBackToSelection}
                      >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Back to Goals
                      </button>
                      <button 
                        type="submit" 
                        disabled={loadingAccounts}
                        className="btn btn-primary d-inline-flex align-items-center"
                      >
                        <i className="fas fa-arrow-right mr-2"></i>
                        Continue to Review
                      </button>
                    </div>
                  </form>
                </div>

                {/* Tips and Goal Summary Sidebar */}
                <div className="col-md-4 bg-light border-left">
                  <div className="p-4">
                    {/* Goal Tips - Same as GoalContribution page */}
                    <div className="card shadow mb-4">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Goal Tips</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)" }}>
                              <i className="fas fa-piggy-bank text-primary"></i>
                            </div>
                            <p className="font-weight-bold mb-0">Regular Contributions</p>
                          </div>
                          <p className="text-sm text-muted ml-5">Small regular contributions add up quickly</p>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)" }}>
                              <i className="fas fa-calendar-check text-success"></i>
                            </div>
                            <p className="font-weight-bold mb-0">Set Up Auto-Savings</p>
                          </div>
                          <p className="text-sm text-muted ml-5">Automate transfers to meet goal deadlines</p>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle p-2 mr-3" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                              <i className="fas fa-bolt text-warning"></i>
                            </div>
                            <p className="font-weight-bold mb-0">Bonus Contributions</p>
                          </div>
                          <p className="text-sm text-muted ml-5">Add windfalls or bonuses to accelerate progress</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Goal Summary Card - Same as GoalContribution page */}
                    <div className="card shadow mb-4">
                      <div className="card-header py-3">
                        <h6 className="m-0 font-weight-bold text-primary">Goal Summary</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Current Progress</div>
                          <div className="mb-2">
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar bg-${
                                  ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 75 ? "success" : 
                                  ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 40 ? "warning" : 
                                  "danger"
                                }`}
                                role="progressbar"
                                style={{
                                  width: `${Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)}%`,
                                }}
                                aria-valuenow={(selectedGoal.current_amount / selectedGoal.target_amount) * 100}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                            <div className="d-flex justify-content-between mt-1">
                              <small className="text-gray-500">
                                {formatCurrency(selectedGoal.current_amount)}
                              </small>
                              <small className="text-gray-500">
                                {formatCurrency(selectedGoal.target_amount)}
                              </small>
                            </div>
                          </div>
                          
                          <div className="d-flex justify-content-between mt-3">
                            <div>
                              <div className="text-xs font-weight-bold text-gray-500">Remaining</div>
                              <div className="font-weight-bold">{formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-weight-bold text-gray-500">Target Date</div>
                              <div className="font-weight-bold">{formatDate(selectedGoal.target_date)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'review' && selectedGoal && (
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger animate__animated animate__shakeX" role="alert">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}

              <div className="row mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Contribution Amount
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            ₱{parseFloat(contributionData.amount).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-peso-sign fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-success shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                            From Account
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {accounts.find(acc => acc.id && acc.id.toString() === contributionData.account_id)?.account_name}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-university fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card border-left-info shadow h-100 py-2 mb-4">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Contributing To Goal
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {selectedGoal.goal_name} ({formatPercentage((selectedGoal.current_amount / selectedGoal.target_amount) * 100)} complete)
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-flag fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>

              {contributionData.notes && (
                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Notes
                    </div>
                    <p className="mb-0">{contributionData.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="card border-left-warning shadow h-100 py-2 mb-4">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        New Goal Progress After Contribution
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(selectedGoal.current_amount + parseFloat(contributionData.amount))} / {formatCurrency(selectedGoal.target_amount)}
                        {' '} ({formatPercentage(((selectedGoal.current_amount + parseFloat(contributionData.amount)) / selectedGoal.target_amount) * 100)})
                      </div>
                      <div className="progress mt-2" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${Math.min(((selectedGoal.current_amount + parseFloat(contributionData.amount)) / selectedGoal.target_amount) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 px-0">
                <button 
                  type="button" 
                  className="btn btn-light btn-icon-split mr-2"
                  onClick={() => setStep('contribution')}
                >
                  <span className="icon text-gray-600">
                    <i className="fas fa-arrow-left"></i>
                  </span>
                  <span className="text">Back to Edit</span>
                </button>
                <button 
                  onClick={handleFinalSubmit} 
                  disabled={isSubmitting}
                  className="btn btn-success btn-icon-split"
                >
                  <span className="icon text-white-50">
                    <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                  </span>
                  <span className="text">{isSubmitting ? "Processing..." : "Confirm Contribution"}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'selection' && eligibleGoals.length > 0 && (
            <div className="modal-footer bg-light">
              <div className="w-100 d-flex justify-content-center">
                <small className="text-muted d-flex align-items-center">
                  <i className="fas fa-lightbulb text-warning mr-2"></i>
                  Click on any goal card above to start contributing
                </small>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Permission Error Modal */}
      <PermissionErrorModal
        isOpen={showPermissionError}
        onClose={() => setShowPermissionError(false)}
        errorTitle={permissionError?.title || "Access Denied"}
        errorMessage={permissionError?.message || "You don't have permission to perform this action."}
        suggestedActions={permissionError?.suggestedActions}
        userRole={familyPermissions.permissionState.familyRole || undefined}
      />
    </div>
  );
};

export default ContributionModal;