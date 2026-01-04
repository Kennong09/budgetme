import React, { FC, memo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DateSelectorProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
}

const DateSelector: FC<DateSelectorProps> = memo(({
  selectedDate,
  onDateSelect,
  required = false,
  disabled = false,
  className = "",
  label = "Start Date",
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateSelect(e.target.value);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateSelect('');
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
    if (diffDays > 7) return `In ${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays < -7) return `${Math.ceil(Math.abs(diffDays) / 7)} weeks ago`;
    
    return '';
  };

  // Get month and year
  const getMonthYear = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get icon based on relative date
  const getDateIcon = (dateString: string): string => {
    if (!dateString) return 'fas fa-calendar-day';
    const relativeDate = getRelativeDate(dateString);
    if (relativeDate === 'Today') return 'fas fa-calendar-day';
    if (relativeDate === 'Tomorrow') return 'fas fa-calendar-plus';
    if (relativeDate === 'Yesterday') return 'fas fa-calendar-minus';
    if (relativeDate.includes('ago')) return 'fas fa-calendar-minus';
    return 'fas fa-calendar-plus';
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

  const handleMobileDateSelect = (date: string) => {
    onDateSelect(date);
    setIsMobileModalOpen(false);
  };

  // Mobile Modal Component
  const MobileDateModal = () => {
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
              <i className="fas fa-calendar-alt text-blue-500 text-xs"></i>
              {label}
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          <div className="p-4">
            <input
              type="date"
              className="w-full p-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
              value={selectedDate}
              onChange={(e) => handleMobileDateSelect(e.target.value)}
              min={minDate}
              max={maxDate}
              autoFocus
            />
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="p-2.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-xl active:scale-[0.98]"
                onClick={() => handleMobileDateSelect(new Date().toISOString().split('T')[0])}
              >
                <i className="fas fa-calendar-day mr-1.5"></i>Today
              </button>
              <button
                type="button"
                className="p-2.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-xl active:scale-[0.98]"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  handleMobileDateSelect(tomorrow.toISOString().split('T')[0]);
                }}
              >
                <i className="fas fa-calendar-plus mr-1.5"></i>Tomorrow
              </button>
              <button
                type="button"
                className="p-2.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-xl active:scale-[0.98]"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  handleMobileDateSelect(nextWeek.toISOString().split('T')[0]);
                }}
              >
                <i className="fas fa-calendar-week mr-1.5"></i>Next Week
              </button>
              <button
                type="button"
                className="p-2.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-xl active:scale-[0.98]"
                onClick={() => {
                  const nextMonth = new Date();
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  nextMonth.setDate(1);
                  handleMobileDateSelect(nextMonth.toISOString().split('T')[0]);
                }}
              >
                <i className="fas fa-calendar-alt mr-1.5"></i>Next Month
              </button>
            </div>
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
          } ${selectedDate ? 'border-blue-200' : 'border-gray-200'}`}
          onClick={handleMobileOpen}
        >
          {selectedDate ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <i className={`${getDateIcon(selectedDate)} text-blue-500 text-xs`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{formatDateDisplay(selectedDate)}</span>
                <span className="text-[10px] text-blue-600 font-medium">{getRelativeDate(selectedDate)}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select date</span>
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
          <div className="mt-2 p-2.5 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <i className="fas fa-calendar-check text-blue-600 text-xs"></i>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Day</p>
                  <p className="text-xs font-bold text-blue-600">{getDayOfWeek(selectedDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Month</p>
                <p className="text-xs font-bold text-blue-600">{getMonthYear(selectedDate)}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-1.5">Select when this budget period begins</p>
        <MobileDateModal />
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
            <span className="text-xs md:text-sm text-muted">Select start date</span>
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

        {/* Date Picker Dropdown */}
        {isOpen && !disabled && (
          <div 
            className="position-absolute w-100 bg-white border shadow-lg"
            style={{ 
              zIndex: 1050, 
              top: '100%',
              borderRadius: '0.375rem',
              borderColor: '#dee2e6'
            }}
          >
            <div className="p-2 md:p-3">
              <input
                type="date"
                className="form-control text-sm md:text-base"
                value={selectedDate}
                onChange={handleDateChange}
                min={minDate}
                max={maxDate}
                autoFocus
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                style={{
                  fontSize: '14px'
                }}
              />
              <div className="mt-2 d-flex gap-1 md:gap-2 flex-wrap">
                <button
                  type="button"
                  className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white hover:bg-gray-50 text-[#4e73df] border border-[#4e73df] font-medium rounded transition-colors"
                  onClick={() => {
                    onDateSelect(new Date().toISOString().split('T')[0]);
                    setIsOpen(false);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white hover:bg-gray-50 text-[#4e73df] border border-[#4e73df] font-medium rounded transition-colors"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    onDateSelect(tomorrow.toISOString().split('T')[0]);
                    setIsOpen(false);
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white hover:bg-gray-50 text-[#4e73df] border border-[#4e73df] font-medium rounded transition-colors"
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    onDateSelect(nextWeek.toISOString().split('T')[0]);
                    setIsOpen(false);
                  }}
                >
                  Next Week
                </button>
                <button
                  type="button"
                  className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white hover:bg-gray-50 text-[#4e73df] border border-[#4e73df] font-medium rounded transition-colors"
                  onClick={() => {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(1);
                    onDateSelect(nextMonth.toISOString().split('T')[0]);
                    setIsOpen(false);
                  }}
                >
                  Next Month
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Date Details Card */}
      {selectedDate && (
        <div className="card mt-2 md:mt-3 border-left-info">
          <div className="card-body p-2 md:p-3">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="d-flex align-items-center mb-2">
                  <i className={`${getDateIcon(selectedDate)} text-info mr-2`}></i>
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
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Month & Year
                    </span>
                    <span className="text-sm font-weight-medium text-gray-800">
                      {getMonthYear(selectedDate)}
                    </span>
                  </div>
                </div>

                {/* Date Tips */}
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="d-flex align-items-start">
                    <i className="fas fa-info-circle text-info mr-2 mt-1"></i>
                    <div className="text-xs text-gray-700">
                      {getRelativeDate(selectedDate) === 'Today' && 
                        'Budget starts today. Transactions will be tracked immediately.'}
                      {getRelativeDate(selectedDate) === 'Tomorrow' && 
                        'Budget starts tomorrow. Perfect for planning ahead.'}
                      {getRelativeDate(selectedDate).includes('In') && 
                        'Future start date. Budget tracking begins on this date.'}
                      {getRelativeDate(selectedDate).includes('ago') && 
                        'Past date selected. Useful for retroactive budget tracking.'}
                      {!['Today', 'Tomorrow'].includes(getRelativeDate(selectedDate)) && 
                       !getRelativeDate(selectedDate).includes('In') &&
                       !getRelativeDate(selectedDate).includes('ago') &&
                        'Selected start date for your budget period.'}
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
          Select when this budget period begins
        </small>
      </div>
    </div>
  );
});

DateSelector.displayName = 'DateSelector';

export default DateSelector;
