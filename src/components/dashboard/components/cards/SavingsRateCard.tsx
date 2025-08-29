import React from 'react';
import { formatPercentage } from '../../../../utils/helpers';

interface SavingsRateCardProps {
  savingsRate: number;
  onTooltipToggle?: (tipId: string, event?: React.MouseEvent) => void;
}

const SavingsRateCard: React.FC<SavingsRateCardProps> = ({ savingsRate, onTooltipToggle }) => {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className="card border-left-success shadow h-100 py-2">
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                Savings Rate
                {onTooltipToggle && (
                  <div className="ml-2 position-relative">
                    <i 
                      className="fas fa-info-circle text-gray-400 cursor-pointer" 
                      onClick={(e) => onTooltipToggle('savings', e)}
                      aria-label="Savings rate information"
                    ></i>
                  </div>
                )}
              </div>
              <div className="row no-gutters align-items-center">
                <div className="col-auto">
                  <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                    {formatPercentage(savingsRate)}
                  </div>
                </div>
                <div className="col">
                  <div className="progress progress-sm mr-2">
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${Math.min(savingsRate, 100)}%`,
                      }}
                      aria-valuenow={Math.min(savingsRate, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <i className="fas fa-percentage fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsRateCard;
