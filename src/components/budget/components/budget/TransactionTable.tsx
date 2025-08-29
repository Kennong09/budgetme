import React, { FC } from "react";
import { formatCurrency, formatDate, formatPercentage } from "../../../../utils/helpers";
import { Transaction, BudgetItem } from "../../types";

interface TransactionTableProps {
  transactions: Transaction[];
  budget: BudgetItem;
  onRefresh?: () => void;
}

const TransactionTable: FC<TransactionTableProps> = ({ 
  transactions, 
  budget, 
  onRefresh 
}) => {
  if (transactions.length === 0) {
    return (
      <div className="alert alert-info">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <i className="fas fa-info-circle mr-2"></i>
            No transactions found for this budget category during {budget.month} {budget.year}.
          </div>
          {onRefresh && (
            <button 
              className="btn btn-sm btn-outline-primary" 
              onClick={onRefresh}
            >
              <i className="fas fa-sync-alt mr-1"></i> Refresh
            </button>
          )}
        </div>
        <div className="mt-2 small text-muted">
          Budget period: {formatDate(budget.start_date)} - {formatDate(budget.end_date)}<br/>
          Category: {budget.category_name} (ID: {budget.id})
        </div>
      </div>
    );
  }

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPercentage = (totalSpent / budget.amount) * 100;

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-hover" width="100%" cellSpacing="0">
        <thead className="bg-light">
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Description</th>
            <th>% of Budget</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const percentOfBudget = (tx.amount / budget.amount) * 100;
            
            return (
              <tr key={tx.id}>
                <td>{formatDate(tx.date)}</td>
                <td className="text-danger">
                  {formatCurrency(tx.amount)}
                </td>
                <td>{tx.notes}</td>
                <td>
                  <div 
                    style={{ 
                      width: "100%", 
                      height: "15px", 
                      backgroundColor: "#e9ecef", 
                      borderRadius: "0.25rem", 
                      position: "relative" 
                    }}
                    data-toggle="tooltip"
                    data-placement="top"
                    title={formatPercentage(percentOfBudget)}
                  >
                    <div
                      style={{ 
                        width: `${Math.min(percentOfBudget, 100)}%`, 
                        height: "15px", 
                        borderRadius: "0.25rem",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        backgroundColor: percentOfBudget > 50 ? "#e74a3b" : percentOfBudget > 25 ? "#f6c23e" : "#1cc88a"
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-weight-bold bg-light">
            <td>Total</td>
            <td className="text-danger">
              {formatCurrency(totalSpent)}
            </td>
            <td colSpan={2}>
              {formatPercentage(totalPercentage)} of budget
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TransactionTable;
