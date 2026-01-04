import React, { FC, useState, memo } from 'react';
import { createPortal } from 'react-dom';

interface TargetDateSelectorProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
}

interface QuickDateOption {
  label: string;
  value: string;
  description: string;
  icon: string;
}

const TargetDateSelector: FC<TargetDateSelectorProps> = memo(({
  selectedDate,
  onDateSelect,
  required = false,
  disabled = false,
  className = "",
  label = "Target Date",
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customDate, setCustomDate] = useState(selectedDate || '');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Calculate quick date options
  const getQuickDateOptions = (): QuickDateOption[] => {
    const today = new Date();
    
    const addMonths = (date: Date, months: number): Date => {
      const result = new Date(date);
      result.setMonth(result.getMonth() + months);
      return result;
    };

    const addYears = (date: Date, years: number): Date => {
      const result = new Date(date);
      result.setFullYear(result.getFullYear() + years);
      return result;
    };

    const formatDateValue = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    return [
      {
        label: '1 Month',
        value: formatDateValue(addMonths(today, 1)),
        description: 'Short-term goal',
        icon: 'fas fa-bolt'
      },
      {
        label: '3 Months',
        value: formatDateValue(addMonths(today, 3)),
        description: 'Quarter goal',
        icon: 'fas fa-calendar-week'
      },
      {
        label: '6 Months',
        value: formatDateValue(addMonths(today, 6)),
        description: 'Half-year goal',
        icon: 'fas fa-calendar-alt'
      },
      {
        label: '1 Year',
        value: formatDateValue(addYears(today, 1)),
        description: 'Annual goal',
        icon: 'fas fa-calendar'
      },
      {
        label: '2 Years',
        value: formatDateValue(addYears(today, 2)),
        description: 'Long-term goal',
        icon: 'fas fa-hourglass-half'
      },
      {
        label: '5 Years',
        value: formatDateValue(addYears(today, 5)),
        description: 'Major milestone',
        icon: 'fas fa-trophy'
      }
    ];
  };

  const quickOptions = getQuickDateOptions();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomDate(value);
    if (value) {
      onDateSelect(value);
    }
  };

  const handleQuickSelect = (option: QuickDateOption) => {
    onDateSelect(option.value);
    setCustomDate(option.value);
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateSelect('');
    setCustomDate('');
    setIsOpen(false);
  };

  // Format date for display
  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get day of week
  const getDayOfWeek = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Get relative date description
  const getRelativeDate = (dateString: string): string => {
    if (!dateString) return '';
    const selected = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 7 && diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays > 30 && diffDays <= 365) return `In ${Math.ceil(diffDays / 30)} months`;
    if (diffDays > 365) return `In ${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
    if (diffDays < -7) return `${Math.ceil(Math.abs(diffDays) / 7)} weeks ago`;
    
    return '';
  };

  // Get days remaining
  const getDaysRemaining = (dateString: string): number => {
    if (!dateString) return 0;
    const selected = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get month and year
  const getMonthYear = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get icon based on relative date
  const getDateIcon = (dateString: string): string => {
    if (!dateString) return 'fas fa-calendar-alt';
    const daysRemaining = getDaysRemaining(dateString);
    if (daysRemaining <= 0) return 'fas fa-calendar-times';
    if (daysRemaining <= 7) return 'fas fa-calendar-day';
    if (daysRemaining <= 30) return 'fas fa-calendar-week';
    if (daysRemaining <= 90) return 'fas fa-calendar';
    if (daysRemaining <= 365) return 'fas fa-calendar-alt';
    return 'fas fa-calendar-check';
  };

  // Get timeline category
  const getTimelineCategory = (dateString: string): { label: string; color: string; description: string } => {
    if (!dateString) return { label: 'Not Set', color: 'gray', description: 'Select a target date' };
    const daysRemaining = getDaysRemaining(dateString);
    
    if (daysRemaining <= 0) return { label: 'Overdue', color: 'danger', description: 'Goal deadline has passed' };
    if (daysRemaining <= 7) return { label: 'Urgent', color: 'danger', description: 'Less than a week remaining' };
    if (daysRemaining <= 30) return { label: 'Short-term', color: 'warning', description: 'About a month to achieve' };
    if (daysRemaining <= 90) return { label: 'Medium-term', color: 'info', description: 'A few months to achieve' };
    if (daysRemaining <= 365) return { label: 'Long-term', color: 'primary', description: 'Within a year' };
    return { label: 'Extended', color: 'success', description: 'Multi-year goal' };
  };

  // Get minimum date (tomorrow by default for goals)
  const getMinDate = (): string => {
    if (minDate) return minDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Find matching quick option
  const getSelectedQuickOption = (): QuickDateOption | null => {
    if (!selectedDate) return null;
    return quickOptions.find(opt => opt.value === selectedDate) || null;
  };

  const daysRemaining = selectedDate ? getDaysRemaining(selectedDate) : 0;
  const timelineCategory = getTimelineCategory(selectedDate);
  const selectedQuickOption = getSelectedQuickOption();

  // Mobile modal handlers
  const handleMobileOpen = () => {
    if (!disabled) {
      setIsMobileModalOpen(true);
    }
  };

  const handleMobileClose = () => {
    setIsMobileModalOpen(false);
  };

  const handleMobileDateSelect = (date: string) => {
    onDateSelect(date);
    setCustomDate(date);
    setIsMobileModalOpen(false);
  };

  // Get timeline color classes
  const getTimelineColors = (color: string) => {
    switch (color) {
      case 'danger': return { bg: 'bg-rose-100', text: 'text-rose-500', border: 'border-rose-200' };
      case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-500', border: 'border-amber-200' };
      case 'info': return { bg: 'bg-blue-100', text: 'text-blue-500', border: 'border-blue-200' };
      case 'primary': return { bg: 'bg-indigo-100', text: 'text-indigo-500', border: 'border-indigo-200' };
      case 'success': return { bg: 'bg-emerald-100', text: 'text-emerald-500', border: 'border-emerald-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };
    }
  };

  // Mobile Modal Component
  const MobileTargetDateModal = () => {
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
              <i className="fas fa-bullseye text-indigo-500 text-xs"></i>
              {label}
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh] pb-4">
            <div className="p-4">
              <input
                type="date"
                className="w-full p-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                value={customDate}
                onChange={(e) => handleMobileDateSelect(e.target.value)}
                min={getMinDate()}
                max={maxDate}
              />
            </div>
            
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Select</p>
            </div>
            
            <div className="px-3 space-y-1.5">
              {quickOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedDate === option.value 
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                      : 'bg-white border-gray-100'
                  }`}
                  onClick={() => handleMobileDateSelect(option.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        selectedDate === option.value ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <i className={`${option.icon} text-xs ${
                          selectedDate === option.value ? 'text-indigo-500' : 'text-gray-500'
                        }`}></i>
                      </div>
                      <div>
                        <span className={`text-sm font-semibold block ${
                          selectedDate === option.value ? 'text-indigo-700' : 'text-gray-800'
                        }`}>{option.label}</span>
                        <span className="text-[10px] text-gray-500">{option.description}</span>
                      </div>
                    </div>
                    {selectedDate === option.value && (
                      <i className="fas fa-check-circle text-indigo-500 text-sm"></i>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const colors = getTimelineColors(timelineCategory.color);

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
          } ${selectedDate ? colors.border : 'border-gray-200'}`}
          onClick={handleMobileOpen}
        >
          {selectedDate ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}>
                <i className={`${getDateIcon(selectedDate)} ${colors.text} text-xs`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{formatDateDisplay(selectedDate)}</span>
                <span className={`text-[10px] font-medium ${colors.text}`}>{getRelativeDate(selectedDate)}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select target date</span>
          )}
          
          <div className="flex items-center gap-1.5">
            {selectedDate && !disabled && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
                onClick={handleClearSelection}
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
          </div>
        </div>

        {selectedDate && (
          <div className={`mt-2 p-2.5 rounded-xl border ${colors.bg} ${colors.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg}`}>
                  <i className={`fas fa-hourglass-half ${colors.text} text-xs`}></i>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Days Left</p>
                  <p className={`text-sm font-bold ${colors.text}`}>{daysRemaining > 0 ? daysRemaining : 'Overdue'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Timeline</p>
                <p className={`text-xs font-bold ${colors.text}`}>{timelineCategory.label}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-1.5">When do you want to achieve this goal?</p>
        <MobileTargetDateModal />
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        <label className="text-sm md:text-base font-weight-bold text-gray-800">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        
        <div className="position-relative">
        {/* Selected Date Display */}
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
          {selectedDate ? (
            <div className="d-flex align-items-center">
              <i className={`${getDateIcon(selectedDate)} mr-2 text-primary`}></i>
              <div>
                <div className="text-sm md:text-base font-weight-medium text-gray-800">
                  {formatDateDisplay(selectedDate)}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {getRelativeDate(selectedDate)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs md:text-sm text-muted">Select target date</span>
          )}
          
          <div className="d-flex align-items-center">
            {selectedDate && !disabled && (
              <button
                type="button"
                className="btn btn-sm text-danger mr-2"
                onClick={handleClearSelection}
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
              maxHeight: '400px', 
              overflowY: 'auto', 
              top: '100%',
              borderRadius: '0.375rem',
              borderColor: '#dee2e6'
            }}
          >
            {/* Custom Date Input */}
            <div className="p-2 md:p-3 border-bottom">
              <label className="text-xs font-weight-bold text-gray-600 text-uppercase mb-1 d-block">
                Custom Date
              </label>
              <input
                type="date"
                className="form-control text-sm md:text-base"
                value={customDate}
                onChange={handleDateChange}
                min={getMinDate()}
                max={maxDate}
                style={{ fontSize: '14px' }}
              />
            </div>

            {/* Quick Options */}
            <div className="py-1">
              <div className="px-2 md:px-3 py-1 text-xs font-weight-bold text-gray-500 text-uppercase">
                Quick Select
              </div>
              {quickOptions.map((option) => (
                <div
                  key={option.value}
                  className={`px-2 md:px-3 py-1.5 md:py-2 d-flex align-items-center ${
                    selectedDate === option.value ? 'bg-primary text-white' : ''
                  }`}
                  onClick={() => handleQuickSelect(option)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDate !== option.value) {
                      e.currentTarget.style.backgroundColor = '#f8f9fc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDate !== option.value) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                >
                  <i className={`${option.icon} mr-3 ${
                    selectedDate === option.value ? 'text-white' : 'text-primary'
                  }`}></i>
                  <div className="flex-grow-1">
                    <div className="font-weight-medium">
                      {option.label}
                    </div>
                    <div className={`text-xs ${
                      selectedDate === option.value ? 'text-white-50' : 'text-gray-600'
                    }`}>
                      {option.description} • {formatDateDisplay(option.value)}
                    </div>
                  </div>
                  {selectedDate === option.value && (
                    <i className="fas fa-check text-white"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Date Details Card */}
      {selectedDate && (
        <div className={`card mt-2 md:mt-3 border-left-${timelineCategory.color}`}>
          <div className="card-body p-2 md:p-3">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="d-flex align-items-center mb-2">
                  <i className={`${getDateIcon(selectedDate)} text-${timelineCategory.color} mr-2`}></i>
                  <div>
                    <div className="text-sm md:text-base font-weight-bold text-gray-800">
                      {formatDateDisplay(selectedDate)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      {getRelativeDate(selectedDate)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Day of Week
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {getDayOfWeek(selectedDate)}
                    </span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Month & Year
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {getMonthYear(selectedDate)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Timeline
                    </span>
                    <span className={`badge badge-${timelineCategory.color}`}>
                      {timelineCategory.label}
                    </span>
                  </div>
                </div>

                {/* Date Tips */}
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="d-flex align-items-start">
                    <i className={`fas fa-${daysRemaining <= 0 ? 'exclamation-triangle text-danger' : 'lightbulb text-warning'} mr-2 mt-1`}></i>
                    <div className="text-xs text-gray-700">
                      {daysRemaining <= 0 && 
                        'Goal deadline has passed. Consider updating your target date.'}
                      {daysRemaining > 0 && daysRemaining <= 7 && 
                        'Less than a week remaining! Focus on this goal to meet your deadline.'}
                      {daysRemaining > 7 && daysRemaining <= 30 && 
                        'Short-term goal. Stay consistent with your savings to reach it on time.'}
                      {daysRemaining > 30 && daysRemaining <= 90 && 
                        'Medium-term goal. Break it down into monthly milestones for better tracking.'}
                      {daysRemaining > 90 && daysRemaining <= 365 && 
                        'Long-term goal. Set up automatic contributions to stay on track.'}
                      {daysRemaining > 365 && 
                        'Extended timeline. Review and adjust periodically as circumstances change.'}
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
          When do you want to achieve this goal?
        </small>
      </div>
    </div>
  );
});

TargetDateSelector.displayName = 'TargetDateSelector';

export default TargetDateSelector;
