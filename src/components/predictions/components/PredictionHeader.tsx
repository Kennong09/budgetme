import React, { FC } from "react";
import { PredictionHeaderProps } from "../types";

const PredictionHeader: FC<PredictionHeaderProps> = ({
  showModelDetails,
  onToggleModelDetails,
  onExportCSV
}) => {
  return (
    <div className="d-sm-flex align-items-center justify-content-between mb-4">
      <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
        AI Financial Predictions
      </h1>
      <div>
        <button
          onClick={onToggleModelDetails}
          className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm mr-2 animate__animated animate__fadeIn"
        >
          <i className="fas fa-brain fa-sm text-white-50 mr-2"></i>
          AI Model Details
        </button>
        <div className="btn-group">
          <button
            onClick={onExportCSV}
            className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm animate__animated animate__fadeIn"
          >
            <i className="fas fa-download fa-sm text-white-50 mr-2"></i>
            Export to CSV
          </button>
          <button
            type="button" 
            className="btn btn-primary dropdown-toggle dropdown-toggle-split"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <span className="sr-only">Toggle Dropdown</span>
          </button>
          <div className="dropdown-menu dropdown-menu-right shadow animated--fade-in">
            <a className="dropdown-item" href="#" onClick={onExportCSV}>
              <i className="fas fa-file-csv fa-sm fa-fw mr-2 text-gray-400"></i>
              CSV
            </a>
            <a className="dropdown-item" href="#">
              <i className="fas fa-file-pdf fa-sm fa-fw mr-2 text-gray-400"></i>
              PDF
            </a>
            <a className="dropdown-item" href="#">
              <i className="fas fa-file-excel fa-sm fa-fw mr-2 text-gray-400"></i>
              Excel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionHeader;