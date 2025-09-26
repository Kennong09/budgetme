import React, { useState, useEffect } from "react";
import { BudgetService, BudgetItem } from "../../services/database/budgetService";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";

export interface BudgetSelectorProps {
  selectedBudgetId?: string;
  selectedCategoryId?: string;
  transactionAmount?: number;
  transactionType?: "income" | "expense" | "contribution";
  onBudgetSelect: (budget: BudgetItem | null) => void;
  className?: string;
  disabled?: boolean;
}

export interface BudgetWarning {
  type: "threshold" | "overrun" | "period_expiry";
  message: string;
  severity: "info" | "warning" | "error";
}

const BudgetSelector: React.FC<BudgetSelectorProps> = ({
  selectedBudgetId = "",
  selectedCategoryId,
  transactionAmount = 0,
  transactionType = "expense",
  onBudgetSelect,
  className = "",
  disabled = false,
}) => {
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<BudgetWarning[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);

  // For contribution transactions, treat them as expenses for budget assignment
  const effectiveTransactionType = transactionType === 'contribution' ? 'expense' : transactionType;

  // Filter budgets based on criteria from design
  const getFilteredBudgets = (allBudgets: BudgetItem[]): BudgetItem[] => {
    const currentDate = new Date();
    
    const filtered = allBudgets.filter(budget => {
      // Budget status is 'active'
      if (budget.status !== 'active') {
        return false;
      }
      
      // Current date falls within budget period
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      if (currentDate < startDate || currentDate > endDate) {
        return false;
      }
      
      // For expense/contribution transactions: budget category matches selected expense category
      // OR budget has no category (allowing unassigned budgets to be selected)
      if ((transactionType === 'expense' || transactionType === 'contribution') && selectedCategoryId) {
        const budgetCategoryMatches = budget.category_id === selectedCategoryId;
        const budgetHasNoCategory = !budget.category_id || budget.category_id === '';
        
        if (!budgetCategoryMatches && !budgetHasNoCategory) {
          return false;
        }
      }
      
      // Budget has remaining allocation (amount - spent > 0)
      const remaining = budget.amount - (budget.spent || 0);
      if (remaining <= 0) {
        return false;
      }
      
      return true;
    });
    
    return filtered;
  };

  // Filter budgets based on search term
  const filteredBudgets = getFilteredBudgets(budgets).filter((budget: BudgetItem) =>
    budget.budget_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected budget when selectedBudgetId changes
  useEffect(() => {
    if (selectedBudgetId) {
      const budget = budgets.find(b => b.id === selectedBudgetId);
      setSelectedBudget(budget || null);
    } else {
      setSelectedBudget(null);
    }
  }, [selectedBudgetId, budgets]);

  // Calculate budget impact and warnings
  const calculateBudgetImpact = (budget: BudgetItem, amount: number): BudgetWarning[] => {
    const warnings: BudgetWarning[] = [];
    const newSpent = (budget.spent || 0) + amount;
    const newPercentage = (newSpent / budget.amount) * 100;
    
    // Budget overrun alert
    if (newSpent > budget.amount) {
      warnings.push({
        type: "overrun",
        message: `Transaction would exceed budget by ₱${(newSpent - budget.amount).toFixed(2)}`,
        severity: "error"
      });
    }
    // Budget threshold warning (80% default)
    else if (newPercentage >= 80) {
      warnings.push({
        type: "threshold",
        message: `Transaction would put budget at ${newPercentage.toFixed(1)}% utilization`,
        severity: "warning"
      });
    }
    
    // Period expiry notice (within 7 days)
    const endDate = new Date(budget.end_date);
    const currentDate = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 7 && daysRemaining > 0) {
      warnings.push({
        type: "period_expiry",
        message: `Budget period expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        severity: "info"
      });
    }
    
    return warnings;
  };

  const handleBudgetSelect = (budget: BudgetItem) => {
    setSelectedBudget(budget);
    onBudgetSelect(budget);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedBudget(null);
    onBudgetSelect(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Fetch budgets when component mounts or category changes
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!user) {
        setBudgets([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const budgetService = BudgetService.getInstance();
        const result = await budgetService.getBudgets(user.id);
        
        if (result.source === 'error') {
          throw new Error(result.error || 'Failed to load budgets');
        }

        setBudgets(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load budgets';
        setError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, [user?.id, selectedCategoryId, transactionType, showErrorToast]);

  // Update warnings when selection or amount changes
  useEffect(() => {
    if (selectedBudgetId && transactionAmount > 0) {
      const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
      if (selectedBudget) {
        const newWarnings = calculateBudgetImpact(selectedBudget, transactionAmount);
        setWarnings(newWarnings);
      }
    } else {
      setWarnings([]);
    }
  }, [selectedBudgetId, transactionAmount, budgets]);

  // Don't render for income transactions - MOVED AFTER ALL HOOKS
  if (transactionType === 'income') {
    return null;
  }

  return (
    <div className={`budget-selector selector-container ${className}`}>
      <div className="form-group">
        <label htmlFor="budget_id" className="font-weight-bold text-gray-800">
          Budget Assignment (Optional)
        </label>
        
        <div className="position-relative">
          {/* Selected Budget Display */}
          <div
            className={`d-flex align-items-center justify-content-between px-3 py-2 border bg-white ${
              disabled || loading ? 'bg-light' : ''
            } ${
              isOpen ? 'border-primary' : 'border-secondary'
            }`}
            onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
            style={{ 
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              borderRadius: '0.375rem',
              minHeight: '38px'
            }}
          >
            {selectedBudget ? (
              <div className="d-flex align-items-center">
                <div>
                  <div className="font-weight-medium text-gray-800">
                    {selectedBudget.budget_name}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted">
                {loading ? "Loading budgets..." : "Select Budget (Optional)"}
              </span>
            )}
            
            <div className="d-flex align-items-center">
              {selectedBudget && (
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
                  placeholder="Search budgets..."
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

              {/* Budget Options */}
              <div className="py-1">
                {error ? (
                  <div className="px-3 py-2 text-muted text-center">
                    Unable to load budgets
                  </div>
                ) : filteredBudgets.length === 0 ? (
                  <div className="px-3 py-2 text-muted text-center">
                    {searchTerm ? 'No budgets found' : 
                     selectedCategoryId ? 'No active budgets for this category' : 'Select a category first'}
                  </div>
                ) : (
                  filteredBudgets.map((budget) => (
                    <div
                      key={budget.id}
                      className={`px-3 py-2 d-flex align-items-center ${
                        selectedBudget?.id === budget.id ? 'bg-primary text-white' : ''
                      }`}
                      onClick={() => handleBudgetSelect(budget)}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedBudget?.id !== budget.id) {
                          e.currentTarget.style.backgroundColor = '#f8f9fc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedBudget?.id !== budget.id) {
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      <div className="flex-grow-1">
                        <div className="font-weight-medium">{budget.budget_name}</div>
                      </div>
                      {selectedBudget?.id === budget.id && (
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
          {selectedCategoryId 
            ? `Choose a budget to track this expense against. Showing ${filteredBudgets.length} of ${budgets.length} budgets.` 
            : "Select an expense category first to see available budgets"
          }
          {selectedCategoryId && filteredBudgets.length === 0 && budgets.length > 0 && (
            <span className="text-warning d-block mt-1">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              No budgets match this category. Consider creating a budget or use an unassigned budget.
            </span>
          )}
        </small>
      </div>

      {/* Budget Information Panel */}
      {selectedBudget && (
        <div className="card bg-light mt-3">
          <div className="card-body p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0 font-weight-bold text-primary">
                {selectedBudget.budget_name}
              </h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-2">
              <div className="d-flex justify-content-between text-sm mb-1">
                <span>Budget Progress</span>
                <span>{((selectedBudget.spent || 0) / selectedBudget.amount * 100).toFixed(1)}%</span>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div
                  className={`progress-bar ${
                    (selectedBudget.spent || 0) / selectedBudget.amount >= 0.8 
                      ? 'bg-danger' 
                      : (selectedBudget.spent || 0) / selectedBudget.amount >= 0.6 
                      ? 'bg-warning' 
                      : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(100, (selectedBudget.spent || 0) / selectedBudget.amount * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Budget Stats */}
            <div className="row text-sm">
              <div className="col-4 text-center">
                <div className="font-weight-bold">₱{selectedBudget.amount.toFixed(2)}</div>
                <div className="text-muted">Total</div>
              </div>
              <div className="col-4 text-center">
                <div className="font-weight-bold">₱{(selectedBudget.spent || 0).toFixed(2)}</div>
                <div className="text-muted">Spent</div>
              </div>
              <div className="col-4 text-center">
                <div className="font-weight-bold">₱{(selectedBudget.amount - (selectedBudget.spent || 0)).toFixed(2)}</div>
                <div className="text-muted">Remaining</div>
              </div>
            </div>

            {/* Transaction Impact Preview */}
            {transactionAmount > 0 && (
              <div className="mt-2 p-2 bg-white rounded border">
                <small className="text-muted d-block mb-1">After this transaction:</small>
                <div className="d-flex justify-content-between">
                  <span>New spent amount:</span>
                  <span className="font-weight-bold">
                    ₱{((selectedBudget.spent || 0) + transactionAmount).toFixed(2)}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Remaining:</span>
                  <span className={`font-weight-bold ${
                    (selectedBudget.amount - (selectedBudget.spent || 0) - transactionAmount) < 0 
                      ? 'text-danger' 
                      : 'text-success'
                  }`}>
                    ₱{(selectedBudget.amount - (selectedBudget.spent || 0) - transactionAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Extended Details */}
            {showDetails && (
              <div className="mt-3 pt-3 border-top">
                <div className="row text-sm">
                  <div className="col-6">
                    <div><strong>Category:</strong> {selectedBudget.category_name || 'Uncategorized'}</div>
                    <div><strong>Period:</strong> {selectedBudget.period}</div>
                  </div>
                  <div className="col-6">
                    <div><strong>Start:</strong> {new Date(selectedBudget.start_date).toLocaleDateString()}</div>
                    <div><strong>End:</strong> {new Date(selectedBudget.end_date).toLocaleDateString()}</div>
                  </div>
                </div>
                {selectedBudget.description && (
                  <div className="mt-2">
                    <strong>Description:</strong> {selectedBudget.description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`alert alert-${
                warning.severity === 'error' ? 'danger' : 
                warning.severity === 'warning' ? 'warning' : 'info'
              } alert-dismissible fade show mb-2`}
              role="alert"
            >
              <i className={`fas ${
                warning.severity === 'error' ? 'fa-exclamation-triangle' : 
                warning.severity === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle'
              } mr-2`}></i>
              {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div className="mt-3 p-3 bg-light rounded text-center">
          <i className="fas fa-exclamation-triangle text-warning mb-2"></i>
          <p className="mb-2 text-muted">{error}</p>
          <button 
            type="button" 
            className="btn btn-sm btn-outline-primary"
            onClick={() => {
              setError(null);
              // Trigger refetch by updating a dependency
              if (user) {
                const fetchBudgets = async () => {
                  setLoading(true);
                  try {
                    const budgetService = BudgetService.getInstance();
                    const result = await budgetService.getBudgets(user.id);
                    
                    if (result.source === 'error') {
                      throw new Error(result.error || 'Failed to load budgets');
                    }
                    setBudgets(result.data);
                    setError(null);
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load budgets';
                    setError(errorMessage);
                  } finally {
                    setLoading(false);
                  }
                };
                fetchBudgets();
              }
            }}
          >
            <i className="fas fa-sync-alt mr-1"></i>
            Retry
          </button>
        </div>
      )}

      {/* No budgets available message */}
      {!loading && !error && filteredBudgets.length === 0 && selectedCategoryId && (
        <div className="mt-3 p-3 bg-light rounded text-center">
          <i className="fas fa-info-circle text-muted mb-2"></i>
          <p className="mb-2 text-muted">No active budgets available for this category.</p>
          <button type="button" className="btn btn-sm btn-outline-primary">
            Create Budget for This Category
          </button>
        </div>
      )}
    </div>
  );
};

export default BudgetSelector;