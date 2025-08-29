import React, { FC, useState } from "react";

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  variant?: "user" | "admin";
  showMobileVersion?: boolean;
  mobileSearchOpen?: boolean;
  onMobileToggle?: () => void;
  style?: React.CSSProperties;
}

const SearchBar: FC<SearchBarProps> = ({
  placeholder = "Search for...",
  onSearch,
  className = "",
  variant = "user",
  showMobileVersion = false,
  mobileSearchOpen = false,
  onMobileToggle,
  style = {}
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const buttonColorClass = variant === "admin" ? "btn-danger" : "btn-primary";
  const inputClass = showMobileVersion ? "" : "d-none d-sm-inline-block";

  // Mobile search dropdown version
  if (showMobileVersion && mobileSearchOpen) {
    return (
      <div
        className="dropdown-menu dropdown-menu-right p-3 shadow animated--grow-in show position-absolute"
        style={{ width: "calc(100vw - 2rem)", maxWidth: "300px", ...style }}
      >
        <form className="form-inline mr-auto w-100 navbar-search" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              className="form-control bg-light border-0 small rounded-pill"
              placeholder={placeholder}
              aria-label="Search"
              value={searchQuery}
              onChange={handleInputChange}
            />
            <div className="input-group-append">
              <button 
                className={`btn ${buttonColorClass} rounded-pill`} 
                type="submit"
              >
                <i className="fas fa-search fa-sm"></i>
              </button>
            </div>
          </div>
        </form>
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
    <form 
      className={`${inputClass} form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search ${className}`}
      onSubmit={handleSubmit}
      style={style}
    >
      <div className="input-group">
        <input
          type="text"
          className="form-control bg-light border-0 small rounded-pill shadow-sm"
          placeholder={placeholder}
          aria-label="Search"
          aria-describedby="basic-addon2"
          value={searchQuery}
          onChange={handleInputChange}
        />
        <div className="input-group-append">
          <button 
            className={`btn ${buttonColorClass} rounded-pill`} 
            type="submit"
          >
            <i className="fas fa-search fa-sm"></i>
          </button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;