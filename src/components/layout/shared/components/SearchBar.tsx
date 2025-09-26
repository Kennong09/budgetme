import React, { FC, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../utils/AuthContext";
import { SearchService, SearchResult } from "../../../../services/database/searchService";
import { formatCurrency } from "../../../../utils/helpers";

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  variant?: "user" | "admin";
  showMobileVersion?: boolean;
  mobileSearchOpen?: boolean;
  onMobileToggle?: () => void;
  style?: React.CSSProperties;
  enableAutoComplete?: boolean;
  showResults?: boolean;
}

const SearchBar: FC<SearchBarProps> = ({
  placeholder = "Search transactions, budgets, goals...",
  onSearch,
  className = "",
  variant = "user",
  showMobileVersion = false,
  mobileSearchOpen = false,
  onMobileToggle,
  style = {},
  enableAutoComplete = true,
  showResults = true
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchService = SearchService.getInstance();
  
  // Debounced search
  useEffect(() => {
    if (!enableAutoComplete || !searchQuery.trim() || !user?.id) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await searchService.search(searchQuery, user.id, {
          limit: 8
        });
        if (response.success) {
          setSearchResults(response.results);
          setShowDropdown(response.results.length > 0 && showResults);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, enableAutoComplete, showResults, user?.id]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        } else {
          handleSubmit(e as any);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const path = SearchService.getNavigationPath(result);
    navigate(path);
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0 && showResults) {
      setShowDropdown(true);
    }
  };

  const renderSearchResult = (result: SearchResult, index: number) => (
    <button
      key={`${result.type}-${result.id}`}
      type="button"
      className={`dropdown-item d-flex align-items-center py-2 px-3 ${
        index === selectedIndex ? 'bg-light' : ''
      }`}
      onClick={() => handleResultClick(result)}
      onMouseEnter={() => setSelectedIndex(index)}
    >
      <div className="mr-3">
        <div className={`icon-circle bg-light ${result.color}`}>
          <i className={result.icon}></i>
        </div>
      </div>
      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="font-weight-bold text-dark">{result.title}</div>
            {result.subtitle && (
              <div className="small text-muted">{result.subtitle}</div>
            )}
            {result.description && (
              <div className="small text-secondary">{result.description}</div>
            )}
          </div>
          {result.amount && (
            <div className={`text-right ${result.color}`}>
              <div className="font-weight-bold">
                {formatCurrency(result.amount, result.currency)}
              </div>
              <div className="small text-muted text-capitalize">
                {result.type}
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );

  const buttonColorClass = variant === "admin" ? "btn-danger" : "btn-primary";
  const inputClass = showMobileVersion ? "" : "d-none d-sm-inline-block";

  // Mobile search dropdown version
  if (showMobileVersion && mobileSearchOpen) {
    return (
      <div className="position-relative" ref={searchRef}>
        <div
          className="dropdown-menu dropdown-menu-right p-3 shadow animated--grow-in show position-absolute"
          style={{ width: "calc(100vw - 2rem)", maxWidth: "300px", ...style }}
        >
          <form className="form-inline mr-auto w-100 navbar-search" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                ref={inputRef}
                type="text"
                className="form-control bg-light border-0 small rounded-pill"
                placeholder={placeholder}
                aria-label="Search"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                autoComplete="off"
              />
              <div className="input-group-append">
                <button 
                  className={`btn ${buttonColorClass} rounded-pill`} 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin fa-sm"></i>
                  ) : (
                    <i className="fas fa-search fa-sm"></i>
                  )}
                </button>
              </div>
            </div>
          </form>
          
          {/* Mobile Search Results */}
          {showDropdown && (
            <div className="mt-2 border-top pt-2">
              <div className="small text-muted mb-2 px-2">Search Results</div>
              <div className="search-results" style={{ maxHeight: "300px", overflowY: "auto" }}>
                {isLoading ? (
                  <div className="d-flex justify-content-center align-items-center py-3">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span className="text-muted">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, index) => renderSearchResult(result, index))
                ) : searchQuery.length > 0 ? (
                  <div className="text-center py-3 text-muted">
                    <i className="fas fa-search fa-2x mb-2 opacity-50"></i>
                    <p className="mb-0">No results found for "{searchQuery}"</p>
                    <small>Try different keywords</small>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile search toggle button
  if (showMobileVersion && !mobileSearchOpen) {
    return (
      <button
        className="nav-link btn btn-link"
        type="button"
        onClick={onMobileToggle}
        aria-expanded={mobileSearchOpen}
        aria-label="Toggle search"
      >
        <i className="fas fa-search fa-fw"></i>
      </button>
    );
  }

  // Desktop search form
  return (
    <div className={`position-relative ${inputClass} form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="w-100" style={style}>
        <div className="input-group">
          <input
            ref={inputRef}
            type="text"
            className="form-control bg-light border-0 small rounded-pill shadow-sm"
            placeholder={placeholder}
            aria-label="Search"
            aria-describedby="basic-addon2"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            autoComplete="off"
          />
          <div className="input-group-append">
            <button 
              className={`btn ${buttonColorClass} rounded-pill`} 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin fa-sm"></i>
              ) : (
                <i className="fas fa-search fa-sm"></i>
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Desktop Search Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="dropdown-menu show position-absolute shadow"
          style={{
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1050
          }}
        >
          <div className="dropdown-header d-flex justify-content-between align-items-center">
            <span>Search Results</span>
            <small className="text-muted">{searchResults.length} found</small>
          </div>
          <div className="search-results">
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center py-4 search-loading">
                <i className="fas fa-spinner fa-spin fa-lg mr-2"></i>
                <span className="text-muted">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result, index) => renderSearchResult(result, index))
            ) : searchQuery.length > 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-search fa-2x mb-2 opacity-50"></i>
                <p className="mb-0">No results found for "{searchQuery}"</p>
                <small>Try different keywords</small>
              </div>
            ) : null}
          </div>
          {searchResults.length >= 8 && (
            <div className="dropdown-item text-center small text-muted">
              Showing first 8 results. Refine your search for more specific results.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;