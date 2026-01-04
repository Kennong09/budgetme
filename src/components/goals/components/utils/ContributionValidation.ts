import { ContributionData, GoalAnalytics, ValidationResult, GoalCardAnalytics, ContributionError } from '../types/ContributionTypes';
import { Goal as GoalType } from '../../../../types';
import { Account } from '../../../settings/types';
import { formatCurrency, formatPercentage, getRemainingDays } from '../../../../utils/helpers';

export class ContributionValidation {
  /**
   * Validates contribution form data
   */
  static validateContribution(
    contributionData: ContributionData,
    selectedGoal: GoalType | null,
    selectedAccount: Account | null
  ): ValidationResult {
    // Check if amount is valid
    if (!contributionData.amount || parseFloat(contributionData.amount) <= 0) {
      return {
        isValid: false,
        error: "Please enter a valid amount greater than zero"
      };
    }

    // Check if account is selected
    if (!contributionData.account_id) {
      return {
        isValid: false,
        error: "Please select an account"
      };
    }

    // Check if goal is selected
    if (!selectedGoal) {
      return {
        isValid: false,
        error: "No goal selected"
      };
    }

    // Check if account exists
    if (!selectedAccount) {
      return {
        isValid: false,
        error: "Selected account not found"
      };
    }

    const contributionAmount = parseFloat(contributionData.amount);

    // Check account balance
    if (selectedAccount.balance < contributionAmount) {
      return {
        isValid: false,
        error: `Insufficient funds in ${selectedAccount.account_name}. Available balance: ${formatCurrency(selectedAccount.balance)}`
      };
    }

    // Check if contribution would exceed goal target
    const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
    if (contributionAmount > remainingAmount) {
      return {
        isValid: false,
        error: `Contribution exceeds goal target. Maximum contribution: ${formatCurrency(remainingAmount)}`
      };
    }

    return { isValid: true };
  }

  /**
   * Creates specific error for personal vs family goals
   */
  static createContributionError(
    errorType: 'validation' | 'permission' | 'network' | 'balance' | 'family_restriction' | 'goal_limit',
    message: string,
    goal?: GoalType | null,
    account?: Account | null,
    details?: string
  ): ContributionError {
    const isFamily = goal?.is_family_goal;
    const goalType = isFamily ? 'Family Goal' : 'Personal Goal';
    
    switch (errorType) {
      case 'validation':
        return {
          type: 'validation',
          title: `${goalType} - Validation Error`,
          message,
          details,
          suggestedActions: [
            'Check that all required fields are filled',
            'Ensure the amount is greater than zero',
            'Select a valid account'
          ],
          isRetryable: true
        };
      
      case 'balance':
        return {
          type: 'balance',
          title: `${goalType} - Insufficient Balance`,
          message,
          details: account ? `Available in ${account.account_name}: ${formatCurrency(account.balance)}` : undefined,
          suggestedActions: [
            'Choose a different account with sufficient balance',
            'Reduce the contribution amount',
            isFamily ? 'Ask family admin to add funds to family accounts' : 'Transfer funds to this account first'
          ],
          isRetryable: true
        };
      
      case 'family_restriction':
        return {
          type: 'family_restriction',
          title: 'Family Goal - Access Restricted',
          message,
          details,
          suggestedActions: [
            'Contact your family administrator for permission',
            'Use a family account instead of personal account',
            'Check if this goal allows contributions from your role'
          ],
          isRetryable: false
        };
      
      case 'goal_limit':
        return {
          type: 'goal_limit',
          title: `${goalType} - Contribution Limit Exceeded`,
          message,
          details: goal ? `Goal Target: ${formatCurrency(goal.target_amount)}` : undefined,
          suggestedActions: [
            'Reduce the contribution amount',
            'Check the remaining amount needed for this goal'
          ],
          isRetryable: true
        };
      
      case 'permission':
        return {
          type: 'permission',
          title: `${goalType} - Permission Denied`,
          message,
          details,
          suggestedActions: [
            isFamily ? 'Contact your family administrator' : 'Check your account permissions',
            'Try using a different account',
            'Verify your family role allows this action'
          ],
          isRetryable: false
        };
      
      case 'network':
        return {
          type: 'network',
          title: `${goalType} - Connection Error`,
          message,
          details,
          suggestedActions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Refresh the page if the problem persists'
          ],
          isRetryable: true
        };
      
      default:
        return {
          type: 'validation',
          title: `${goalType} - Error`,
          message,
          details,
          isRetryable: true
        };
    }
  }

  /**
   * Enhanced validation with detailed error creation
   */
  static validateContributionWithDetails(
    contributionData: ContributionData,
    selectedGoal: GoalType | null,
    selectedAccount: Account | null
  ): { isValid: boolean; error?: ContributionError } {
    // Check if amount is valid
    if (!contributionData.amount || parseFloat(contributionData.amount) <= 0) {
      return {
        isValid: false,
        error: this.createContributionError(
          'validation',
          'Please enter a valid amount greater than zero',
          selectedGoal,
          selectedAccount
        )
      };
    }

    // Check if account is selected
    if (!contributionData.account_id) {
      return {
        isValid: false,
        error: this.createContributionError(
          'validation',
          'Please select an account to contribute from',
          selectedGoal,
          selectedAccount
        )
      };
    }

    // Check if goal is selected
    if (!selectedGoal) {
      return {
        isValid: false,
        error: this.createContributionError(
          'validation',
          'No goal selected for contribution',
          selectedGoal,
          selectedAccount
        )
      };
    }

    // Check if account exists
    if (!selectedAccount) {
      return {
        isValid: false,
        error: this.createContributionError(
          'validation',
          'Selected account not found or no longer available',
          selectedGoal,
          selectedAccount
        )
      };
    }

    const contributionAmount = parseFloat(contributionData.amount);

    // Check account balance
    if (selectedAccount.balance < contributionAmount) {
      return {
        isValid: false,
        error: this.createContributionError(
          'balance',
          `Insufficient funds in ${selectedAccount.account_name}`,
          selectedGoal,
          selectedAccount,
          `You need ${formatCurrency(contributionAmount - selectedAccount.balance)} more to make this contribution`
        )
      };
    }

    // Check if contribution would exceed goal target
    const remainingAmount = selectedGoal.target_amount - selectedGoal.current_amount;
    if (contributionAmount > remainingAmount) {
      return {
        isValid: false,
        error: this.createContributionError(
          'goal_limit',
          `Contribution amount exceeds what's needed to complete this goal`,
          selectedGoal,
          selectedAccount,
          `Maximum needed: ${formatCurrency(remainingAmount)}`
        )
      };
    }

    // Family goal specific validations
    if (selectedGoal.is_family_goal) {
      // Check if individual account types are being used for family goal (this might need permission)
      const individualAccountTypes = ['checking', 'savings', 'cash'];
      if (individualAccountTypes.includes(selectedAccount.account_type)) {
        // This could be allowed or not based on family settings, but we'll show a warning
        console.warn('Using individual account for family goal - this may require additional permissions');
      }
    }

    return { isValid: true };
  }

  /**
   * Calculates analytics for a goal card
   */
  static calculateGoalCardAnalytics(goal: GoalType): GoalCardAnalytics {
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    const remainingAmount = goal.target_amount - goal.current_amount;
    const remainingDays = goal.target_date ? getRemainingDays(goal.target_date) : null;
    const isUrgent = remainingDays !== null && remainingDays <= 30;
    const isNearComplete = progressPercentage >= 80;
    const dailyTarget = remainingDays && remainingDays > 0 ? remainingAmount / remainingDays : undefined;

    return {
      progressPercentage,
      remainingAmount,
      remainingDays,
      isUrgent,
      isNearComplete,
      dailyTarget
    };
  }

  /**
   * Filters goals that are eligible for contributions
   */
  static filterEligibleGoals(goals: GoalType[], canContributeToFamilyGoals: boolean): GoalType[] {
    return goals.filter(goal => {
      const status = goal.status?.toLowerCase();
      const hasRemainingAmount = (goal.target_amount - goal.current_amount) > 0;
      const isEligible = (status === 'not_started' || status === 'in_progress') && hasRemainingAmount;
      
      // If it's a family goal, check family permissions
      if (isEligible && goal.is_family_goal) {
        return canContributeToFamilyGoals;
      }
      
      return isEligible;
    });
  }

  /**
   * Calculates overall goal statistics
   */
  static calculateGoalStatistics(goals: GoalType[]) {
    const totalGoals = goals.length;
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
    const totalRemaining = goals.reduce((sum, goal) => sum + (goal.target_amount - goal.current_amount), 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return {
      totalGoals,
      totalTarget,
      totalCurrent,
      totalRemaining,
      overallProgress
    };
  }

  /**
   * Calculates new progress after a contribution
   */
  static calculateNewProgress(goal: GoalType, contributionAmount: number) {
    const newAmount = goal.current_amount + contributionAmount;
    const newProgress = (newAmount / goal.target_amount) * 100;
    const remainingAfterContribution = goal.target_amount - newAmount;
    
    return {
      newAmount,
      newProgress,
      remainingAfterContribution,
      willComplete: newProgress >= 100
    };
  }

  /**
   * Gets completion status message based on progress
   */
  static getCompletionStatusMessage(progressPercentage: number): string {
    if (progressPercentage >= 100) {
      return "Goal will be completed! 🎉";
    } else if (progressPercentage >= 75) {
      return "Almost there! Keep it up!";
    } else if (progressPercentage >= 50) {
      return "Halfway milestone reached!";
    } else {
      return "Great progress, keep going!";
    }
  }
}
