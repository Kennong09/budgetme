import React, { FC } from "react";
import { PredictionAboutCardProps } from "../types";

const PredictionAboutCard: FC<PredictionAboutCardProps> = ({
  showAccuracyReport,
  modelAccuracy,
  activeTip,
  tooltipPosition,
  onToggleAccuracyReport,
  onToggleTip
}) => {
  return (
    <div className="card shadow mb-4 animate__animated animate__fadeIn">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          About Predictions
          <div className="ml-2 position-relative">
            <i 
              className="fas fa-info-circle text-gray-400 cursor-pointer" 
              onClick={(e) => onToggleTip('aboutPredictions', e)}
              aria-label="About predictions information"
            ></i>
          </div>
        </h6>
        <div className="dropdown no-arrow">
          <button 
            className="btn btn-link btn-sm" 
            type="button" 
            onClick={onToggleAccuracyReport}
            aria-label="Toggle accuracy report"
          >
            <i className={`fas fa-${showAccuracyReport ? 'minus' : 'plus'}-circle text-gray-400`}></i>
          </button>
        </div>
      </div>
      <div className="card-body">
        <p>
          Our AI algorithm analyzes your past financial behavior to predict future trends. 
          These predictions use Facebook's Prophet model and are based on your transaction history,
          seasonal patterns, and economic indicators.
        </p>
        
        {showAccuracyReport && (
          <div className="mt-3 animate__animated animate__fadeIn">
            <h6 className="font-weight-bold text-gray-700">Prediction Accuracy Report</h6>
            <div className="row">
              <div className="col-md-6">
                <div className="card bg-light mb-3">
                  <div className="card-body py-3 px-4">
                    <p className="mb-0">
                      <i className="fas fa-bullseye text-primary mr-2"></i>
                      <strong>Mean Absolute Percentage Error (MAPE):</strong> {modelAccuracy[0]?.value}%
                    </p>
                    <small className="text-muted">
                      Our predictions are typically within {modelAccuracy[0]?.value}% of actual values.
                    </small>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card bg-light mb-3">
                  <div className="card-body py-3 px-4">
                    <p className="mb-0">
                      <i className="fas fa-check-circle text-success mr-2"></i>
                      <strong>Prediction Confidence:</strong> {modelAccuracy[4]?.value}%
                    </p>
                    <small className="text-muted">
                      {modelAccuracy[4]?.value}% of actual outcomes fall within our predicted ranges.
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <div className="alert alert-info mt-2">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>Note:</strong> Financial predictions become less accurate as they extend further into the future. Shorter timeframes tend to have higher accuracy.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionAboutCard;