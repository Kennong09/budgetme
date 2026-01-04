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
    <>
      {/* Mobile About Predictions Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-info-circle text-indigo-500 text-[10px]"></i>
              About Predictions
            </h6>
            <button 
              onClick={onToggleAccuracyReport}
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <i className={`fas fa-${showAccuracyReport ? 'minus' : 'plus'} text-gray-500 text-[8px]`}></i>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-3">
            <p className="text-[10px] text-gray-600 leading-relaxed mb-3">
              Our AI analyzes your financial behavior to predict future trends using Facebook's Prophet model, seasonal patterns, and economic indicators.
            </p>
            
            {showAccuracyReport && (
              <div className="space-y-2 animate__animated animate__fadeIn">
                <p className="text-[9px] font-semibold text-gray-600 uppercase">Accuracy Report</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fas fa-bullseye text-blue-500 text-[10px]"></i>
                      <span className="text-[8px] text-blue-600 font-medium">MAPE</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{modelAccuracy[0]?.value}%</p>
                    <p className="text-[8px] text-gray-500">Prediction accuracy</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>
                      <span className="text-[8px] text-emerald-600 font-medium">Confidence</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{modelAccuracy[4]?.value}%</p>
                    <p className="text-[8px] text-gray-500">Within predicted range</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mt-2">
                  <p className="text-[8px] text-blue-700">
                    <i className="fas fa-info-circle mr-1"></i>
                    Shorter timeframes tend to have higher accuracy.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop About Predictions Card */}
      <div className="card shadow mb-4 animate__animated animate__fadeIn d-none d-md-block">
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
    </>
  );
};

export default PredictionAboutCard;