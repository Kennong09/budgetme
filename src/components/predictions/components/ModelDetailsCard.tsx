import React, { FC } from "react";
import { ModelDetailsCardProps } from "../types";

const ModelDetailsCard: FC<ModelDetailsCardProps> = ({
  showModelDetails,
  modelDetails,
  modelAccuracy,
  activeTip,
  tooltipPosition,
  onToggleTip,
  onClose
}) => {
  if (!showModelDetails) return null;

  return (
    <>
      {/* Mobile Model Details Card */}
      <div className="block md:hidden mb-4 animate__animated animate__fadeIn">
        <div className="bg-white rounded-2xl shadow-sm border border-cyan-200 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-cyan-700 flex items-center gap-1.5">
              <i className="fas fa-brain text-cyan-500 text-[10px]"></i>
              Prophet Model Details
            </h6>
            <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
              <i className="fas fa-times text-gray-400 text-[10px]"></i>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-3 space-y-3">
            {/* About Prophet */}
            <div className="bg-cyan-50 rounded-xl p-2.5">
              <p className="text-[9px] text-cyan-700 leading-relaxed">
                <strong>About Prophet:</strong> Open-source time series forecasting by Facebook, designed for business metrics with strong seasonal effects.
              </p>
            </div>
            
            {/* Model Parameters */}
            <div>
              <p className="text-[9px] font-semibold text-gray-600 uppercase mb-2">Parameters</p>
              <div className="space-y-1.5">
                {modelDetails.slice(0, 4).map((detail, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <span className="text-[9px] text-gray-600">{detail.name}</span>
                    <span className="text-[9px] font-semibold text-gray-800">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Accuracy Metrics */}
            <div>
              <p className="text-[9px] font-semibold text-gray-600 uppercase mb-2">Accuracy</p>
              <div className="grid grid-cols-2 gap-1.5">
                {modelAccuracy.slice(0, 4).map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[8px] text-gray-500 truncate">{item.metric}</p>
                    <p className="text-xs font-bold text-gray-800">
                      {item.metric.includes('MAPE') || item.metric.includes('Coverage') ? `${item.value}%` : item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              <p className="text-[8px] text-amber-700">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Financial predictions are estimates. Consult a financial advisor for major decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Model Details Card */}
      <div className="row mb-4 animate__animated animate__fadeIn d-none d-md-block">
        <div className="col-12">
          <div className="card shadow border-left-info" style={{ borderLeftWidth: "4px" }}>
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between" 
                 style={{ background: 'linear-gradient(135deg, rgba(54, 185, 204, 0.05) 0%, rgba(54, 185, 204, 0.1) 100%)' }}>
              <h6 className="m-0 font-weight-bold text-info d-flex align-items-center">
                <i className="fas fa-brain mr-2"></i>
                Prophet Model Details
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('prophetModel', e)}
                    aria-label="Prophet model information"
                  ></i>
                </div>
              </h6>
              <div className="dropdown no-arrow">
                <button 
                  className="btn btn-link btn-sm" 
                  type="button" 
                  onClick={onClose}
                >
                  <i className="fas fa-times text-info"></i>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-4">
                    <div className="alert alert-info" style={{ background: 'rgba(54, 185, 204, 0.05)', border: '1px solid rgba(54, 185, 204, 0.2)' }}>
                      <div className="d-flex">
                        <div className="mr-3">
                          <i className="fas fa-lightbulb fa-2x text-info"></i>
                        </div>
                        <p className="mb-0">
                          <strong>About Prophet:</strong> Prophet is an open-source time series forecasting procedure developed by Facebook. It's designed for forecasting business metrics with high accuracy and works best with time series that have strong seasonal effects and several seasons of historical data.
                        </p>
                      </div>
                    </div>
                    <div className="table-responsive mt-4">
                      <table className="table table-bordered">
                        <thead style={{ background: 'rgba(54, 185, 204, 0.1)' }}>
                          <tr>
                            <th className="text-info">Parameter</th>
                            <th className="text-info">Value</th>
                            <th className="text-info">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelDetails.map((detail, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-light' : ''}>
                              <td><strong>{detail.name}</strong></td>
                              <td>{detail.value}</td>
                              <td>{detail.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-4">
                    <h5 className="mb-3 text-info">
                      <i className="fas fa-chart-line mr-2"></i>
                      Model Accuracy Metrics
                    </h5>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead style={{ background: 'rgba(54, 185, 204, 0.1)' }}>
                          <tr>
                            <th className="text-info">Metric</th>
                            <th className="text-info">Value</th>
                            <th className="text-info">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelAccuracy.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-light' : ''}>
                              <td><strong>{item.metric}</strong></td>
                              <td>
                                {item.metric.includes('MAPE') || item.metric.includes('Coverage') 
                                  ? `${item.value}%` 
                                  : item.value}
                              </td>
                              <td>{item.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <a href="https://facebook.github.io/prophet/" target="_blank" rel="noopener noreferrer" className="btn btn-outline-info">
                      <i className="fas fa-external-link-alt mr-2"></i>
                      Learn More About Prophet
                    </a>
                  </div>
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-12">
                  <div className="card bg-light border-left-warning">
                    <div className="card-body py-3">
                      <div className="d-flex">
                        <div className="mr-3">
                          <i className="fas fa-exclamation-triangle text-warning"></i>
                        </div>
                        <p className="mb-0 small">
                          <strong>Note:</strong> Financial predictions are estimates based on historical data and may not accurately reflect future outcomes. Always consider external factors and consult a financial advisor for major financial decisions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModelDetailsCard;