import React, { useState, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { BudgetService, BudgetItem } from "../../services/database/budgetService";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { formatCurrency } from "../../utils/currencyUtils";

export interface BudgetSelectorProps {
  selectedBudgetId?: string;
  selectedCategoryId?: string;
  transactionAmount?: number;
  transactionType?: "income" | "expense" | "contribution";
  onBudgetSelect: (budget: BudgetItem | null) => void;
  onCategoryAutoSelect?: (categoryId: string, categoryName?: string) => void; // New prop for auto-selecting category
  className?: string;
  disabled?: boolean;
}

export interface BudgetWarning {
  type: "threshold" | "overrun" | "period_expiry";
  message: string;
  severity: "info" | "warning" | "error";
}

const BudgetSelector: React.FC<BudgetSelectorProps> = memo(({
  selectedBudgetId = "",
  selectedCategoryId,
  transactionAmount = 0,
  transactionType = "expense",
  onBudgetSelect,
  onCategoryAutoSelect,
  className = "",
  disabled = false,
}) => {
  console.log('🎣 BudgetSelector: Component initialized/re-rendered with props:', {
    selectedBudgetId,
    selectedCategoryId,
    transactionAmount,
    transactionType,
    disabled
  });

  const { user } = useAuth();
  const { showErrorToast } = useToast();
  
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  
  // Debug: Track budgets state changes
  useEffect(() => {
    console.log('📋 BudgetSelector: budgets state updated', {
      budgetCount: budgets.length,
      budgets: budgets.map(b => ({ 
        id: b.id, 
        name: b.budget_name, 
        status: b.status,
        category_id: b.category_id,
        category_name: b.category_name 
      }))
    });
  }, [budgets]);
  
  // Debug: Track dependency changes for budget fetching useEffect
  useEffect(() => {
    console.log('🔄 BudgetSelector: Dependencies changed for budget fetching:', {
      userId: user?.id,
      selectedCategoryId,
      transactionType,
      timestamp: new Date().toISOString()
    });
  }, [user?.id, selectedCategoryId, transactionType]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<BudgetWarning[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // For contribution transactions, treat them as expenses for budget assignment
  const effectiveTransactionType = transactionType === 'contribution' ? 'expense' : transactionType;

  // Show all budgets with minimal filtering - let users choose what makes sense
  const getFilteredBudgets = (allBudgets: BudgetItem[]): BudgetItem[] => {
    const currentDate = new Date();
    
    console.log('🔍 BudgetSelector: Starting budget filtering (showing all budgets)', {
      totalBudgets: allBudgets.length,
      selectedCategoryId,
      transactionType,
      currentDate: currentDate.toISOString()
    });
    
    // Minimal filtering - only exclude budgets with major issues
    const filtered = allBudgets.filter(budget => {
      console.log(`📋 Checking budget: ${budget.budget_name}`, {
        id: budget.id,
        status: budget.status,
        category_id: budget.category_id,
        category_name: budget.category_name,
        amount: budget.amount,
        spent: budget.spent,
        start_date: budget.start_date,
        end_date: budget.end_date
      });
      
      // Only exclude completely inactive budgets (status = 'deleted' or similar)
      // Still show 'paused', 'expired', etc. so users can see all their budgets
      if (budget.status === 'deleted' || budget.status === 'archived') {
        console.log(`❌ Budget ${budget.budget_name} filtered out: status is ${budget.status}`);
        return false;
      }
      
      // Include all other budgets regardless of date range or remaining amount
      // Users should be able to see and select from all their budgets
      console.log(`✅ Budget ${budget.budget_name} included`);
      return true;
    });
    
    console.log('🎯 BudgetSelector: Filtering complete (showing all budgets)', {
      originalCount: allBudgets.length,
      filteredCount: filtered.length,
      filteredBudgets: filtered.map(b => ({ id: b.id, name: b.budget_name, category: b.category_name }))
    });
    
    // Sort budgets intelligently
    filtered.sort((a, b) => {
      const currentDate = new Date();
      const aStartDate = new Date(a.start_date);
      const aEndDate = new Date(a.end_date);
      const bStartDate = new Date(b.start_date);
      const bEndDate = new Date(b.end_date);
      
      const aIsActive = a.status === 'active';
      const bIsActive = b.status === 'active';
      const aIsCurrent = currentDate >= aStartDate && currentDate <= aEndDate;
      const bIsCurrent = currentDate >= bStartDate && currentDate <= bEndDate;
      const aHasRemaining = (a.amount - (a.spent || 0)) > 0;
      const bHasRemaining = (b.amount - (b.spent || 0)) > 0;
      const aMatchesCategory = selectedCategoryId && a.category_id === selectedCategoryId;
      const bMatchesCategory = selectedCategoryId && b.category_id === selectedCategoryId;
      
      // Priority order:
      // 1. Category matches (if category is selected)
      if (selectedCategoryId && aMatchesCategory !== bMatchesCategory) {
        return bMatchesCategory ? 1 : -1;
      }
      
      // 2. Active status
      if (aIsActive !== bIsActive) {
        return bIsActive ? 1 : -1;
      }
      
      // 3. Current date range
      if (aIsCurrent !== bIsCurrent) {
        return bIsCurrent ? 1 : -1;
      }
      
      // 4. Has remaining budget
      if (aHasRemaining !== bHasRemaining) {
        return bHasRemaining ? 1 : -1;
      }
      
      // 5. Alphabetical by name
      return a.budget_name.localeCompare(b.budget_name);
    });
    
    console.log('🔄 BudgetSelector: Budgets sorted by priority:', {
      selectedCategoryId,
      sortedBudgets: filtered.map(b => {
        const currentDate = new Date();
        const startDate = new Date(b.start_date);
        const endDate = new Date(b.end_date);
        return {
          id: b.id, 
          name: b.budget_name, 
          category: b.category_name,
          status: b.status,
          isActive: b.status === 'active',
          isCurrent: currentDate >= startDate && currentDate <= endDate,
          hasRemaining: (b.amount - (b.spent || 0)) > 0,
          matchesCategory: selectedCategoryId && b.category_id === selectedCategoryId
        };
      })
    });
    
    return filtered;
  };

  // Filter budgets based on search term
  const filteredBudgets = getFilteredBudgets(budgets).filter((budget: BudgetItem) =>
    budget.budget_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Debug: Log final filtered results
  console.log('🏆 BudgetSelector: Final filtered budgets after search:', {
    searchTerm,
    beforeSearchFilter: getFilteredBudgets(budgets).length,
    afterSearchFilter: filteredBudgets.length,
    finalBudgets: filteredBudgets.map(b => ({ id: b.id, name: b.budget_name }))
  });

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
    
    // Budget overrun alert - informative, not blocking
    if (newSpent > budget.amount) {
      warnings.push({
        type: "overrun",
        message: `Transaction would exceed budget by ₱${(newSpent - budget.amount).toFixed(2)} (${newPercentage.toFixed(1)}% utilization)`,
        severity: "warning"
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
    console.log('💰 BudgetSelector: Budget selected', {
      budgetId: budget.id,
      budgetName: budget.budget_name,
      categoryId: budget.category_id,
      categoryName: budget.category_name
    });
    
    setSelectedBudget(budget);
    onBudgetSelect(budget);
    setIsOpen(false);
    setSearchTerm("");
    
    // Auto-select category if budget has a category and callback is provided
    if ((budget.category_id || budget.category_name) && onCategoryAutoSelect) {
      console.log('🔄 BudgetSelector: Auto-selecting category from budget', {
        categoryId: budget.category_id,
        categoryName: budget.category_name,
        usingFallback: !budget.category_id && !!budget.category_name
      });
      
      // If category_id exists, use it; otherwise pass undefined and let the handler use category_name
      if (budget.category_id) {
        onCategoryAutoSelect(budget.category_id, budget.category_name);
      } else if (budget.category_name) {
        // Pass a placeholder and the category name for fallback matching
        onCategoryAutoSelect('', budget.category_name);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedBudget(null);
    onBudgetSelect(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Fetch budgets when component mounts or category changes
  useEffect(() => {
    console.log('🚀 BudgetSelector: useEffect triggered for budget fetching', {
      userId: user?.id,
      selectedCategoryId,
      transactionType,
      hasUser: !!user
    });
    
    const fetchBudgets = async () => {
      if (!user) {
        console.log('⚠️ BudgetSelector: No user found, clearing budgets');
        setBudgets([]);
        return;
      }

      console.log('🔍 BudgetSelector: Starting budget fetch for user:', user.id);
      setLoading(true);
      setError(null);

      try {
        const budgetService = BudgetService.getInstance();
        console.log('📈 BudgetSelector: Calling budgetService.getBudgets with userId:', user.id);
        
        const result = await budgetService.getBudgets(user.id);
        
        console.log('📊 BudgetSelector: Raw service response:', {
          source: result.source,
          hasData: !!result.data,
          dataLength: result.data?.length || 0,
          error: result.error
        });
        
        if (result.source === 'error') {
          console.error('❌ BudgetSelector: Service returned error:', result.error);
          throw new Error(result.error || 'Failed to load budgets');
        }

        console.log('📊 BudgetSelector: Fetched budgets from service', {
          source: result.source,
          totalBudgets: result.data.length,
          budgets: result.data.map(b => ({
            id: b.id,
            name: b.budget_name,
            status: b.status,
            category_id: b.category_id,
            category_name: b.category_name,
            amount: b.amount,
            spent: b.spent || 0,
            remaining: b.amount - (b.spent || 0),
            start_date: b.start_date,
            end_date: b.end_date,
            period: b.period,
            description: b.description
          }))
        });
        
        // Additional debug: Check what might cause filtering issues
        result.data.forEach(budget => {
          const currentDate = new Date();
          const startDate = new Date(budget.start_date);
          const endDate = new Date(budget.end_date);
          const remaining = budget.amount - (budget.spent || 0);
          
          console.log(`🔍 Debug analysis for budget: ${budget.budget_name}`, {
            status: budget.status,
            statusCheck: budget.status === 'active',
            dateRange: {
              current: currentDate.toISOString().split('T')[0],
              start: startDate.toISOString().split('T')[0], 
              end: endDate.toISOString().split('T')[0],
              isWithinRange: currentDate >= startDate && currentDate <= endDate
            },
            allocation: {
              amount: budget.amount,
              spent: budget.spent || 0,
              remaining: remaining,
              hasRemaining: remaining > 0
            }
          });
        });
        
        console.log('🎯 BudgetSelector: Setting budgets state with', result.data.length, 'budgets');
        setBudgets(result.data);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load budgets';
        console.error('❌ BudgetSelector: Error in fetchBudgets:', {
          error: err,
          errorMessage,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(errorMessage);
        showErrorToast(errorMessage);
      } finally {
        console.log('🏁 BudgetSelector: Fetch complete, setting loading to false');
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

  const handleMobileBudgetSelect = (budget: BudgetItem) => {
    handleBudgetSelect(budget);
    setIsMobileModalOpen(false);
  };

  // Mobile Modal Component
  const MobileBudgetModal = () => {
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
              <i className="fas fa-wallet text-emerald-500 text-xs"></i>
              Select Budget
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh] pb-4">
            {filteredBudgets.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <i className="fas fa-wallet text-gray-300 text-2xl mb-2"></i>
                <p className="text-sm text-gray-500">{searchTerm ? 'No budgets found' : 'No budgets available'}</p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                {filteredBudgets.map((budget) => {
                  const remaining = budget.amount - (budget.spent || 0);
                  const percentage = budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0;
                  const isOverBudget = remaining < 0;
                  const isNearLimit = !isOverBudget && percentage >= 80;
                  return (
                    <div
                      key={budget.id}
                      className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                        selectedBudget?.id === budget.id 
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm' 
                          : 'bg-white border-gray-100'
                      }`}
                      onClick={() => handleMobileBudgetSelect(budget)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            isOverBudget ? 'bg-rose-100' : isNearLimit ? 'bg-amber-100' : 'bg-emerald-100'
                          }`}>
                            <i className={`fas fa-wallet text-xs ${
                              isOverBudget ? 'text-rose-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'
                            }`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-800 truncate block">{budget.budget_name}</span>
                            {budget.category_name && (
                              <span className="text-[10px] text-gray-500">
                                <i className="fas fa-tag mr-1"></i>{budget.category_name}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedBudget?.id === budget.id && (
                          <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                        )}
                      </div>
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-gray-500">Used</span>
                          <span className={`font-semibold ${isOverBudget ? 'text-rose-600' : isNearLimit ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">{formatCurrency(budget.spent || 0)} / {formatCurrency(budget.amount)}</span>
                        <span className={`font-medium ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isOverBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                        </span>
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
    <div className={`budget-selector selector-container ${className}`}>
      {/* ===== MOBILE VIEW ===== */}
      <div className="block md:hidden">
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">
          Budget Assignment (Optional)
        </label>
        
        {loading ? (
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-xs text-gray-500">Loading budgets...</span>
          </div>
        ) : (
          <>
            <div
              className={`flex items-center justify-between p-2.5 bg-white border rounded-xl transition-all active:scale-[0.99] ${
                disabled ? 'opacity-50 bg-gray-50' : ''
              } ${selectedBudget ? 'border-emerald-200' : 'border-gray-200'}`}
              onClick={handleMobileOpen}
            >
              {selectedBudget ? (
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <i className="fas fa-wallet text-emerald-500 text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-800 truncate block">{selectedBudget.budget_name}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {formatCurrency(selectedBudget.amount - (selectedBudget.spent || 0))} remaining
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Select Budget (Optional)</span>
              )}
              
              <div className="flex items-center gap-1.5">
                {selectedBudget && !disabled && (
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

            {selectedBudget && (
              <div className="mt-2 p-2.5 rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <i className="fas fa-chart-pie text-emerald-600 text-xs"></i>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-semibold">Used</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {((selectedBudget.spent || 0) / selectedBudget.amount * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 uppercase font-semibold">Remaining</p>
                    <p className="text-xs font-bold text-emerald-600">
                      {formatCurrency(selectedBudget.amount - (selectedBudget.spent || 0))}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-emerald-500" 
                    style={{ width: `${Math.min((selectedBudget.spent || 0) / selectedBudget.amount * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            <p className="text-[10px] text-gray-400 mt-1.5">Track this expense against a budget</p>
            <MobileBudgetModal />
          </>
        )}
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block form-group mb-3 md:mb-4">
        <label htmlFor="budget_id" className="text-sm md:text-base font-weight-bold text-gray-800">
          Budget Assignment (Optional)
        </label>
        
        <div className="position-relative">
          {/* Selected Budget Display */}
          <div
            className={`d-flex align-items-center justify-content-between px-2 md:px-3 py-1.5 md:py-2 border bg-white ${
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
                  <div className="text-sm md:text-base font-weight-medium text-gray-800">
                    {selectedBudget.budget_name}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs md:text-sm text-muted">
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
              <div className="p-2 md:p-3 border-bottom">
                <input
                  type="text"
                  className="px-2 py-1.5 md:px-3 md:py-2 w-100 border text-xs md:text-sm"
                  placeholder="Search budgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  style={{
                    borderRadius: '0.25rem',
                    borderColor: '#dee2e6',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Budget Options */}
              <div className="py-1">
                {error ? (
                  <div className="px-2 md:px-3 py-1.5 md:py-2 text-muted text-center">
                    Unable to load budgets
                  </div>
                ) : filteredBudgets.length === 0 ? (
                  <div className="px-2 md:px-3 py-1.5 md:py-2 text-muted text-center">
                    {searchTerm ? 'No budgets match your search' : 
                     budgets.length === 0 ? 'No budgets available' : 'No budgets found'}
                  </div>
                ) : (
                  filteredBudgets.map((budget) => {
                    const matchesCategory = selectedCategoryId && budget.category_id === selectedCategoryId;
                    const hasCategory = budget.category_name && budget.category_name.trim() !== '';
                    
                    // Calculate budget status
                    const currentDate = new Date();
                    const startDate = new Date(budget.start_date);
                    const endDate = new Date(budget.end_date);
                    const remaining = budget.amount - (budget.spent || 0);
                    const isActive = budget.status === 'active';
                    const isCurrent = currentDate >= startDate && currentDate <= endDate;
                    const isExpired = currentDate > endDate;
                    const isFuture = currentDate < startDate;
                    const isOverBudget = remaining < 0;
                    const isNearLimit = remaining > 0 && (budget.spent || 0) / budget.amount >= 0.8;
                    
                    // Determine status badge
                    let statusBadge = null;
                    if (!isActive) {
                      statusBadge = <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>Inactive</span>;
                    } else if (isOverBudget) {
                      statusBadge = <span className="badge badge-danger ml-2" style={{ fontSize: '10px' }}>Over Budget</span>;
                    } else if (isExpired) {
                      statusBadge = <span className="badge badge-warning ml-2" style={{ fontSize: '10px' }}>Expired</span>;
                    } else if (isFuture) {
                      statusBadge = <span className="badge badge-info ml-2" style={{ fontSize: '10px' }}>Upcoming</span>;
                    } else if (isNearLimit) {
                      statusBadge = <span className="badge badge-warning ml-2" style={{ fontSize: '10px' }}>Near Limit</span>;
                    }
                    
                    return (
                      <div
                        key={budget.id}
                        className={`px-2 md:px-3 py-1.5 md:py-2 d-flex align-items-center ${
                          selectedBudget?.id === budget.id ? 'bg-primary text-white' : ''
                        }`}
                        onClick={() => handleBudgetSelect(budget)}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease-in-out',
                          opacity: (!isActive || isExpired) ? 0.7 : 1
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
                          <div className="text-sm md:text-base font-weight-medium d-flex align-items-center">
                            {budget.budget_name}
                            {matchesCategory && (
                              <span className="badge badge-success ml-2" style={{ fontSize: '10px' }}>
                                <i className="fas fa-check mr-1"></i>Match
                              </span>
                            )}
                            {statusBadge}
                          </div>
                          {hasCategory && (
                            <div className="text-xs md:text-sm text-muted">
                              <i className="fas fa-tag mr-1"></i>{budget.category_name}
                            </div>
                          )}
                          <div className={`text-xs md:text-sm ${
                            isOverBudget ? 'text-danger font-weight-bold' : 
                            isNearLimit ? 'text-warning' : 'text-muted'
                          }`}>
                            ₱{Math.abs(remaining).toFixed(2)} {isOverBudget ? 'over budget' : 'remaining'}
                          </div>
                        </div>
                        {selectedBudget?.id === budget.id && (
                          <i className={`fas fa-check ${selectedBudget?.id === budget.id ? 'text-white' : 'text-primary'}`}></i>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        <small className="form-text text-xs md:text-sm text-muted">
          Choose a budget to track this expense against. Showing all {filteredBudgets.length} budget{filteredBudgets.length !== 1 ? 's' : ''}.
          {selectedCategoryId && (
            <span className="d-block mt-1">
              <i className="fas fa-info-circle mr-1"></i>
              Budgets matching your selected category are shown first, followed by other budgets.
            </span>
          )}
          {filteredBudgets.length === 0 && budgets.length > 0 && (
            <span className="text-warning d-block mt-1">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              No budgets available. Create a budget to start tracking expenses.
            </span>
          )}
          {filteredBudgets.length > 0 && (
            <span className="text-info d-block mt-1">
              <i className="fas fa-lightbulb mr-1"></i>
              You can assign expenses to any budget, including expired and over-budget ones. Over-budget transactions are allowed and will be tracked.
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
            
            {/* Enhanced Progress Bar with Transaction Impact */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-sm font-weight-medium text-gray-700">
                  Budget Progress {transactionAmount > 0 && '(Including Transaction)'}
                </span>
                <span className={`font-weight-bold text-sm ${
                  ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount > 1.0
                    ? 'text-danger'
                    : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.9
                    ? 'text-danger'
                    : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8
                    ? 'text-warning'
                    : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.6
                    ? 'text-info'
                    : 'text-success'
                }`}>
                  {(((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount * 100).toFixed(1)}%
                  {((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount > 1.0 && (
                    <small className="ml-1 text-danger font-weight-normal">(Over Budget)</small>
                  )}
                </span>
              </div>
              <div className="position-relative">
                <div 
                  className="progress" 
                  style={{ 
                    height: '12px', 
                    borderRadius: '6px',
                    backgroundColor: '#f1f3f4',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* Current spending (base) */}
                  <div
                    className="progress-bar bg-secondary"
                    style={{ 
                      width: `${Math.min(100, (selectedBudget.spent || 0) / selectedBudget.amount * 100)}%`,
                      borderRadius: '6px',
                      transition: 'width 0.6s ease-in-out',
                      opacity: transactionAmount > 0 ? 0.7 : 1,
                      // Show over-budget with overflow indicator
                      position: (selectedBudget.spent || 0) / selectedBudget.amount > 1.0 ? 'relative' : 'static'
                    }}
                  >
                    {/* Over-budget indicator */}
                    {(selectedBudget.spent || 0) / selectedBudget.amount > 1.0 && (
                      <div
                        className="bg-danger"
                        style={{
                          position: 'absolute',
                          right: '-5px',
                          top: '-2px',
                          width: '10px',
                          height: '16px',
                          borderRadius: '2px',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="Budget exceeded"
                      ></div>
                    )}
                  </div>
                  {/* Transaction impact (additional) */}
                  {transactionAmount > 0 && (
                    <div
                      className={`progress-bar ${
                        ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.9
                          ? 'bg-danger'
                          : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8
                          ? 'bg-warning'
                          : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.6
                          ? 'bg-info'
                          : 'bg-success'
                      }`}
                      role="progressbar"
                      style={{ 
                        width: `${Math.min(100, transactionAmount / selectedBudget.amount * 100)}%`,
                        borderRadius: '6px',
                        transition: 'width 0.6s ease-in-out, background-color 0.3s ease',
                        background: ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.9
                          ? 'linear-gradient(45deg, #dc3545, #c82333)'
                          : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8
                          ? 'linear-gradient(45deg, #ffc107, #e0a800)'
                          : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.6
                          ? 'linear-gradient(45deg, #17a2b8, #138496)'
                          : 'linear-gradient(45deg, #28a745, #218838)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        marginLeft: `${(selectedBudget.spent || 0) / selectedBudget.amount * 100}%`,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%'
                      }}
                      aria-valuenow={Math.min(100, ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Budget utilization including transaction: ${(((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount * 100).toFixed(1)}% of ${selectedBudget.budget_name}`}
                    >
                      {/* Animated stripes for warning/critical states */}
                      {((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8 && (
                        <div 
                          className="progress-bar-striped progress-bar-animated" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                            backgroundSize: '1rem 1rem',
                            animation: 'progress-bar-stripes 1s linear infinite'
                          }}
                        />
                      )}
                    </div>
                  )}
                  {/* Fallback for when no transaction amount */}
                  {transactionAmount === 0 && (
                    <div
                      className={`progress-bar ${
                        (selectedBudget.spent || 0) / selectedBudget.amount >= 0.9
                          ? 'bg-danger'
                          : (selectedBudget.spent || 0) / selectedBudget.amount >= 0.8
                          ? 'bg-warning'
                          : (selectedBudget.spent || 0) / selectedBudget.amount >= 0.6
                          ? 'bg-info'
                          : 'bg-success'
                      }`}
                      role="progressbar"
                      style={{ 
                        width: `${Math.min(100, (selectedBudget.spent || 0) / selectedBudget.amount * 100)}%`,
                        borderRadius: '6px',
                        transition: 'width 0.6s ease-in-out, background-color 0.3s ease',
                        background: (selectedBudget.spent || 0) / selectedBudget.amount >= 0.9
                          ? 'linear-gradient(45deg, #dc3545, #c82333)'
                          : (selectedBudget.spent || 0) / selectedBudget.amount >= 0.8
                          ? 'linear-gradient(45deg, #ffc107, #e0a800)'
                          : (selectedBudget.spent || 0) / selectedBudget.amount >= 0.6
                          ? 'linear-gradient(45deg, #17a2b8, #138496)'
                          : 'linear-gradient(45deg, #28a745, #218838)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        position: (selectedBudget.spent || 0) / selectedBudget.amount > 1.0 ? 'relative' : 'static'
                      }}
                      aria-valuenow={Math.min(100, (selectedBudget.spent || 0) / selectedBudget.amount * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Budget utilization: ${((selectedBudget.spent || 0) / selectedBudget.amount * 100).toFixed(1)}% of ${selectedBudget.budget_name}`}
                    >
                      {/* Animated stripes for warning/critical states */}
                      {(selectedBudget.spent || 0) / selectedBudget.amount >= 0.8 && (
                        <div 
                          className="progress-bar-striped progress-bar-animated" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                            backgroundSize: '1rem 1rem',
                            animation: 'progress-bar-stripes 1s linear infinite'
                          }}
                        />
                      )}
                      {/* Over-budget indicator */}
                      {(selectedBudget.spent || 0) / selectedBudget.amount > 1.0 && (
                        <div
                          className="bg-danger"
                          style={{
                            position: 'absolute',
                            right: '-5px',
                            top: '-2px',
                            width: '10px',
                            height: '16px',
                            borderRadius: '2px',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                          title="Budget exceeded"
                        ></div>
                      )}
                    </div>
                  )}
                </div>
                {/* Usage indicator markers */}
                <div className="position-absolute d-flex justify-content-between w-100" style={{ top: '-2px', fontSize: '10px' }}>
                  <div className="text-muted" style={{ marginLeft: '60%' }}>60%</div>
                  <div className="text-muted" style={{ marginRight: '20%' }}>80%</div>
                </div>
              </div>
              {/* Status indicator */}
              <div className="mt-2 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <i className={`fas fa-circle mr-2 ${
                    ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount > 1.0
                      ? 'text-danger'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.9
                      ? 'text-danger'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8
                      ? 'text-warning'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.6
                      ? 'text-info'
                      : 'text-success'
                  }`} style={{ fontSize: '8px' }}></i>
                  <span className="text-xs text-muted">
                    {((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount > 1.0
                      ? 'Over Budget: Exceeds allocated amount'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.9
                      ? 'Critical: Near budget limit'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.8
                      ? 'Warning: Approaching budget limit'
                      : ((selectedBudget.spent || 0) + transactionAmount) / selectedBudget.amount >= 0.6
                      ? 'Moderate: Good progress'
                      : 'Healthy: Well within budget'
                    }
                  </span>
                </div>
                {transactionAmount > 0 && (
                  <span className="text-xs font-weight-bold text-primary">
                    +₱{transactionAmount.toFixed(2)} this transaction
                  </span>
                )}
              </div>
            </div>

            {/* Budget Stats */}
            <div className="row text-sm">
              <div className="col-4 text-center">
                <div className="font-weight-bold text-gray-800">₱{selectedBudget.amount.toFixed(2)}</div>
                <div className="text-muted">Total Budget</div>
              </div>
              <div className="col-4 text-center">
                <div className="font-weight-bold text-gray-600">
                  ₱{(selectedBudget.spent || 0).toFixed(2)}
                  {transactionAmount > 0 && (
                    <span className="text-primary font-weight-normal"> (+₱{transactionAmount.toFixed(2)})</span>
                  )}
                </div>
                <div className="text-muted">
                  {transactionAmount > 0 ? 'Current + Transaction' : 'Current Spent'}
                </div>
              </div>
              <div className="col-4 text-center">
                <div className={`font-weight-bold ${
                  (selectedBudget.amount - (selectedBudget.spent || 0) - transactionAmount) < 0 
                    ? 'text-danger' 
                    : 'text-success'
                }`}>
                  ₱{(selectedBudget.amount - (selectedBudget.spent || 0) - transactionAmount).toFixed(2)}
                </div>
                <div className="text-muted">
                  {transactionAmount > 0 ? 'After Transaction' : 'Remaining'}
                </div>
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
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => {}}>
            Create Budget
          </button>
        </div>
      )}
    </div>
  );
});

BudgetSelector.displayName = 'BudgetSelector';

export default BudgetSelector;