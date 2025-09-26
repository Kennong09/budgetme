import React, { FC, useState, useEffect } from 'react';

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

  // Get categories based on transaction type (contributions use expense categories)
  const categories = transactionType === 'income' ? incomeCategories : expenseCategories;

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected category when selectedCategoryId changes
  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategoryId);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId, categories]);

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

  return (
    <div className={`form-group selector-container ${className}`}>
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
  );
};

export default CategorySelector;