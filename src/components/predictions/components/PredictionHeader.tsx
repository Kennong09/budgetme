import React, { FC } from "react";
import { PredictionHeaderProps } from "../types";
import { useAuth } from "../../../utils/AuthContext";
import UsageLimitIndicator from "./UsageLimitIndicator";

const PredictionHeader: FC<PredictionHeaderProps> = ({
  showModelDetails,
  onToggleModelDetails,
  onExportCSV,
  onExportPredictions,
  onViewHistory,
  onExportInsights,
  onGeneratePredictions,
  generating = false,
  hasProphetData = false
}) => {
  const { user } = useAuth();
  
  return (
    <>
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-800">AI Predictions</h1>
            {hasProphetData && (
              <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                <i className="fas fa-check-circle mr-0.5"></i>
                Cached
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Generate/Regenerate Button */}
            {onGeneratePredictions && (
              <button
                onClick={onGeneratePredictions}
                disabled={generating}
                className={`w-9 h-9 rounded-full ${hasProphetData ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50`}
                aria-label={hasProphetData ? "Regenerate predictions" : "Generate predictions"}
              >
                {generating ? (
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                ) : (
                  <i className={`fas fa-${hasProphetData ? 'sync-alt' : 'magic'} text-xs`}></i>
                )}
              </button>
            )}
            {/* History Button */}
            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                aria-label="View history"
              >
                <i className="fas fa-history text-xs"></i>
              </button>
            )}
            {/* Export Dropdown */}
            {(onExportPredictions || onExportCSV) && (
              <div className="dropdown">
                <button
                  className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                  type="button"
                  id="mobileExportDropdown"
                  data-toggle="dropdown"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-label="Export"
                >
                  <i className="fas fa-download text-xs"></i>
                </button>
                <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="mobileExportDropdown">
                  <button 
                    className="dropdown-item text-sm" 
                    onClick={() => onExportPredictions ? onExportPredictions('json') : onExportCSV?.()}
                  >
                    <i className="fas fa-chart-line fa-sm fa-fw mr-2 text-primary"></i>Predictions
                  </button>
                  {onExportInsights && (
                    <button className="dropdown-item text-sm" onClick={() => onExportInsights('json')}>
                      <i className="fas fa-lightbulb fa-sm fa-fw mr-2 text-warning"></i>AI Insights
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Page Heading */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
          AI Financial Predictions
          {hasProphetData && (
            <span className="badge badge-success ml-3" style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}>
              <i className="fas fa-check-circle mr-1"></i>
              Cached
            </span>
          )}
        </h1>
        <div className="d-flex align-items-center">
          {/* Compact Usage Indicator */}
          {user?.id && (
            <div className="mr-3">
              <UsageLimitIndicator 
                userId={user.id} 
                serviceType="prophet" 
                compact={true}
              />
            </div>
          )}
        {onGeneratePredictions && (
          <button
            onClick={onGeneratePredictions}
            disabled={generating}
            className="d-none d-sm-inline-block btn shadow-sm mr-2 animate__animated animate__fadeIn"
            style={{ 
              backgroundColor: hasProphetData ? '#10b981' : '#3b82f6',
              color: 'white', 
              borderColor: hasProphetData ? '#10b981' : '#3b82f6',
              minWidth: '190px',
              height: '38px',
              padding: '8px 16px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hasProphetData ? '#059669' : '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = hasProphetData ? '#10b981' : '#3b82f6'}
            title={hasProphetData ? 'Generate new predictions (will use rate limit)' : 'Generate predictions from your transaction data'}
          >
            {generating ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" />
                Generating...
              </>
            ) : (
              <>
                <i className={`fas fa-${hasProphetData ? 'sync-alt' : 'magic'} mr-2`}></i>
                {hasProphetData ? 'Regenerate' : 'Generate'} Predictions
              </>
            )}
          </button>
        )}
        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="d-none d-sm-inline-block btn shadow-sm mr-2 animate__animated animate__fadeIn"
            style={{ 
              backgroundColor: '#0ea5e9', 
              color: 'white', 
              borderColor: '#0ea5e9',
              minWidth: '150px',
              height: '38px',
              padding: '8px 16px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
          >
            <i className="fas fa-history mr-2"></i>
            View History
          </button>
        )}
        <button
          onClick={onToggleModelDetails}
          className="d-none d-sm-inline-block btn shadow-sm mr-2 animate__animated animate__fadeIn"
          style={{ 
            backgroundColor: '#6366f1',
            color: 'white',
            borderColor: '#6366f1',
            minWidth: '170px',
            height: '38px',
            padding: '8px 16px',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
        >
          <i className="fas fa-brain mr-2"></i>
          AI Model Details
        </button>
        {(onExportPredictions || onExportCSV) && (
          <button
            onClick={() => {
              if (onExportPredictions) {
                onExportPredictions('json'); // Default to JSON export
              } else if (onExportCSV) {
                onExportCSV(); // Fallback to legacy handler
              }
            }}
            className="d-none d-sm-inline-block btn shadow-sm mr-2 animate__animated animate__fadeIn"
            style={{ 
              backgroundColor: '#16a34a',
              color: 'white',
              borderColor: '#16a34a',
              minWidth: '180px',
              height: '38px',
              padding: '8px 16px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
          >
            <i className="fas fa-download mr-2"></i>
            Export Predictions
          </button>
        )}
        {onExportInsights && (
          <button
            onClick={() => onExportInsights('json')}
            className="d-none d-sm-inline-block btn shadow-sm animate__animated animate__fadeIn"
            style={{ 
              backgroundColor: '#06b6d4',
              color: 'white',
              borderColor: '#06b6d4',
              minWidth: '180px',
              height: '38px',
              padding: '8px 16px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06b6d4'}
          >
            <i className="fas fa-file-code mr-2"></i>
            Export AI Insights
          </button>
        )}
        </div>
      </div>
    </>
  );
};

export default PredictionHeader;