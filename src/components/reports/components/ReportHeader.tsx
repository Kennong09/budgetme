import React, { FC } from 'react';

interface ReportHeaderProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportDOCX: () => void;
}

const ReportHeader: FC<ReportHeaderProps> = ({
  onExportPDF,
  onExportCSV,
  onExportDOCX
}) => {
  return (
    <>
      {/* Desktop Header - Mobile header is handled in parent component */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
          Financial Reports
        </h1>
        <div className="dropdown">
          <button 
            className="btn btn-primary dropdown-toggle shadow-sm animate__animated animate__fadeIn"
            type="button"
            id="exportDropdown"
            data-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fas fa-download fa-sm text-white-50 mr-2"></i>Export Report
          </button>
          <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
            <button className="dropdown-item" onClick={onExportPDF}>
              <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-danger"></i>Export as PDF
            </button>
            <button className="dropdown-item" onClick={onExportCSV}>
              <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-success"></i>Export as CSV
            </button>
            <button className="dropdown-item" onClick={onExportDOCX}>
              <i className="fas fa-file-word fa-sm fa-fw mr-2 text-primary"></i>Export as Word Document
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportHeader;