import React, { useState } from 'react';
import { ModalStep, WorkflowType, ModalState } from '../types/BudgetSetupTypes';

interface BudgetSidebarProps {
  currentStep: ModalStep;
  workflowType?: WorkflowType;
  modalState: ModalState;
  onTipClick?: (tipId: string) => void;
}

interface TipContent {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: 'workflow' | 'form' | 'process' | 'analytics';
}

const BudgetSidebar: React.FC<BudgetSidebarProps> = ({
  currentStep,
  workflowType,
  modalState,
  onTipClick
}) => {
  const [activePanel, setActivePanel] = useState<'tips' | 'analytics' | 'actions'>('tips');

  // Dynamic tip content based on current step
  const getStepTips = (): TipContent[] => {
    const tipMap: Record<ModalStep, TipContent[]> = {
      'workflow_choice': [
        {
          id: 'workflow_budget_first',
          icon: 'fas fa-wallet',
          title: 'Budget-First Approach',
          description: 'Start by setting spending limits, then add transactions as they occur. Great for planning ahead.',
          category: 'workflow'
        },
        {
          id: 'workflow_transaction_first',
          icon: 'fas fa-exchange-alt',
          title: 'Transaction-First Approach',
          description: 'Record a transaction first, then create budgets based on your spending patterns.',
          category: 'workflow'
        },
        {
          id: 'workflow_experience',
          icon: 'fas fa-user-graduate',
          title: 'Choose Based on Experience',
          description: 'New to budgeting? Try Budget-First. Experienced? Transaction-First gives more flexibility.',
          category: 'process'
        }
      ],
      'budget_config': [
        {
          id: 'budget_naming',
          icon: 'fas fa-tag',
          title: 'Descriptive Names',
          description: 'Use clear, specific names like "Monthly Groceries" instead of just "Food".',
          category: 'form'
        },
        {
          id: 'budget_amount',
          icon: 'fas fa-calculator',
          title: 'Realistic Amounts',
          description: 'Set achievable budget amounts based on your historical spending patterns.',
          category: 'analytics'
        },
        {
          id: 'budget_period',
          icon: 'fas fa-calendar',
          title: 'Period Selection',
          description: 'Monthly budgets are most common, but quarterly works well for irregular expenses.',
          category: 'process'
        }
      ],
      'transaction_setup': [
        {
          id: 'transaction_accuracy',
          icon: 'fas fa-bullseye',
          title: 'Accurate Details',
          description: 'Include all transaction details for better budget tracking and insights.',
          category: 'form'
        },
        {
          id: 'transaction_category',
          icon: 'fas fa-folder',
          title: 'Category Matching',
          description: 'Choose categories that match your budget structure for consistency.',
          category: 'process'
        },
        {
          id: 'transaction_account',
          icon: 'fas fa-university',
          title: 'Account Selection',
          description: 'Select the correct account to maintain accurate balance tracking.',
          category: 'analytics'
        }
      ],
      'transaction_create': [
        {
          id: 'initial_transaction',
          icon: 'fas fa-plus-circle',
          title: 'Initial Transaction',
          description: 'This transaction will be your first entry against the new budget.',
          category: 'process'
        },
        {
          id: 'budget_impact',
          icon: 'fas fa-chart-pie',
          title: 'Budget Impact',
          description: 'See how this transaction affects your budget utilization in real-time.',
          category: 'analytics'
        }
      ],
      'transaction_review': [
        {
          id: 'transaction_summary',
          icon: 'fas fa-receipt',
          title: 'Transaction Review',
          description: 'Verify all transaction details before finalizing your budget setup.',
          category: 'process'
        },
        {
          id: 'future_planning',
          icon: 'fas fa-chart-line',
          title: 'Future Planning',
          description: 'This data will help create more accurate budgets in the future.',
          category: 'analytics'
        }
      ],
      'final_confirmation': [
        {
          id: 'completion_success',
          icon: 'fas fa-check-circle',
          title: 'Almost Done!',
          description: 'You\'re about to complete your budget setup successfully.',
          category: 'process'
        },
        {
          id: 'next_steps',
          icon: 'fas fa-road',
          title: 'What\'s Next',
          description: 'After creation, you can track spending and make adjustments as needed.',
          category: 'analytics'
        }
      ]
    };

    return tipMap[currentStep] || [];
  };

  // Quick actions based on current step
  const getQuickActions = () => {
    const actionMap: Record<ModalStep, Array<{id: string, label: string, icon: string, action: string}>> = {
      'workflow_choice': [
        { id: 'learn_budgeting', label: 'Budgeting Guide', icon: 'fas fa-book', action: 'guide' },
        { id: 'view_examples', label: 'See Examples', icon: 'fas fa-eye', action: 'examples' }
      ],
      'budget_config': [
        { id: 'category_help', label: 'Category Guide', icon: 'fas fa-question-circle', action: 'help' },
        { id: 'amount_calculator', label: 'Amount Calculator', icon: 'fas fa-calculator', action: 'calculator' }
      ],
      'transaction_setup': [
        { id: 'account_balance', label: 'Check Balance', icon: 'fas fa-balance-scale', action: 'balance' },
        { id: 'recent_transactions', label: 'Recent Activity', icon: 'fas fa-history', action: 'history' }
      ],
      'final_confirmation': [
        { id: 'completion_success', label: 'Completion Guide', icon: 'fas fa-check-circle', action: 'guide' },
        { id: 'next_steps', label: 'Next Steps', icon: 'fas fa-road', action: 'next' }
      ]
    };

    return actionMap[currentStep] || [];
  };

  // Budget analytics display
  const getBudgetAnalytics = () => {
    if (!modalState.budgetData.amount) return null;

    const budgetAmount = modalState.budgetData.amount;
    const transactionAmount = modalState.transactionData.amount || 0;
    const utilization = budgetAmount > 0 ? (transactionAmount / budgetAmount) * 100 : 0;

    return {
      budgetAmount,
      transactionAmount,
      utilization,
      remaining: budgetAmount - transactionAmount
    };
  };

  const analytics = getBudgetAnalytics();
  const tips = getStepTips();
  const quickActions = getQuickActions();

  return (
    <div className="bg-light border-left" style={{ minHeight: '500px' }}>
      <div className="p-4">
        {/* Panel Tabs */}
        <div className="nav nav-pills nav-fill mb-4" role="tablist">
          <button
            className={`nav-link ${activePanel === 'tips' ? 'active' : ''}`}
            onClick={() => setActivePanel('tips')}
            style={{ fontSize: '0.75rem', padding: '0.5rem' }}
          >
            <i className="fas fa-lightbulb mr-1"></i>
            Tips
          </button>
          <button
            className={`nav-link ${activePanel === 'analytics' ? 'active' : ''}`}
            onClick={() => setActivePanel('analytics')}
            style={{ fontSize: '0.75rem', padding: '0.5rem' }}
          >
            <i className="fas fa-chart-line mr-1"></i>
            Analytics
          </button>
          <button
            className={`nav-link ${activePanel === 'actions' ? 'active' : ''}`}
            onClick={() => setActivePanel('actions')}
            style={{ fontSize: '0.75rem', padding: '0.5rem' }}
          >
            <i className="fas fa-bolt mr-1"></i>
            Actions
          </button>
        </div>

        {/* Tips Panel */}
        {activePanel === 'tips' && (
          <div className="tips-panel">
            <div className="card shadow-sm mb-4">
              <div className="card-header py-3 bg-white">
                <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                  <i className="fas fa-lightbulb mr-2"></i>
                  Smart Tips
                </h6>
              </div>
              <div className="card-body">
                {tips.map((tip, index) => {
                  // Define colors for different tip types
                  const getIconColor = (category: string) => {
                    switch (category) {
                      case 'form': return 'bg-success';
                      case 'process': return 'bg-warning';
                      case 'analytics': return 'bg-primary';
                      default: return 'bg-primary';
                    }
                  };

                  return (
                    <div key={tip.id} className={index === tips.length - 1 ? 'mb-0' : 'mb-3'}>
                      <div className="d-flex align-items-center mb-2">
                        <div className={`icon-circle ${getIconColor(tip.category)} text-white mr-3`} style={{ width: '35px', height: '35px', fontSize: '14px' }}>
                          <i className={tip.icon}></i>
                        </div>
                        <div>
                          <div className="font-weight-bold text-gray-800 small">{tip.title}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{tip.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {activePanel === 'analytics' && (
          <div className="analytics-panel">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-success">Budget Analytics</h6>
              </div>
              <div className="card-body">
                {analytics ? (
                  <>
                    {/* Budget Amount */}
                    <div className="card bg-primary text-white shadow mb-3">
                      <div className="card-body">
                        <div className="text-white-50 small">Budget Amount</div>
                        <div className="h5 mb-0">
                          ₱{analytics.budgetAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Amount */}
                    {analytics.transactionAmount > 0 && (
                      <div className="card bg-warning text-white shadow mb-3">
                        <div className="card-body">
                          <div className="text-white-50 small">Initial Transaction</div>
                          <div className="h5 mb-0">
                            ₱{analytics.transactionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Utilization */}
                    {analytics.transactionAmount > 0 && (
                      <div className="card bg-info text-white shadow mb-3">
                        <div className="card-body">
                          <div className="text-white-50 small">Budget Utilization</div>
                          <div className="h5 mb-0">{analytics.utilization.toFixed(1)}%</div>
                          <div className="progress mt-2" style={{ height: '6px' }}>
                            <div
                              className="progress-bar bg-white"
                              style={{ width: `${Math.min(analytics.utilization, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Remaining Budget */}
                    <div className="card bg-success text-white shadow">
                      <div className="card-body">
                        <div className="text-white-50 small">Remaining Budget</div>
                        <div className="h5 mb-0">
                          ₱{analytics.remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-chart-line fa-3x text-gray-300 mb-3"></i>
                    <p className="text-muted">Budget analytics will appear here once you configure your budget details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        {activePanel === 'actions' && (
          <div className="actions-panel">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-warning">Quick Actions</h6>
              </div>
              <div className="card-body">
                {quickActions.length > 0 ? (
                  quickActions.map((action) => (
                    <button
                      key={action.id}
                      className="btn btn-outline-primary btn-sm btn-block mb-2 text-left"
                      onClick={() => {/* Action placeholder */}}
                    >
                      <i className={`${action.icon} mr-2`}></i>
                      {action.label}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-bolt fa-3x text-gray-300 mb-3"></i>
                    <p className="text-muted">No quick actions available for this step.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workflow Guide */}
        {workflowType && (
          <div className="card bg-light border-0 mt-4">
            <div className="card-body text-center py-3">
              <small className="text-muted d-flex align-items-center justify-content-center">
                <i className="fas fa-route mr-2"></i>
                Using {workflowType === 'budget_first' ? 'Budget-First' : 'Transaction-First'} Approach
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSidebar;