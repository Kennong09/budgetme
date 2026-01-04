import React, { FC, useState } from 'react';

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ReportsDataTableProps {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  title?: string;
  searchable?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
  onRowClick?: (row: any) => void;
}

const ReportsDataTable: FC<ReportsDataTableProps> = ({
  data = [],
  columns = [],
  loading = false,
  title = "Data Table",
  searchable = true,
  pagination = true,
  itemsPerPage = 10,
  onRowClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = (data || []).filter(row =>
    Object.values(row || {}).some(value =>
      String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = pagination ? 
    sortedData.slice(startIndex, startIndex + itemsPerPage) : 
    sortedData;

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (!pagination || totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <nav aria-label="Table pagination">
        <ul className="pagination mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
          </li>
          
          {startPage > 1 && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => handlePageChange(1)}>
                  1
                </button>
              </li>
              {startPage > 2 && (
                <li className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              )}
            </>
          )}
          
          {pages.map(page => (
            <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
              <button
                className="page-link"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            </li>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <li className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              )}
              <li className="page-item">
                <button className="page-link" onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </button>
              </li>
            </>
          )}
          
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  // Mobile pagination renderer
  const renderMobilePagination = () => {
    if (!pagination || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-chevron-left text-[10px]"></i>
        </button>
        <span className="text-[10px] text-gray-600">
          Page <span className="font-semibold text-gray-800">{currentPage}</span> of <span className="font-semibold text-gray-800">{totalPages}</span>
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-chevron-right text-[10px]"></i>
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="table-section">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 animate-pulse">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="skeleton-line skeleton-table-header"></div>
                <div className="skeleton-line" style={{ width: '200px', height: '38px' }}></div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="modern-table table table-hover mb-0">
                  <thead className="table-header">
                    <tr>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <th key={index} className="border-0 py-3 px-4">
                          <div className="skeleton-line skeleton-th"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, rowIndex) => (
                      <tr key={rowIndex} className="table-row">
                        {Array.from({ length: 5 }).map((_, colIndex) => (
                          <td key={colIndex} className="py-3 px-4">
                            <div className="skeleton-line skeleton-td"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="skeleton-line" style={{ width: '150px', height: '14px' }}></div>
                <div className="skeleton-line" style={{ width: '200px', height: '32px' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-section">
      {/* Mobile Data Table - Card List View */}
      <div className="block md:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header with Search */}
          <div className="px-3 py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-table text-red-500 text-[10px]"></i>
                {title}
              </h6>
              <span className="text-[9px] text-gray-400">{filteredData.length} entries</span>
            </div>
            {searchable && (
              <div className="relative">
                <input
                  type="text"
                  className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="fas fa-search absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]"></i>
              </div>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="p-3">
            {filteredData.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-table text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No Data Available</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {searchTerm ? 'No results match your search.' : 'No data to display.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedData.map((row, index) => (
                  <div
                    key={index}
                    className={`bg-gray-50 rounded-lg p-3 ${onRowClick ? 'cursor-pointer hover:bg-gray-100 active:bg-gray-200' : ''} transition-colors`}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column, colIndex) => (
                      <div 
                        key={column.key} 
                        className={`flex items-center justify-between ${colIndex < columns.length - 1 ? 'mb-1.5' : ''}`}
                      >
                        <span className="text-[9px] text-gray-500 font-medium uppercase">{column.label}</span>
                        <span className="text-[10px] font-semibold text-gray-800 text-right max-w-[60%] truncate">
                          {column.render ? 
                            column.render(row?.[column.key], row) : 
                            String(row?.[column.key] || '-')
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {filteredData.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-center mb-2">
                <span className="text-[9px] text-gray-400">
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
                </span>
              </div>
              {renderMobilePagination()}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <h6 className="card-title mb-0 font-weight-bold text-gray-800">
                <i className="fas fa-table mr-2 text-primary"></i>
                {title}
              </h6>
              {searchable && (
                <div className="search-container" style={{ minWidth: '250px' }}>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text border-right-0 bg-white">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0 modern-input"
                      placeholder="Search data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-body p-0">
            {filteredData.length === 0 ? (
              <div className="no-data-container text-center py-5">
                <div className="no-data-icon mb-3">
                  <i className="fas fa-table fa-3x text-muted"></i>
                </div>
                <h6 className="text-muted mb-2">No Data Available</h6>
                <p className="text-muted small mb-0">
                  {searchTerm ? 'No results match your search criteria.' : 'No data to display for this report.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="modern-table table table-hover mb-0">
                  <thead className="table-header">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={`border-0 py-3 px-4 ${column.sortable ? 'sortable-header' : ''}`}
                          onClick={() => column.sortable && handleSort(column.key)}
                          style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="header-text">{column.label}</span>
                            {column.sortable && (
                              <div className="sort-icons ml-2">
                                {sortColumn === column.key ? (
                                  <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-primary`}></i>
                                ) : (
                                  <i className="fas fa-sort text-muted"></i>
                                )}
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, index) => (
                      <tr
                        key={index}
                        className={`table-row ${onRowClick ? 'clickable-row' : ''}`}
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                      >
                        {columns.map((column) => (
                          <td key={column.key} className="py-3 px-4">
                            {column.render ? 
                              column.render(row?.[column.key], row) : 
                              String(row?.[column.key] || '-')
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pagination && filteredData.length > 0 && (
            <div className="card-footer bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <div className="table-info text-muted small">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
                  {searchTerm && ` (filtered from ${data.length} total entries)`}
                </div>
                {renderPagination()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsDataTable;
