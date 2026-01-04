import React, { FC, useState, memo } from 'react';
import { createPortal } from 'react-dom';

export type PriorityLevel = 'low' | 'medium' | 'high';

interface PrioritySelectorProps {
  selectedPriority: PriorityLevel;
  onPrioritySelect: (priority: PriorityLevel) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  showDescription?: boolean;
}

interface PriorityOption {
  value: PriorityLevel;
  label: string;
  description: string;
  icon: string;
  color: string;
  bestFor: string;
  tip: string;
}

const priorityOptions: PriorityOption[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Nice to have, flexible timeline',
    icon: 'fas fa-leaf',
    color: 'success',
    bestFor: 'Wish list items, optional upgrades',
    tip: 'Low priority goals can be paused if higher priorities need attention.'
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Important, moderate urgency',
    icon: 'fas fa-balance-scale',
    color: 'warning',
    bestFor: 'Planned purchases, savings goals',
    tip: 'Balance medium priority goals with your regular expenses and high priorities.'
  },
  {
    value: 'high',
    label: 'High',
    description: 'Critical, needs immediate focus',
    icon: 'fas fa-fire',
    color: 'danger',
    bestFor: 'Emergency fund, debt payoff, urgent needs',
    tip: 'High priority goals should be funded first before discretionary spending.'
  }
];

const PrioritySelector: FC<PrioritySelectorProps> = memo(({
  selectedPriority,
  onPrioritySelect,
  required = false,
  disabled = false,
  className = "",
  label = "Priority",
  showDescription = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Filter priority options based on search term
  const filteredPriorities = priorityOptions.filter(priority =>
    priority.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    priority.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the selected priority option
  const selectedPriorityOption = priorityOptions.find(p => p.value === selectedPriority);

  const handlePrioritySelect = (priority: PriorityLevel) => {
    onPrioritySelect(priority);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPrioritySelect('medium'); // Default to medium
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

  const handleMobilePrioritySelect = (priority: PriorityLevel) => {
    onPrioritySelect(priority);
    setIsMobileModalOpen(false);
  };

  // Get priority color classes
  const getPriorityColors = (color: string) => {
    switch (color) {
      case 'success': return { bg: 'bg-emerald-100', text: 'text-emerald-500', border: 'border-emerald-200' };
      case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-500', border: 'border-amber-200' };
      case 'danger': return { bg: 'bg-rose-100', text: 'text-rose-500', border: 'border-rose-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };
    }
  };

  // Mobile Modal Component
  const MobilePriorityModal = () => {
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
              <i className="fas fa-flag text-amber-500 text-xs"></i>
              {label}
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh] pb-4 px-3 py-2 space-y-2">
            {priorityOptions.map((priority) => {
              const colors = getPriorityColors(priority.color);
              return (
                <div
                  key={priority.value}
                  className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedPriority === priority.value 
                      ? `${colors.bg} ${colors.border} shadow-sm` 
                      : 'bg-white border-gray-100'
                  }`}
                  onClick={() => handleMobilePrioritySelect(priority.value)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${colors.bg}`}>
                        <i className={`${priority.icon} text-xs ${colors.text}`}></i>
                      </div>
                      <div>
                        <span className={`text-sm font-semibold block ${
                          selectedPriority === priority.value ? colors.text : 'text-gray-800'
                        }`}>{priority.label}</span>
                        <span className="text-[10px] text-gray-500">{priority.description}</span>
                      </div>
                    </div>
                    {selectedPriority === priority.value && (
                      <i className={`fas fa-check-circle ${colors.text} text-sm`}></i>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 pl-11.5">
                    <i className="fas fa-lightbulb mr-1"></i>{priority.bestFor}
                  </div>
                </div>
              );
            })}
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
          } ${selectedPriorityOption ? getPriorityColors(selectedPriorityOption.color).border : 'border-gray-200'}`}
          onClick={handleMobileOpen}
        >
          {selectedPriorityOption ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPriorityColors(selectedPriorityOption.color).bg}`}>
                <i className={`${selectedPriorityOption.icon} ${getPriorityColors(selectedPriorityOption.color).text} text-xs`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{selectedPriorityOption.label}</span>
                <span className={`text-[10px] font-medium ${getPriorityColors(selectedPriorityOption.color).text}`}>
                  {selectedPriorityOption.description}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select priority</span>
          )}
          
          <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
        </div>

        <p className="text-[10px] text-gray-400 mt-1.5">Set importance level for this goal</p>
        <MobilePriorityModal />
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        <label className="text-sm md:text-base font-weight-bold text-gray-800">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        
        <div className="position-relative">
        {/* Selected Priority Display */}
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
          {selectedPriorityOption ? (
            <div className="d-flex align-items-center">
              <i className={`${selectedPriorityOption.icon} mr-2 text-${selectedPriorityOption.color}`}></i>
              <div>
                <div className="text-sm md:text-base font-weight-medium text-gray-800">
                  {selectedPriorityOption.label}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {selectedPriorityOption.description}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs md:text-sm text-muted">Select priority</span>
          )}
          
          <div className="d-flex align-items-center">
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div 
            className="position-absolute w-100 bg-white border shadow-lg"
            style={{ 
              zIndex: 1050, 
              maxHeight: '350px', 
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
                placeholder="Search priorities..."
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

            {/* Priority Options */}
            <div className="py-1">
              {filteredPriorities.length === 0 ? (
                <div className="px-2 md:px-3 py-2 text-xs md:text-sm text-muted text-center">
                  No priorities found
                </div>
              ) : (
                filteredPriorities.map((priority) => (
                  <div
                    key={priority.value}
                    className={`px-2 md:px-3 py-1.5 md:py-2 d-flex align-items-center cursor-pointer ${
                      selectedPriority === priority.value ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => handlePrioritySelect(priority.value)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPriority !== priority.value) {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPriority !== priority.value) {
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    <i className={`${priority.icon} mr-3 ${
                      selectedPriority === priority.value ? 'text-white' : `text-${priority.color}`
                    }`}></i>
                    <div className="flex-grow-1">
                      <div className="font-weight-medium">
                        {priority.label}
                      </div>
                      <div className={`text-xs ${
                        selectedPriority === priority.value ? 'text-white-50' : 'text-gray-600'
                      }`}>
                        {priority.description}
                      </div>
                    </div>
                    {selectedPriority === priority.value && (
                      <i className="fas fa-check text-white"></i>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Priority Details Card */}
      {selectedPriorityOption && showDescription && (
        <div className={`card mt-2 md:mt-3 border-left-${selectedPriorityOption.color}`}>
          <div className="card-body p-2 md:p-3">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="d-flex align-items-center mb-2">
                  <i className={`${selectedPriorityOption.icon} text-${selectedPriorityOption.color} mr-2`}></i>
                  <div>
                    <div className="text-sm md:text-base font-weight-bold text-gray-800">
                      {selectedPriorityOption.label} Priority
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      {selectedPriorityOption.description}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Urgency Level
                    </span>
                    <span className={`badge badge-${selectedPriorityOption.color}`}>
                      {selectedPriorityOption.value === 'low' && 'Flexible'}
                      {selectedPriorityOption.value === 'medium' && 'Moderate'}
                      {selectedPriorityOption.value === 'high' && 'Urgent'}
                    </span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Best For
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {selectedPriorityOption.bestFor}
                    </span>
                  </div>
                </div>

                {/* Priority Tips */}
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-lightbulb text-warning mr-2 mt-1"></i>
                    <div className="text-xs text-gray-700">
                      {selectedPriorityOption.tip}
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
          How important is this goal to you?
        </small>
      </div>
    </div>
  );
});

PrioritySelector.displayName = 'PrioritySelector';

export default PrioritySelector;
