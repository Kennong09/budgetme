import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface CategorySelectorProps {
  selectedCategoryId: string;
  onCategorySelect: (category: Category | null) => void;
  transactionType: 'income' | 'expense' | 'contribution';
  incomeCategories: Category[];
  expenseCategories: Category[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  showIcons?: boolean;
}

const CategorySelector: FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategorySelect,
  transactionType,
  incomeCategories,
  expenseCategories,
  required = false,
  disabled = false,
  className = "",
  label = "Category",
  showIcons = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Get categories based on transaction type (contributions use expense categories)
  const categories = transactionType === 'income' ? incomeCategories : expenseCategories;

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected category when selectedCategoryId changes
  useEffect(() => {
    console.log('🏷️ CategorySelector: selectedCategoryId prop changed', {
      selectedCategoryId,
      categoriesLength: categories.length,
      transactionType
    });
    
    if (selectedCategoryId && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategoryId);
      console.log('🏷️ CategorySelector: Found category for selectedCategoryId', {
        selectedCategoryId,
        foundCategory: category ? { id: category.id, name: category.category_name } : null,
        allCategories: categories.map(cat => ({ id: cat.id, name: cat.category_name }))
      });
      setSelectedCategory(category || null);
    } else {
      console.log('🏷️ CategorySelector: Clearing selected category', {
        selectedCategoryId,
        categoriesLength: categories.length
      });
      setSelectedCategory(null);
    }
  }, [selectedCategoryId, categories, transactionType]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    onCategorySelect(category);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedCategory(null);
    onCategorySelect(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getIconForCategory = (categoryName: string): string => {
    const iconMap: { [key: string]: string } = {
      // Income categories
      'Salary': 'fas fa-briefcase',
      'Freelance': 'fas fa-laptop-code',
      'Investment': 'fas fa-chart-line',
      'Business': 'fas fa-building',
      'Rental': 'fas fa-home',
      'Gift': 'fas fa-gift',
      'Bonus': 'fas fa-star',
      'Other Income': 'fas fa-plus-circle',
      
      // Expense categories
      'Food': 'fas fa-utensils',
      'Transportation': 'fas fa-car',
      'Housing': 'fas fa-home',
      'Utilities': 'fas fa-bolt',
      'Healthcare': 'fas fa-heartbeat',
      'Entertainment': 'fas fa-film',
      'Shopping': 'fas fa-shopping-bag',
      'Education': 'fas fa-graduation-cap',
      'Insurance': 'fas fa-shield-alt',
      'Debt Payment': 'fas fa-credit-card',
      'Savings': 'fas fa-piggy-bank',
      'Other Expense': 'fas fa-minus-circle',
    };
    
    return iconMap[categoryName] || 'fas fa-tag';
  };

  // Mobile modal handlers
  const handleMobileOpen = () => {
    setIsMobileModalOpen(true);
    setSearchTerm("");
  };

  const handleMobileClose = () => {
    setIsMobileModalOpen(false);
    setSearchTerm("");
  };

  const handleMobileCategorySelect = (category: Category) => {
    handleCategorySelect(category);
    setIsMobileModalOpen(false);
  };

  // Get type color classes
  const getTypeColor = () => {
    if (transactionType === 'income') return { bg: 'emerald', text: 'emerald' };
    if (transactionType === 'contribution') return { bg: 'blue', text: 'blue' };
    return { bg: 'amber', text: 'amber' };
  };

  const typeColor = getTypeColor();

  // Mobile Modal Component
  const MobileCategoryModal = () => {
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
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <i className={`fas fa-tag text-xs ${
                transactionType === 'income' ? 'text-emerald-500' : 
                transactionType === 'contribution' ? 'text-blue-500' : 'text-amber-500'
              }`}></i>
              Select {transactionType === 'contribution' ? 'Expense' : transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Category
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          {/* Search */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          {/* Category List */}
          <div className="overflow-y-auto max-h-[60vh] pb-4">
            {filteredCategories.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <i className="fas fa-search text-gray-300 text-2xl mb-2"></i>
                <p className="text-sm text-gray-500">No categories found</p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                      selectedCategory?.id === category.id 
                        ? `bg-${typeColor.bg}-50 border-${typeColor.bg}-300 shadow-sm` 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                    onClick={() => handleMobileCategorySelect(category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          selectedCategory?.id === category.id 
                            ? transactionType === 'income' ? 'bg-emerald-500' :
                              transactionType === 'contribution' ? 'bg-blue-500' : 'bg-amber-500'
                            : 'bg-gray-100'
                        }`}>
                          <i className={`${getIconForCategory(category.category_name)} text-xs ${
                            selectedCategory?.id === category.id ? 'text-white' : 'text-gray-500'
                          }`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold truncate block ${
                            selectedCategory?.id === category.id 
                              ? transactionType === 'income' ? 'text-emerald-700' :
                                transactionType === 'contribution' ? 'text-blue-700' : 'text-amber-700'
                              : 'text-gray-800'
                          }`}>
                            {category.category_name}
                          </span>
                          <p className="text-[10px] text-gray-500 capitalize">
                            {transactionType === 'contribution' ? 'expense' : transactionType} category
                          </p>
                        </div>
                      </div>
                      {selectedCategory?.id === category.id && (
                        <i className={`fas fa-check-circle text-sm ${
                          transactionType === 'income' ? 'text-emerald-500' :
                          transactionType === 'contribution' ? 'text-blue-500' : 'text-amber-500'
                        }`}></i>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={`form-group selector-container ${className}`}>
      {/* ===== MOBILE VIEW ===== */}
      <div className="block md:hidden">
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        {/* Mobile Selector Button */}
        <div
          className={`flex items-center justify-between p-2.5 bg-white border rounded-xl transition-all active:scale-[0.99] ${
            disabled ? 'opacity-50 bg-gray-50' : 'hover:border-indigo-300'
          } ${selectedCategory 
            ? transactionType === 'income' ? 'border-emerald-200' :
              transactionType === 'contribution' ? 'border-blue-200' : 'border-amber-200'
            : 'border-gray-200'}`}
          onClick={() => !disabled && handleMobileOpen()}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                transactionType === 'income' ? 'bg-emerald-100' :
                transactionType === 'contribution' ? 'bg-blue-100' : 'bg-amber-100'
              }`}>
                <i className={`${getIconForCategory(selectedCategory.category_name)} text-xs ${
                  transactionType === 'income' ? 'text-emerald-500' :
                  transactionType === 'contribution' ? 'text-blue-500' : 'text-amber-500'
                }`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{selectedCategory.category_name}</span>
                <span className={`text-[10px] font-medium ${
                  transactionType === 'income' ? 'text-emerald-600' :
                  transactionType === 'contribution' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {transactionType === 'income' ? 'Income' : 
                   transactionType === 'contribution' ? 'Contribution' : 'Expense'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">
              Select {transactionType === 'contribution' ? 'expense' : transactionType} category
            </span>
          )}
          
          <div className="flex items-center gap-1.5">
            {selectedCategory && !disabled && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
          </div>
        </div>

        {/* Mobile Selected Category Details Card */}
        {selectedCategory && (
          <div className={`mt-2 p-2.5 rounded-xl border ${
            transactionType === 'income' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100' :
            transactionType === 'contribution' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100' :
            'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                transactionType === 'income' ? 'bg-emerald-100' :
                transactionType === 'contribution' ? 'bg-blue-100' : 'bg-amber-100'
              }`}>
                <i className={`fas ${
                  transactionType === 'income' ? 'fa-plus-circle text-emerald-600' : 
                  transactionType === 'contribution' ? 'fa-flag text-blue-600' : 'fa-minus-circle text-amber-600'
                } text-xs`}></i>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Category Type</p>
                <p className={`text-xs font-bold ${
                  transactionType === 'income' ? 'text-emerald-600' :
                  transactionType === 'contribution' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {transactionType === 'income' ? 'Revenue Source' : 
                   transactionType === 'contribution' ? 'Goal Contribution' : 'Expense Category'}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-1.5">
          Categorize your {transactionType === 'contribution' ? 'contribution' : transactionType}
        </p>

        {/* Mobile Modal */}
        <MobileCategoryModal />
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        <label className="font-weight-bold text-gray-800">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        
        <div className="position-relative">
          {/* Selected Category Display */}
          <div
            className={`d-flex align-items-center justify-content-between px-3 py-2 border bg-white ${
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
            {selectedCategory ? (
              <div className="d-flex align-items-center">
                <div>
                  <div className="font-weight-medium text-gray-800">
                    {selectedCategory.category_name}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted">Select {transactionType === 'contribution' ? 'expense' : transactionType} category</span>
            )}
            
            <div className="d-flex align-items-center">
              {selectedCategory && !disabled && (
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
              <div className="p-3 border-bottom">
                <input
                  type="text"
                  className="px-3 py-2 w-100 border"
                  placeholder={`Search ${transactionType === 'contribution' ? 'expense' : transactionType} categories...`}
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

              {/* Category Options */}
              <div className="py-1">
                {filteredCategories.length === 0 ? (
                  <div className="px-3 py-2 text-muted text-center">
                    No {transactionType === 'contribution' ? 'expense' : transactionType} categories found
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className={`px-3 py-2 d-flex align-items-center ${
                        selectedCategory?.id === category.id ? 'bg-primary text-white' : ''
                      }`}
                      onClick={() => handleCategorySelect(category)}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory?.id !== category.id) {
                          e.currentTarget.style.backgroundColor = '#f8f9fc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory?.id !== category.id) {
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      <div className="flex-grow-1">
                        <div className="font-weight-medium">
                          {category.category_name}
                        </div>
                      </div>
                      {selectedCategory?.id === category.id && (
                        <i className="fas fa-check text-white"></i>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {selectedCategory && (
          <div className="card mt-3 border-left-primary">
            <div className="card-body py-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="d-flex align-items-center mb-2">
                    <div>
                      <div className="font-weight-bold text-gray-800">
                        {selectedCategory.category_name}
                        <span className={`badge ml-2 ${
                          transactionType === 'income' ? 'badge-success' : 
                          transactionType === 'contribution' ? 'badge-info' : 'badge-warning'
                        }`}>
                          <i className={`fas ${
                            transactionType === 'income' ? 'fa-plus-circle' : 
                            transactionType === 'contribution' ? 'fa-flag' : 'fa-minus-circle'
                          } mr-1`}></i>
                          {transactionType === 'income' ? 'Income' : 
                           transactionType === 'contribution' ? 'Contribution' : 'Expense'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedCategory.category_name} Category
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                      Category Type
                    </span>
                    <span className={`font-weight-bold ${
                      transactionType === 'income' ? 'text-success' : 
                      transactionType === 'contribution' ? 'text-info' : 'text-warning'
                    }`}>
                      {transactionType === 'income' ? 'Revenue Source' : 
                       transactionType === 'contribution' ? 'Goal Contribution' : 'Expense Category'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySelector;