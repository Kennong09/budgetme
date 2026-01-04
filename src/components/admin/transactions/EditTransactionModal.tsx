import { useState, useEffect, FC, ChangeEvent, FormEvent } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { formatCurrency, sanitizeBudgetName, roundToCentavo } from "../../../utils/currencyUtils";
import { CentavoInput } from "../../common/CentavoInput";
import AccountSelector from "../../transactions/components/AccountSelector";
import CategorySelector from "../../transactions/components/CategorySelector";
import GoalSelector from "../../transactions/components/GoalSelector";
import { AdminTransaction, EditTransactionModalProps, TransactionUser } from "./types";
import type { Goal } from "../../transactions/components/GoalSelector";
import { Account as AccountType } from "../../settings/types";

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface TransactionFormData {
  type: "income" | "expense" | "contribution";
  account_id: string;
  category_id: string;
  goal_id: string;
  amount: number;
  date: string;
  description: string;
}

const EditTransactionModal: FC<EditTransactionModalProps> = ({
  transaction,
  show,
  onClose,
  onTransactionUpdated
}) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [originalTransaction, setOriginalTransaction] = useState<AdminTransaction | null>(null);
  
  const [user, setUser] = useState<TransactionUser | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [hasGoals, setHasGoals] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<TransactionFormData>({
    type: "expense",
    account_id: "",
    category_id: "",
    goal_id: "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  useEffect(() => {
    if (show && transaction) {
      setOriginalTransaction(transaction);
      setFormData({
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id || "",
        goal_id: transaction.goal_id || "",
        amount: transaction.amount,
        date: new Date(transaction.date).toISOString().slice(0, 10),
        description: transaction.notes || transaction.description || "",
      });
      fetchUserData(transaction.user_id);
    }
  }, [show, transaction]);

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError) throw userError;

      if (userData.user) {
        setUser({
          id: userData.user.id,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name,
          avatar_url: userData.user.user_metadata?.avatar_url,
          user_metadata: userData.user.user_metadata || {}
        });
      }

      const [incomeResult, expenseResult] = await Promise.all([
        supabaseAdmin.from('income_categories').select('id, category_name, icon').eq('user_id', userId).order('category_name'),
        supabaseAdmin.from('expense_categories').select('id, category_name, icon').eq('user_id', userId).order('category_name')
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;
      
      setIncomeCategories(incomeResult.data || []);
      setExpenseCategories(expenseResult.data || []);
    } catch (err) {
      console.error('Error fetching user data:', err);
      showErrorToast('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData(prev => ({ ...prev, type: value as any, category_id: '', goal_id: '' }));
      setSelectedGoal(null);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAmountChange = (value: number) => {
    if (value > 99999999999.99) {
      showErrorToast('Amount too large');
      return;
    }
    setFormData(prev => ({ ...prev, amount: value }));
  };

  const handleAccountSelect = (account: AccountType | null) => {
    setFormData(prev => ({ ...prev, account_id: account?.id || "" }));
  };

  const handleCategorySelect = (category: Category | null) => {
    setFormData(prev => ({ ...prev, category_id: category?.id || "" }));
  };

  const handleGoalSelect = (goal: Goal | null) => {
    setSelectedGoal(goal);
    setFormData(prev => ({ ...prev, goal_id: goal?.id || "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!originalTransaction) { setError("Original transaction data is missing"); return; }
    if (!formData.amount || formData.amount <= 0) { setError("Please enter a valid amount"); return; }
    if (!formData.date) { setError("Please select a date"); return; }
    if (!formData.account_id) { setError("Please select an account"); return; }
    if (!formData.category_id && formData.type !== 'contribution') { setError("Please select a category"); return; }
    if (formData.type === 'contribution' && !formData.goal_id) { setError("Please select a goal"); return; }

    try {
      setIsSubmitting(true);
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');

      const amount = roundToCentavo(formData.amount);
      if (!isFinite(amount) || isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
      if (amount > 99999999999.99) throw new Error('Amount too large');

      const transactionData: any = {
        type: formData.type, amount, date: formData.date, account_id: formData.account_id,
        goal_id: formData.goal_id || null, notes: sanitizeBudgetName(formData.description),
        updated_at: new Date().toISOString()
      };

      if (formData.type === 'income') {
        transactionData.income_category_id = formData.category_id || null;
        transactionData.expense_category_id = null;
      } else {
        transactionData.expense_category_id = formData.category_id || null;
        transactionData.income_category_id = null;
      }

      const { data: updatedTransaction, error: updateError } = await supabaseAdmin
        .from('transactions').update(transactionData).eq('id', originalTransaction.id).select().single();
      if (updateError) throw updateError;

      // Update account balances
      const oldAmount = originalTransaction.amount;
      const oldType = originalTransaction.type;
      const oldAccountId = originalTransaction.account_id;
      const oldBalanceChange = oldType === 'income' ? -oldAmount : oldAmount;
      const newBalanceChange = formData.type === 'income' ? amount : -amount;

      if (oldAccountId !== formData.account_id) {
        await supabaseAdmin.rpc('update_account_balance', { p_account_id: oldAccountId, p_amount_change: oldBalanceChange });
        await supabaseAdmin.rpc('update_account_balance', { p_account_id: formData.account_id, p_amount_change: newBalanceChange });
      } else {
        const netChange = newBalanceChange - (oldType === 'income' ? oldAmount : -oldAmount);
        await supabaseAdmin.rpc('update_account_balance', { p_account_id: formData.account_id, p_amount_change: netChange });
      }

      // Update goal progress
      if (originalTransaction.goal_id !== formData.goal_id) {
        if (originalTransaction.goal_id) await supabaseAdmin.rpc('update_goal_progress', { p_goal_id: originalTransaction.goal_id, p_amount: -oldAmount });
        if (formData.goal_id) await supabaseAdmin.rpc('update_goal_progress', { p_goal_id: formData.goal_id, p_amount: amount });
      } else if (formData.goal_id && oldAmount !== amount) {
        await supabaseAdmin.rpc('update_goal_progress', { p_goal_id: formData.goal_id, p_amount: amount - oldAmount });
      }

      showSuccessToast("Transaction updated successfully!");
      if (onTransactionUpdated && updatedTransaction) onTransactionUpdated(updatedTransaction);
      handleClose();
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setError(err.message || "Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ type: "expense", account_id: "", category_id: "", goal_id: "", amount: 0, date: new Date().toISOString().slice(0, 10), description: "" });
    setUser(null); setIncomeCategories([]); setExpenseCategories([]); setOriginalTransaction(null); setSelectedGoal(null); setError(""); onClose();
  };

  if (!show || !transaction) return null;

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'income': return { label: 'Income', color: '#28a745', bg: 'success', icon: 'fa-plus-circle' };
      case 'expense': return { label: 'Expense', color: '#dc3545', bg: 'danger', icon: 'fa-minus-circle' };
      case 'contribution': return { label: 'Contribution', color: '#17a2b8', bg: 'info', icon: 'fa-flag' };
      default: return { label: 'Transaction', color: '#6c757d', bg: 'secondary', icon: 'fa-exchange-alt' };
    }
  };

  const typeInfo = getTypeInfo(formData.type);
  const isFormValid = formData.account_id && formData.amount > 0 && (formData.type === 'contribution' ? formData.goal_id : formData.category_id);
  const hasChanges = originalTransaction && (
    formData.type !== originalTransaction.type || formData.amount !== originalTransaction.amount ||
    formData.account_id !== originalTransaction.account_id || formData.category_id !== (originalTransaction.category_id || '') ||
    formData.goal_id !== (originalTransaction.goal_id || '') || formData.date !== new Date(originalTransaction.date).toISOString().slice(0, 10) ||
    formData.description !== (originalTransaction.notes || originalTransaction.description || '')
  );

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
                  <i className="fas fa-edit" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Edit Transaction</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>Modify transaction details</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={loading || isSubmitting}
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
              
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" role="status"><span className="sr-only">Loading...</span></div>
                  <p className="mt-3 text-muted" style={{ fontSize: '0.85rem' }}>Loading transaction data...</p>
                </div>
              ) : (
                <>
                  {/* User Summary Card */}
                  <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="d-flex align-items-center">
                      <img src={user?.avatar_url || "../images/placeholder.png"} alt={user?.full_name || "User"} className="rounded-circle mr-3"
                           style={{ width: '50px', height: '50px', objectFit: 'cover', border: '2px solid #dc3545' }}
                           onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} />
                      <div className="flex-grow-1">
                        <strong style={{ fontSize: '0.95rem' }}>{user?.full_name || user?.email?.split('@')[0] || 'Unknown User'}</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user?.email}</div>
                        <div className="mt-1">
                          <Badge bg={typeInfo.bg} style={{ fontSize: '0.65rem' }} className="mr-1">
                            <i className={`fas ${typeInfo.icon} mr-1`}></i>{typeInfo.label}
                          </Badge>
                          <Badge bg="secondary" style={{ fontSize: '0.65rem' }} className="mr-1">
                            {formatCurrency(originalTransaction?.amount || 0)}
                          </Badge>
                          {hasChanges && (
                            <Badge bg="warning" style={{ fontSize: '0.65rem' }}>
                              <i className="fas fa-exclamation-circle mr-1"></i>Unsaved
                            </Badge>
                          )}
                        </div>
                      </div>
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
                            className={`btn btn-sm flex-fill ${formData.type === item.type ? `btn-${item.color}` : 'btn-outline-secondary'}`}
                            onClick={() => { setFormData(prev => ({ ...prev, type: item.type as any, category_id: '', goal_id: '' })); setSelectedGoal(null); }}
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
                          <CentavoInput value={formData.amount} onChange={handleAmountChange} currency="PHP" label="Amount" 
                            placeholder="0.00" required={true} min={0.01} max={99999999999.99} />
                        </div>
                        <div className="col-5">
                          <label className="mb-1" style={{ fontSize: '0.8rem' }}>Date <span className="text-danger">*</span></label>
                          <input type="date" name="date" value={formData.date} onChange={handleChange} 
                            className="form-control form-control-sm" required style={{ fontSize: '0.85rem' }} />
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
                        <AccountSelector selectedAccountId={formData.account_id} onAccountSelect={handleAccountSelect} 
                          required={true} label="Account" showBalance={true} showAccountType={true} autoSelectDefault={false} />
                      </div>
                      {formData.type !== 'contribution' ? (
                        <CategorySelector selectedCategoryId={formData.category_id} onCategorySelect={handleCategorySelect} 
                          transactionType={formData.type} incomeCategories={incomeCategories} expenseCategories={expenseCategories} 
                          required={true} label="Category" showIcons={true} />
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
                  {formData.type === 'contribution' && (
                    <div className="mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-flag mr-2"></i>Goal Selection <span className="text-danger">*</span>
                      </h6>
                      <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        {hasGoals === false ? (
                          <div className="text-center py-3">
                            <i className="fas fa-flag fa-2x text-muted mb-2"></i>
                            <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>No active goals available</p>
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
                      <textarea name="description" value={formData.description} onChange={handleChange} 
                        className="form-control form-control-sm" rows={2} placeholder="Enter a description..." 
                        required style={{ fontSize: '0.85rem' }}></textarea>
                    </div>
                  </div>

                  {/* Changes Preview */}
                  {hasChanges && (
                    <div className="p-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-exclamation-triangle text-warning mr-2"></i>
                        <div>
                          <strong className="text-danger" style={{ fontSize: '0.85rem' }}>Unsaved Changes</strong>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                            {formatCurrency(originalTransaction?.amount || 0)} → {formatCurrency(formData.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{transaction.id?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary flex-1" 
                  onClick={handleClose} 
                  disabled={loading || isSubmitting}
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
                  disabled={loading || isSubmitting || !isFormValid || !hasChanges}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {isSubmitting ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span>Saving...</>
                  ) : (
                    <><i className="fas fa-save mr-1"></i>Save</>
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

export default EditTransactionModal;
