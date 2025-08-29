import React, { FC } from 'react';

interface ReportHeaderProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onEmailReport: () => void;
}

const ReportHeader: FC<ReportHeaderProps> = ({
  onExportPDF,
  onExportCSV,
  onExportExcel,
  onEmailReport
}) => {
  return (
    <div className="d-sm-flex align-items-center justify-content-between mb-4">
      <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
        Financial Reports
      </h1>
      <div className="d-flex flex-column flex-sm-row mt-3 mt-sm-0">
        <div className="dropdown mb-2 mb-sm-0 mr-0 mr-sm-2">
          <button 
            className="btn btn-primary dropdown-toggle shadow-sm animate__animated animate__fadeIn w-100"
            type="button"
            id="exportDropdown"
            data-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fas fa-download fa-sm text-white-50 mr-2"></i>Export
          </button>
          <div className="dropdown-menu dropdown-menu-right shadow" aria-labelledby="exportDropdown">
            <button className="dropdown-item" onClick={onExportPDF}>
              <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-gray-400"></i>PDF
            </button>
            <button className="dropdown-item" onClick={onExportCSV}>
              <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-gray-400"></i>CSV
            </button>
            <button className="dropdown-item" onClick={onExportExcel}>
              <i className="fas fa-file-excel fa-sm fa-fw mr-2 text-gray-400"></i>Excel
            </button>
          </div>
        </div>
        <button
          onClick={onEmailReport}
          className="btn btn-secondary shadow-sm animate__animated animate__fadeIn w-100 w-sm-auto"
        >
          <i className="fas fa-envelope fa-sm text-white-50 mr-2"></i>Email
        </button>
      </div>
    </div>
  );
};

export default ReportHeader;