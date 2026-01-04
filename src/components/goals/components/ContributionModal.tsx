import React, { useState, useEffect, FC, ChangeEvent, FormEvent, useMemo } from "react";
import { createPortal } from 'react-dom';
import { Goal as GoalType } from "../../../types";
import { Account } from "../../settings/types";
import { formatCurrency, formatPercentage, formatDate, getRemainingDays } from "../../../utils/helpers";
import { useAuth } from "../../../utils/AuthContext";
import { useToast } from "../../../utils/ToastContext";
import { supabase } from "../../../utils/supabaseClient";
import { goalsDataService } from "../services/goalsDataService";
import { useFamilyPermissions } from "../../../hooks/useFamilyPermissions";
import PermissionErrorModal from "../../common/PermissionErrorModal";
import { GoalContributionAuditService } from "../../../services/database/goalContributionAuditService";

// Import extracted components
import ContributionModalHeader from './components/ContributionModalHeader';
import ContributionSidebar from './components/ContributionSidebar';
import ContributionMobileFooter from './components/ContributionMobileFooter';
import ContributionErrorModal from './components/ContributionErrorModal';
import GoalSelectionStep from './steps/GoalSelectionStep';
import ContributionFormStep from './steps/ContributionFormStep';
import ReviewStep from './steps/ReviewStep';
import { 
  ContributionModalProps, 
  ContributionData, 
  ModalStep, 
  PermissionError,
  ContributionError,
  ErrorState,
  GoalAnalytics 
} from './types/ContributionTypes';
import { ContributionValidation } from './utils/ContributionValidation';

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
    width: 2.5rem !important;
    height: 2.5rem !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 1rem !important;
    flex-shrink: 0 !important;
    min-width: 2.5rem !important;
    min-height: 2.5rem !important;
    box-sizing: border-box !important;
  }
  .icon-circle-sm {
    width: 35px !important;
    height: 35px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 14px !important;
    flex-shrink: 0 !important;
    min-width: 35px !important;
    min-height: 35px !important;
    box-sizing: border-box !important;
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
  .goal-card {
    overflow: hidden !important;
    border-radius: 0.35rem !important;
    border: 1px solid #e3e6f0 !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .goal-card .card-body {
    padding: 1rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .goal-card .row {
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
  }
  .goal-card .col-auto {
    padding: 0 0.75rem 0 0 !important;
    flex: 0 0 auto !important;
    width: auto !important;
  }
  .goal-card .col {
    flex: 1 1 0% !important;
    min-width: 0 !important;
    padding: 0 0.75rem 0 0 !important;
  }
  .modal-dialog {
    max-width: 90% !important;
  }
  @media (min-width: 1200px) {
    .modal-dialog {
      max-width: 1140px !important;
    }
  }
  .goal-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.25) !important;
  }
  .modal-body .container-fluid {
    padding: 0 !important;
  }
  .modal-body .row {
    margin: 0 !important;
  }
  .col-12.mb-3 {
    padding: 0 15px !important;
    margin-bottom: 1rem !important;
  }
  .goal-card .card-body.p-3 {
    padding: 1rem !important;
  }
  .goal-card .row.align-items-center {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    width: 100% !important;
  }
  .goal-card .progress {
    height: 10px !important;
    background-color: #e9ecef !important;
    border-radius: 0.25rem !important;
    overflow: hidden !important;
  }
  .goal-card * {
    box-sizing: border-box !important;
  }
  
  /* Mobile sidebar animations */
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  /* Smooth scrolling for mobile */
  .smooth-scroll {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Custom scrollbar for mobile sidebar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const ContributionModal: FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  goals,
  onContributionSuccess,
  preSelectedGoal
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const familyPermissions = useFamilyPermissions();

  // Modal state - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [step, setStep] = useState<ModalStep>('selection');
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
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
  const [selectedGoalAnalytics, setSelectedGoalAnalytics] = useState<GoalAnalytics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Permission error modal state
  const [showPermissionError, setShowPermissionError] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  
  // Enhanced error handling state
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    showErrorModal: false
  });
  
  // Mobile sidebar state
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(false);

  // Filter eligible goals using the validation utility
  const eligibleGoals = useMemo(() => {
    if (!isOpen) return [];
    return ContributionValidation.filterEligibleGoals(
      goals, 
      familyPermissions.canContributeToGoals
    );
  }, [isOpen, goals, familyPermissions.canContributeToGoals]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('selection');
      setSelectedGoal(null);
      setSelectedAccount(null);
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
      setShowMobileSidebar(false);
      // Reset error state
      setErrorState({
        hasError: false,
        error: null,
        showErrorModal: false
      });
    }
  }, [isOpen]);

  // Auto-select goal if preSelectedGoal is provided
  useEffect(() => {
    if (isOpen && preSelectedGoal) {
      // Check if the pre-selected goal is eligible
      const isEligible = eligibleGoals.some(g => g.id === preSelectedGoal.id);
      if (isEligible) {
        handleGoalSelection(preSelectedGoal);
      }
    }
  }, [isOpen, preSelectedGoal, eligibleGoals]);
  
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

  // Auto-scroll mobile sidebar to top when opened
  useEffect(() => {
    if (showMobileSidebar) {
      setTimeout(() => {
        const sidebarContent = document.querySelector('.smooth-scroll.custom-scrollbar');
        if (sidebarContent) {
          sidebarContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [showMobileSidebar]);

  // Error handling utilities
  const showContributionError = (error: ContributionError) => {
    setErrorState({
      hasError: true,
      error,
      showErrorModal: true
    });
    // Also set the basic error for inline display
    setError(error.message);
  };

  const clearContributionError = () => {
    setErrorState({
      hasError: false,
      error: null,
      showErrorModal: false
    });
    setError(null);
  };

  const handleErrorRetry = () => {
    clearContributionError();
    // Could add specific retry logic here based on error type
  };

  // Enhanced validation function
  const validateContributionEnhanced = () => {
    const validationResult = ContributionValidation.validateContributionWithDetails(
      contributionData,
      selectedGoal,
      selectedAccount
    );

    if (!validationResult.isValid && validationResult.error) {
      showContributionError(validationResult.error);
      return false;
    }
    
    clearContributionError();
    return true;
  };

  // NOW IT'S SAFE TO RETURN NULL
  if (!isOpen) return null;

  const handleAccountSelect = (account: Account | null) => {
    setSelectedAccount(account);
    setContributionData(prev => ({
      ...prev,
      account_id: account?.id || ''
    }));
    setError(null);
  };

  const handleGoalSelection = async (goal: GoalType) => {
    // Check family goal permissions before allowing selection
    if (goal.is_family_goal) {
      const accessResult = await familyPermissions.checkCanAccessGoal(goal.id.toString());
      if (!accessResult.hasPermission) {
        const role = familyPermissions.familyRole;
        setPermissionError({
          title: "Goal Contribution Restricted",
          message: accessResult.errorMessage || `As a family ${role}, you cannot contribute to this family goal.`,
          suggestedActions: accessResult.restrictions
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
    
    // Calculate goal analytics using utility
    const analytics = ContributionValidation.calculateGoalCardAnalytics(goal);
    
    setSelectedGoalAnalytics({
      progressPercentage: analytics.progressPercentage,
      remainingAmount: analytics.remainingAmount,
      remainingDays: analytics.remainingDays,
      dailyRequired: analytics.dailyTarget || 0,
      isOnTrack: analytics.remainingDays ? ((analytics.dailyTarget || 0) * analytics.remainingDays) <= analytics.remainingAmount : true
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

  const handleAmountChange = (amount: string) => {
    setContributionData(prev => ({ ...prev, amount }));
    setError(null);
  };

  const validateContribution = (): boolean => {
    const result = ContributionValidation.validateContribution(
      contributionData,
      selectedGoal,
      selectedAccount
    );
    
    if (!result.isValid && result.error) {
      setError(result.error);
    }
    
    return result.isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || !selectedGoal) {
      const error = ContributionValidation.createContributionError(
        'validation',
        'Please ensure you are signed in and have selected a goal',
        selectedGoal
      );
      showContributionError(error);
      return;
    }

    // Enhanced validation with detailed error handling
    if (validateContributionEnhanced()) {
      // Move to review step instead of submitting directly
      setStep('review');
      clearContributionError();
    }
  };

  const handleFinalSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!user) {
        const error = ContributionValidation.createContributionError(
          'permission',
          'You must be signed in to make contributions',
          selectedGoal
        );
        showContributionError(error);
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

      // Enhanced family permission check for family goals
      if (selectedGoal.is_family_goal) {
        const accessResult = await familyPermissions.checkCanAccessGoal(selectedGoal.id.toString());
        if (!accessResult.hasPermission) {
          const role = familyPermissions.familyRole;
          const error = ContributionValidation.createContributionError(
            'family_restriction',
            accessResult.errorMessage || `As a family ${role}, you cannot contribute to this family goal.`,
            selectedGoal,
            selectedAccount,
            `Your role: ${role}`
          );
          if (accessResult.restrictions) {
            error.suggestedActions = accessResult.restrictions;
          }
          showContributionError(error);
          setIsSubmitting(false);
          setStep('contribution');
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

      // Log goal contribution to audit history (async, don't block on failure)
      try {
        if (result.data && selectedGoal && selectedAccount) {
          const auditData = GoalContributionAuditService.extractContributionAuditData(
            {
              id: result.data.contribution_id,
              goal_id: contributionData.goalId,
              source_account_id: contributionData.account_id,
              amount: contributionAmount,
              contribution_type: 'manual',
              notes: contributionData.notes,
              contribution_date: new Date().toISOString()
            },
            selectedGoal,
            selectedAccount
          );
          
          // Log audit activity (don't await to avoid blocking user flow)
          GoalContributionAuditService.logContributionCreated(
            user.id,
            auditData,
            navigator.userAgent
          ).catch(error => {
            console.error('Failed to log goal contribution to audit:', error);
            // Don't show error to user as this shouldn't interrupt their flow
          });
        }
      } catch (auditError) {
        console.error('Error preparing goal contribution audit log:', auditError);
        // Don't show error to user as this shouldn't interrupt their flow
      }

      showSuccessToast("Contribution made successfully!");
      onContributionSuccess();
      onClose();
    } catch (err) {
      console.error("Error making contribution:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      
      // Create appropriate error based on error type
      let errorType: 'network' | 'permission' | 'validation' = 'network';
      if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        errorType = 'permission';
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        errorType = 'validation';
      }
      
      const error = ContributionValidation.createContributionError(
        errorType,
        `Failed to ${selectedGoal?.is_family_goal ? 'contribute to family goal' : 'make contribution'}: ${errorMessage}`,
        selectedGoal,
        selectedAccount,
        'Please try again or contact support if the problem persists'
      );
      
      showContributionError(error);
      setStep('contribution'); // Go back to form on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 1060}}>
      <div className="w-[95vw] h-[90vh] mx-auto my-auto">
        <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200" style={{zIndex: 1065}}>
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

          <ContributionModalHeader
            currentStep={step}
            onClose={onClose}
            onShowMobileSidebar={() => setShowMobileSidebar(true)}
          />

          {step === 'selection' && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <GoalSelectionStep
                        eligibleGoals={eligibleGoals}
                        onGoalSelection={handleGoalSelection}
                      />
                    </div>
                  </div>
                  
                  {/* Sidebar - Hidden on mobile */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <ContributionSidebar
                        currentStep={step}
                        eligibleGoals={eligibleGoals}
                        onTipClick={toggleTip}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer - Selection Step */}
              <ContributionMobileFooter
                currentStep={step}
                eligibleGoalsCount={eligibleGoals.length}
              />
            </>
          )}

          {step === 'contribution' && selectedGoal && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <ContributionFormStep
                        selectedGoal={selectedGoal}
                        contributionData={contributionData}
                        selectedAccount={selectedAccount}
                        error={error}
                        onInputChange={handleInputChange}
                        onAccountSelect={handleAccountSelect}
                        onBackToSelection={handleBackToSelection}
                        onSubmit={handleSubmit}
                        onAmountChange={handleAmountChange}
                      />
                    </div>
                  </div>
                  
                  {/* Sidebar - Hidden on mobile */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <ContributionSidebar
                        currentStep={step}
                        selectedGoal={selectedGoal}
                        selectedAccount={selectedAccount}
                        contributionAmount={contributionData.amount}
                        onTipClick={toggleTip}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer - Contribution Step */}
              <ContributionMobileFooter
                currentStep={step}
                onPrevious={handleBackToSelection}
                onNext={() => {
                  // Enhanced validation with detailed error handling
                  if (validateContributionEnhanced()) {
                    setStep('review');
                    clearContributionError();
                  }
                }}
                isNextDisabled={!contributionData.amount || !contributionData.account_id}
                showPrevious={true}
              />
            </>
          )}

          {step === 'review' && selectedGoal && selectedAccount && (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex w-full h-full">
                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto pb-20 md:pb-6">
                      <ReviewStep
                        selectedGoal={selectedGoal}
                        selectedAccount={selectedAccount}
                        contributionData={contributionData}
                        error={error}
                        isSubmitting={isSubmitting}
                        onBack={() => setStep('contribution')}
                        onSubmit={handleFinalSubmit}
                      />
                    </div>
                  </div>
                  
                  {/* Sidebar - Hidden on mobile */}
                  <div className="hidden md:flex md:w-1/3 bg-gray-50 border-l border-gray-200 flex-col">
                    <div className="p-3 md:p-6 lg:p-8 flex-1 overflow-y-auto">
                      <ContributionSidebar
                        currentStep={step}
                        selectedGoal={selectedGoal}
                        selectedAccount={selectedAccount}
                        contributionAmount={contributionData.amount}
                        onTipClick={toggleTip}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Footer - Review Step */}
              <ContributionMobileFooter
                currentStep={step}
                onPrevious={() => setStep('contribution')}
                onSubmit={handleFinalSubmit}
                isSubmitting={isSubmitting}
                showPrevious={true}
              />
            </>
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
        userRole={familyPermissions.familyRole || undefined}
      />
      
      {/* Mobile Sidebar Modal */}
      {showMobileSidebar && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden flex items-end justify-center animate-fadeIn" style={{ zIndex: 1050 }} onClick={() => setShowMobileSidebar(false)}>
          <div 
            className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[80vh] overflow-hidden animate-slideUp flex flex-col" 
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Goal Information</h3>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-times text-gray-600 text-sm"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 smooth-scroll custom-scrollbar" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              <ContributionSidebar
                currentStep={step}
                eligibleGoals={eligibleGoals}
                selectedGoal={selectedGoal}
                selectedAccount={selectedAccount}
                contributionAmount={contributionData.amount}
                onTipClick={toggleTip}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Enhanced Error Modal */}
      <ContributionErrorModal
        isOpen={errorState.showErrorModal}
        error={errorState.error}
        onClose={() => setErrorState(prev => ({ ...prev, showErrorModal: false }))}
        onRetry={handleErrorRetry}
      />
    </div>
  );
};

export default ContributionModal;
