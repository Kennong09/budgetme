import { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { sanitizeBudgetName, roundToCentavo } from "../../../utils/currencyUtils";
import { CentavoInput } from "../../common/CentavoInput";
import AccountSelector from "../../transactions/components/AccountSelector";
import CategorySelector from "../../transactions/components/CategorySelector";
import GoalSelector from "../../transactions/components/GoalSelector";
import { BudgetItem } from "../../../services/database/budgetService";
import type { Goal } from "../../transactions/components/GoalSelector";
import { Account as AccountType } from "../../settings/types";
import { AddTransactionModalProps } from "./types";

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface TransactionFormData {
  type: "income" | "expense" | "contribution";
  user_id: string;
  account_id: string;
  category_id: string;
  goal_id: string;
  budget_id: string;
  amount: number;
  date: string;
  description: string;
}

const AddTransactionModal: FC<AddTransactionModalProps> = ({ show, onClose, onTransactionAdded }) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [hasGoals, setHasGoals] = useState<boolean | null>(null);

  const [transaction, setTransaction] = useState<TransactionFormData>({
    type: "expense",
    user_id: "",
    account_id: "",
    category_id: "",
    goal_id: "",
    budget_id: "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  useEffect(() => {
    if (show) {
      fetchUsers();
    }
  }, [show]);

  useEffect(() => {
    if (transaction.user_id) {
      fetchUserData(transaction.user_id);
    }
  }, [transaction.user_id]);

  const fetchUsers = async () => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      setUsers((data?.users || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata || {}
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      const [incomeResult, expenseResult] = await Promise.all([
        supabaseAdmin.from('income_categories').select('*').eq('user_id', userId),
        supabaseAdmin.from('expense_categories').select('*').eq('user_id', userId)
      ]);
      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;
      setIncomeCategories(incomeResult.data || []);
      setExpenseCategories(expenseResult.data || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      showErrorToast('Failed to load user data');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransaction(prev => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (value: number) => {
    setTransaction(prev => ({ ...prev, amount: value }));
  };

  const handleUserSelect = (user: User) => {
    setTransaction(prev => ({
      ...prev, user_id: user.id, account_id: '', category_id: '', goal_id: '', budget_id: ''
    }));
    setUserSearch(user.user_metadata?.full_name || user.email);
    setShowUserDropdown(false);
    setSelectedGoal(null);
  };

  const handleAccountSelect = (account: AccountType | null) => {
    setTransaction(prev => ({ ...prev, account_id: account?.id || "" }));
  };

  const handleCategorySelect = (category: Category | null) => {
    setTransaction(prev => ({ ...prev, category_id: category?.id || "" }));
  };

  const handleGoalSelect = (goal: Goal | null) => {
    setSelectedGoal(goal);
    setTransaction(prev => ({ ...prev, goal_id: goal?.id || '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!transaction.user_id) { showErrorToast("Please select a user"); return; }
    if (!transaction.account_id) { showErrorToast("Please select an account"); return; }
    if (!transaction.category_id && transaction.type !== 'contribution') { showErrorToast("Please select a category"); return; }
    if (transaction.type === 'contribution' && !transaction.goal_id) { showErrorToast("Please select a goal"); return; }
    if (transaction.amount <= 0) { showErrorToast("Please enter a valid amount"); return; }

    try {
      setLoading(true);
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      
      const amount = roundToCentavo(transaction.amount);
      if (!isFinite(amount) || isNaN(amount)) throw new Error('Invalid amount');
      if (amount > 99999999999.99) throw new Error('Amount too large');

      const transactionData: any = {
        user_id: transaction.user_id, account_id: transaction.account_id, type: transaction.type,
        amount, date: transaction.date, description: sanitizeBudgetName(transaction.description),
        created_at: new Date().toISOString()
      };

      if (transaction.type === 'income') {
        transactionData.income_category_id = transaction.category_id || null;
        transactionData.expense_category_id = null;
      } else {
        transactionData.expense_category_id = transaction.category_id || null;
        transactionData.income_category_id = null;
      }
      if (transaction.goal_id) transactionData.goal_id = transaction.goal_id;

      const { error: txError } = await supabaseAdmin.from('transactions').insert([transactionData]);
      if (txError) throw txError;

      const balanceChange = transaction.type === 'income' ? amount : -amount;
      await supabaseAdmin.rpc('update_account_balance', { p_account_id: transaction.account_id, p_amount_change: balanceChange });
      
      if (transaction.goal_id) {
        await supabaseAdmin.rpc('update_goal_progress', { p_goal_id: transaction.goal_id, p_amount: amount });
      }

      showSuccessToast("Transaction added successfully!");
      if (onTransactionAdded) onTransactionAdded();
      handleClose();
    } catch (error: any) {
      showErrorToast(error.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTransaction({ type: "expense", user_id: "", account_id: "", category_id: "", goal_id: "", budget_id: "", amount: 0, date: new Date().toISOString().slice(0, 10), description: "" });
    setUserSearch(""); setShowUserDropdown(false); setSelectedGoal(null); setHasGoals(null); onClose();
  };

  const filteredUsers = users.filter(user => {
    const s = userSearch.toLowerCase();
    return (user.user_metadata?.full_name?.toLowerCase() || '').includes(s) || user.email.toLowerCase().includes(s);
  });

  const selectedUser = users.find(u => u.id === transaction.user_id);
  
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'income': return { label: 'Income', color: '#28a745', bg: 'success', icon: 'fa-plus-circle' };
      case 'expense': return { label: 'Expense', color: '#dc3545', bg: 'danger', icon: 'fa-minus-circle' };
      case 'contribution': return { label: 'Contribution', color: '#17a2b8', bg: 'info', icon: 'fa-flag' };
      default: return { label: 'Transaction', color: '#6c757d', bg: 'secondary', icon: 'fa-exchange-alt' };
    }
  };
  
  const typeInfo = getTypeInfo(transaction.type);
  const isFormValid = transaction.user_id && transaction.account_id && transaction.amount > 0 && 
    (transaction.type === 'contribution' ? transaction.goal_id : transaction.category_id);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '500px', width: 'calc(100% - 16px)' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: '16px', 
              overflow: 'hidden', 
              maxHeight: '90vh',
              margin: '8px'
            }}
          >
            
            {/* Header - Mobile Responsive */}
            <div 
              className="modal-header border-0 text-white" 
              style={{ 
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                padding: '12px 16px'
              }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center flex-shrink-0" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '10px',
                    marginRight: '10px'
                  }}
                >
                  <i className="fas fa-plus-circle" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Add Transaction</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>Create a transaction record</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={loading}
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '8px', 
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-times text-danger" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>

            {/* Body - Mobile Responsive */}
            <div 
              className="modal-body" 
              style={{ 
                maxHeight: 'calc(90vh - 140px)', 
                overflowY: 'auto',
                padding: '12px 16px',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              
              {/* User Selection Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-user mr-2"></i>Select User <span className="text-danger">*</span>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="position-relative mb-2">
                    <input type="text" className="form-control form-control-sm" placeholder="Search for a user..." value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }} 
                      onFocus={() => setShowUserDropdown(true)} style={{ fontSize: '0.85rem' }} />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="dropdown-menu show w-100" style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}>
                        {filteredUsers.slice(0, 8).map(user => (
                          <button key={user.id} type="button" className="dropdown-item d-flex align-items-center py-2" onClick={() => handleUserSelect(user)}>
                            <img src={user.user_metadata?.avatar_url || "../images/placeholder.png"} alt="" className="rounded-circle mr-2" 
                                 style={{ width: '24px', height: '24px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} />
                            <div>
                              <div style={{ fontSize: '0.8rem' }}>{user.user_metadata?.full_name || user.email.split('@')[0]}</div>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>{user.email}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedUser && (
                    <div className="d-flex align-items-center p-2" style={{ background: '#e8f5e9', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                      <img src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"} alt="" className="rounded-circle mr-2" 
                           style={{ width: '32px', height: '32px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} />
                      <div>
                        <div className="font-weight-bold text-success" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-check-circle mr-1"></i>{selectedUser.user_metadata?.full_name || selectedUser.email.split('@')[0]}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>{selectedUser.email}</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Type Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exchange-alt mr-2"></i>Transaction Type <span className="text-danger">*</span>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="d-flex" style={{ gap: '8px' }}>
                    {[
                      { type: 'income', icon: 'fa-plus-circle', label: 'Income', color: 'success' },
                      { type: 'expense', icon: 'fa-minus-circle', label: 'Expense', color: 'danger' },
                      { type: 'contribution', icon: 'fa-flag', label: 'Contribute', color: 'info' }
                    ].map(item => (
                      <button key={item.type} type="button"
                        className={`btn btn-sm flex-fill ${transaction.type === item.type ? `btn-${item.color}` : 'btn-outline-secondary'}`}
                        onClick={() => setTransaction(prev => ({ ...prev, type: item.type as any, category_id: '', goal_id: '' }))}
                        style={{ borderRadius: '8px', padding: '8px 4px', fontSize: '0.8rem' }}>
                        <i className={`fas ${item.icon} mr-1`}></i>{item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amount & Date Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-coins mr-2"></i>Amount & Date <span className="text-danger">*</span>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="row">
                    <div className="col-7">
                      <CentavoInput value={transaction.amount} onChange={handleAmountChange} currency="PHP" label="Amount" 
                        placeholder="0.00" required={true} min={0.01} max={99999999999.99} disabled={!transaction.user_id} />
                    </div>
                    <div className="col-5">
                      <label className="mb-1" style={{ fontSize: '0.8rem' }}>Date <span className="text-danger">*</span></label>
                      <input type="date" name="date" value={transaction.date} onChange={handleChange} 
                        className="form-control form-control-sm" required disabled={!transaction.user_id} style={{ fontSize: '0.85rem' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account & Category Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-wallet mr-2"></i>Account & Category <span className="text-danger">*</span>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="mb-2">
                    <AccountSelector selectedAccountId={transaction.account_id} onAccountSelect={handleAccountSelect} 
                      required={true} label="Account" showBalance={true} showAccountType={true} autoSelectDefault={true} disabled={!transaction.user_id} />
                  </div>
                  {transaction.type !== 'contribution' ? (
                    <CategorySelector selectedCategoryId={transaction.category_id} onCategorySelect={handleCategorySelect} 
                      transactionType={transaction.type} incomeCategories={incomeCategories} expenseCategories={expenseCategories} 
                      required={true} label="Category" showIcons={true} disabled={!transaction.user_id} />
                  ) : (
                    <div>
                      <label className="mb-1" style={{ fontSize: '0.8rem' }}>Category</label>
                      <div className="form-control form-control-sm d-flex align-items-center bg-info text-white">
                        <i className="fas fa-flag mr-2"></i><span className="font-weight-bold">Goal Contribution</span>
                        <Badge bg="light" className="text-info ml-auto" style={{ fontSize: '0.6rem' }}>Auto</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Section (for contribution type) */}
              {transaction.type === 'contribution' && (
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-flag mr-2"></i>Goal Selection <span className="text-danger">*</span>
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    {hasGoals === false ? (
                      <div className="text-center py-3">
                        <i className="fas fa-flag fa-2x text-muted mb-2"></i>
                        <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>No active goals available for this user</p>
                      </div>
                    ) : (
                      <GoalSelector selectedGoal={selectedGoal} onGoalSelect={handleGoalSelect} required={true} label="" 
                        isContributionType={true} showValidationError={!selectedGoal} onGoalsLoaded={setHasGoals} validateFamilyGoalAccess={false} />
                    )}
                  </div>
                </div>
              )}

              {/* Description Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-align-left mr-2"></i>Description <span className="text-danger">*</span>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <textarea name="description" value={transaction.description} onChange={handleChange} 
                    className="form-control form-control-sm" rows={2} placeholder="Enter a description for this transaction..." 
                    required disabled={!transaction.user_id} style={{ fontSize: '0.85rem' }}></textarea>
                </div>
              </div>

              {/* Summary Preview */}
              {isFormValid && (
                <div className="p-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                  <div className="d-flex align-items-center">
                    <i className={`fas ${typeInfo.icon} mr-2`} style={{ color: typeInfo.color }}></i>
                    <div>
                      <strong style={{ color: typeInfo.color, fontSize: '0.9rem' }}>₱{transaction.amount.toLocaleString()}</strong>
                      <span className="text-muted mx-2">•</span>
                      <span style={{ fontSize: '0.85rem' }}>{typeInfo.label}</span>
                    </div>
                    <Badge bg="success" className="ml-auto" style={{ fontSize: '0.65rem' }}>
                      <i className="fas fa-check mr-1"></i>Ready
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Mobile Responsive */}
            <div 
              className="modal-footer border-0" 
              style={{ 
                background: '#f8f9fa',
                padding: '10px 16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-info-circle mr-1"></i>{isFormValid ? 'Ready to submit' : 'Complete all required fields'}
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary flex-1" 
                  onClick={handleClose} 
                  disabled={loading}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-times mr-1"></i>Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger flex-1" 
                  onClick={handleSubmit} 
                  disabled={loading || !isFormValid}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span>Adding...</>
                  ) : (
                    <><i className="fas fa-plus mr-1"></i>Add</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTransactionModal;
