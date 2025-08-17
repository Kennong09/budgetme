import React from 'react';
import { Goal } from '../types';
import { formatCurrency } from '../../../utils/helpers';

interface ContributeModalProps {
  show: boolean;
  selectedGoal: Goal | null;
  contributionAmount: string;
  selectedAccountId: string;
  userAccounts: any[];
  isContributing: boolean;
  onAmountChange: (amount: string) => void;
  onAccountChange: (accountId: string) => void;
  onClose: () => void;
  onContribute: () => void;
}

const ContributeModal: React.FC<ContributeModalProps> = ({
  show,
  selectedGoal,
  contributionAmount,
  selectedAccountId,
  userAccounts,
  isContributing,
  onAmountChange,
  onAccountChange,
  onClose,
  onContribute
}) => {
  if (!show || !selectedGoal) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Contribute to {selectedGoal.goal_name}</h5>
              <button type="button" className="close" onClick={onClose}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="progress mb-3" style={{height: '10px'}}>
                <div 
                  className={`progress-bar ${
                    selectedGoal.percentage >= 90 ? "bg-success" : 
                    selectedGoal.percentage >= 50 ? "bg-info" : 
                    selectedGoal.percentage >= 25 ? "bg-warning" : 
                    "bg-danger"
                  }`}
                  role="progressbar" 
                  style={{ width: `${selectedGoal.percentage}%` }}
                  aria-valuenow={selectedGoal.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <div>Current: {formatCurrency(selectedGoal.current_amount)}</div>
                <div>Target: {formatCurrency(selectedGoal.target_amount)}</div>
              </div>
              <div className="form-group">
                <label htmlFor="contributionAmount">Contribution Amount</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">$</span>
                  </div>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="contributionAmount" 
                    value={contributionAmount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="accountSelect">Select Account</label>
                <select
                  className="form-control"
                  id="accountSelect"
                  value={selectedAccountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  disabled={isContributing}
                >
                  {userAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
                <small className="form-text text-muted">
                  Choose the account from which to make this contribution.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                disabled={isContributing || !contributionAmount}
                onClick={onContribute}
              >
                {isContributing ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                    Contributing...
                  </>
                ) : (
                  'Contribute Now'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
    </>
  );
};

export default ContributeModal;
