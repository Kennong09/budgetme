import React from 'react';
import { formatCurrency } from '../../../../utils/helpers';

interface BalanceCardProps {
  balance: number;
  onTooltipToggle?: (tipId: string, event?: React.MouseEvent) => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance, onTooltipToggle }) => {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className="card border-left-info shadow h-100 py-2">
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-info text-uppercase mb-1 d-flex align-items-center">
                Balance
                {onTooltipToggle && (
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onTooltipToggle('balance', e)}
                      aria-label="Balance information"
                    ></i>
                  </div>
                )}
              </div>
              <div className="h5 mb-0 font-weight-bold text-gray-800">
                {formatCurrency(balance)}
              </div>
            </div>
            <div className="col-auto">
              <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
