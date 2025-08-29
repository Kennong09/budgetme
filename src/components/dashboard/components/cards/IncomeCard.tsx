import React from 'react';
import { formatCurrency } from '../../../../utils/helpers';

interface IncomeCardProps {
  income: number;
  onTooltipToggle?: (tipId: string, event?: React.MouseEvent) => void;
}

const IncomeCard: React.FC<IncomeCardProps> = ({ income, onTooltipToggle }) => {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className="card border-left-primary shadow h-100 py-2">
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                Monthly Income
                {onTooltipToggle && (
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onTooltipToggle('income', e)}
                      aria-label="Income information"
                    ></i>
                  </div>
                )}
              </div>
              <div className="h5 mb-0 font-weight-bold text-gray-800">
                {formatCurrency(income)}
              </div>
            </div>
            <div className="col-auto">
              <i className="fas fa-calendar fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCard;
