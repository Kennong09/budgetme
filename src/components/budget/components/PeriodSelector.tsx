import React, { FC, memo, useState } from 'react';
import { createPortal } from 'react-dom';

interface PeriodSelectorProps {
  selectedPeriod: string;
  onPeriodSelect: (period: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}

interface PeriodOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

const periodOptions: PeriodOption[] = [
  {
    value: 'day',
    label: 'Daily',
    description: 'Budget resets every day',
    icon: 'fas fa-calendar-day'
  },
  {
    value: 'week',
    label: 'Weekly',
    description: 'Budget resets every week',
    icon: 'fas fa-calendar-week'
  },
  {
    value: 'month',
    label: 'Monthly',
    description: 'Budget resets every month',
    icon: 'fas fa-calendar'
  },
  {
    value: 'quarter',
    label: 'Quarterly',
    description: 'Budget resets every quarter',
    icon: 'fas fa-calendar-alt'
  },
  {
    value: 'year',
    label: 'Yearly',
    description: 'Budget resets every year',
    icon: 'fas fa-calendar-check'
  }
];

const PeriodSelector: FC<PeriodSelectorProps> = memo(({
  selectedPeriod,
  onPeriodSelect,
  required = false,
  disabled = false,
  className = "",
  label = "Budget Period"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Filter period options based on search term
  const filteredPeriods = periodOptions.filter(period =>
    period.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    period.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the selected period option
  const selectedPeriodOption = periodOptions.find(p => p.value === selectedPeriod);

  const handlePeriodSelect = (period: string) => {
    onPeriodSelect(period);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    onPeriodSelect("");
    setIsOpen(false);
    setSearchTerm("");
  };

  // Mobile modal handlers
  const handleMobileOpen = () => {
    if (!disabled) {
      setIsMobileModalOpen(true);
    }
  };

  const handleMobileClose = () => {
    setIsMobileModalOpen(false);
  };

  const handleMobilePeriodSelect = (period: string) => {
    onPeriodSelect(period);
    setIsMobileModalOpen(false);
  };

  // Mobile Modal Component
  const MobilePeriodModal = () => {
    if (!isMobileModalOpen) return null;
    
    return createPortal(
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate__animated animate__fadeIn animate__faster"
        onClick={handleMobileClose}
      >
        <div 
          className="w-full max-h-[85vh] bg-white rounded-t-2xl shadow-xl animate__animated animate__slideInUp animate__faster overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-clock text-purple-500 text-xs"></i>
              {label}
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh] pb-4 px-3 py-2 space-y-1.5">
            {periodOptions.map((period) => (
              <div
                key={period.value}
                className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  selectedPeriod === period.value 
                    ? 'bg-purple-50 border-purple-300 shadow-sm' 
                    : 'bg-white border-gray-100'
                }`}
                onClick={() => handleMobilePeriodSelect(period.value)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      selectedPeriod === period.value ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <i className={`${period.icon} text-xs ${
                        selectedPeriod === period.value ? 'text-purple-500' : 'text-gray-500'
                      }`}></i>
                    </div>
                    <div>
                      <span className={`text-sm font-semibold block ${
                        selectedPeriod === period.value ? 'text-purple-700' : 'text-gray-800'
                      }`}>{period.label}</span>
                      <span className="text-[10px] text-gray-500">{period.description}</span>
                    </div>
                  </div>
                  {selectedPeriod === period.value && (
                    <i className="fas fa-check-circle text-purple-500 text-sm"></i>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={`form-group mb-3 md:mb-4 selector-container ${className}`}>
      {/* ===== MOBILE VIEW ===== */}
      <div className="block md:hidden">
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        <div
          className={`flex items-center justify-between p-2.5 bg-white border rounded-xl transition-all active:scale-[0.99] ${
            disabled ? 'opacity-50 bg-gray-50' : ''
          } ${selectedPeriodOption ? 'border-purple-200' : 'border-gray-200'}`}
          onClick={handleMobileOpen}
        >
          {selectedPeriodOption ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <i className={`${selectedPeriodOption.icon} text-purple-500 text-xs`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{selectedPeriodOption.label}</span>
                <span className="text-[10px] text-purple-600 font-medium">{selectedPeriodOption.description}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select period</span>
          )}
          
          <div className="flex items-center gap-1.5">
            {selectedPeriod && !disabled && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-1.5">How often the budget resets</p>
        <MobilePeriodModal />
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        <label className="text-sm md:text-base font-weight-bold text-gray-800">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        
        <div className="position-relative">
        {/* Selected Period Display */}
        <div
          className={`d-flex align-items-center justify-content-between px-2 py-1.5 md:px-3 md:py-2 border bg-white ${
            disabled ? 'bg-light' : ''
          } ${
            isOpen ? 'border-primary' : 'border-secondary'
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{ 
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderRadius: '0.375rem',
            minHeight: '38px'
          }}
        >
          {selectedPeriodOption ? (
            <div className="d-flex align-items-center">
              <i className={`${selectedPeriodOption.icon} mr-2 text-primary`}></i>
              <div>
                <div className="text-sm md:text-base font-weight-medium text-gray-800">
                  {selectedPeriodOption.label}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {selectedPeriodOption.description}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs md:text-sm text-muted">Select a period</span>
          )}
          
          <div className="d-flex align-items-center">
            {selectedPeriodOption && !disabled && (
              <button
                type="button"
                className="btn btn-sm text-danger mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                title="Clear selection"
                style={{ border: 'none', background: 'none', padding: '2px 6px' }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div 
            className="position-absolute w-100 bg-white border shadow-lg"
            style={{ 
              zIndex: 1050, 
              maxHeight: '300px', 
              overflowY: 'auto', 
              top: '100%',
              borderRadius: '0.375rem',
              borderColor: '#dee2e6'
            }}
          >
            {/* Search Box */}
            <div className="p-2 md:p-3 border-bottom">
              <input
                type="text"
                className="px-2 py-1.5 md:px-3 md:py-2 w-100 border text-xs md:text-sm"
                placeholder="Search periods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  borderRadius: '0.25rem',
                  fontSize: '14px',
                  borderColor: '#dee2e6',
                  outline: 'none'
                }}
              />
            </div>

            {/* Period Options */}
            <div className="py-1">
              {filteredPeriods.length === 0 ? (
                <div className="px-2 md:px-3 py-2 text-xs md:text-sm text-muted text-center">
                  No periods found
                </div>
              ) : (
                filteredPeriods.map((period) => (
                  <div
                    key={period.value}
                    className={`px-2 md:px-3 py-1.5 md:py-2 d-flex align-items-center cursor-pointer ${
                      selectedPeriod === period.value ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => handlePeriodSelect(period.value)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== period.value) {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== period.value) {
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    <i className={`${period.icon} mr-3 ${
                      selectedPeriod === period.value ? 'text-white' : 'text-primary'
                    }`}></i>
                    <div className="flex-grow-1">
                      <div className="font-weight-medium">
                        {period.label}
                      </div>
                      <div className={`text-xs ${
                        selectedPeriod === period.value ? 'text-white-50' : 'text-gray-600'
                      }`}>
                        {period.description}
                      </div>
                    </div>
                    {selectedPeriod === period.value && (
                      <i className="fas fa-check text-white"></i>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Period Details Card */}
      {selectedPeriodOption && (
        <div className="card mt-3 border-left-primary">
          <div className="card-body py-3">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="d-flex align-items-center mb-2">
                  <i className={`${selectedPeriodOption.icon} text-primary mr-2`}></i>
                  <div>
                    <div className="font-weight-bold text-gray-800">
                      {selectedPeriodOption.label} Budget
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedPeriodOption.description}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Duration
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {selectedPeriodOption.value === 'day' && '1 Day'}
                      {selectedPeriodOption.value === 'week' && '7 Days'}
                      {selectedPeriodOption.value === 'month' && '1 Month (28-31 Days)'}
                      {selectedPeriodOption.value === 'quarter' && '3 Months (~90 Days)'}
                      {selectedPeriodOption.value === 'year' && '12 Months (365 Days)'}
                    </span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Best For
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {selectedPeriodOption.value === 'day' && 'Daily expenses tracking'}
                      {selectedPeriodOption.value === 'week' && 'Weekly allowances'}
                      {selectedPeriodOption.value === 'month' && 'Regular monthly bills'}
                      {selectedPeriodOption.value === 'quarter' && 'Seasonal expenses'}
                      {selectedPeriodOption.value === 'year' && 'Annual subscriptions'}
                    </span>
                  </div>
                </div>

                {/* Period Tips */}
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-lightbulb text-warning mr-2 mt-1"></i>
                    <div className="text-xs text-gray-700">
                      {selectedPeriodOption.value === 'day' && 'Perfect for tracking daily spending limits like coffee or lunch money.'}
                      {selectedPeriodOption.value === 'week' && 'Ideal for weekly grocery budgets or entertainment allowances.'}
                      {selectedPeriodOption.value === 'month' && 'Most common choice for rent, utilities, and regular expenses.'}
                      {selectedPeriodOption.value === 'quarter' && 'Great for business expenses or seasonal planning.'}
                      {selectedPeriodOption.value === 'year' && 'Best for annual expenses like insurance or memberships.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Helper Text */}
        <small className="form-text text-xs md:text-sm text-muted">
          Select how often your budget period resets
        </small>
      </div>
    </div>
  );
});

PeriodSelector.displayName = 'PeriodSelector';

export default PeriodSelector;
