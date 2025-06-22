import React, { useState, useEffect, FC } from "react";
import { Link } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "../../../utils/highchartsInit";
import { formatCurrency, formatDate, formatPercentage } from "../../../utils/helpers";

interface ReportUsageData {
  id: string;
  user_id: string;
  user_name: string;
  report_type: string;
  date_generated: string;
  view_count: number;
  export_count: number;
  time_spent: number;
  last_viewed: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
  updated_at: string;
  is_system: boolean;
  is_active: boolean;
}

interface UsageStats {
  total_reports_generated: number;
  total_exports: number;
  most_popular_report: string;
  active_users: number;
  avg_time_spent: number;
}

const AdminReports: FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [reportUsage, setReportUsage] = useState<ReportUsageData[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // Report types available in the system
  const reportTypes = ["spending", "income-expense", "trends", "goals", "predictions", "tax"];

  useEffect(() => {
    fetchReportData();
  }, [selectedReportType, dateRange, searchTerm, currentPage]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // In a real app, these would be API calls to the backend
      // For demo purposes, we'll generate mock data
      
      // Mock report usage data
      const mockReportUsage = Array(45).fill(null).map((_, index) => {
        const reportType = reportTypes[Math.floor(Math.random() * reportTypes.length)];
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const viewCount = Math.floor(Math.random() * 50) + 1;
        const exportCount = Math.floor(Math.random() * viewCount);
        const timeSpent = Math.floor(Math.random() * 300) + 30; // seconds
        
        const lastViewDate = new Date(date);
        lastViewDate.setDate(lastViewDate.getDate() + Math.floor(Math.random() * 10));
        
        return {
          id: `report-${index + 1}`,
          user_id: `user-${Math.floor(Math.random() * 20) + 1}`,
          user_name: `User ${Math.floor(Math.random() * 20) + 1}`,
          report_type: reportType,
          date_generated: date.toISOString(),
          view_count: viewCount,
          export_count: exportCount,
          time_spent: timeSpent,
          last_viewed: lastViewDate.toISOString()
        };
      });
      
      // Mock report templates
      const mockTemplates = reportTypes.map((type, index) => {
        const createdDate = new Date();
        createdDate.setMonth(createdDate.getMonth() - Math.floor(Math.random() * 6));
        
        const updatedDate = new Date(createdDate);
        updatedDate.setDate(updatedDate.getDate() + Math.floor(Math.random() * 30));
        
        return {
          id: `template-${index + 1}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
          description: `Standard ${type} analysis report template`,
          type: type,
          created_at: createdDate.toISOString(),
          updated_at: updatedDate.toISOString(),
          is_system: index < 4, // First 4 are system templates
          is_active: Math.random() > 0.1 // 90% are active
        };
      });
      
      // Add a couple custom templates
      mockTemplates.push({
        id: `template-${reportTypes.length + 1}`,
        name: "Annual Financial Summary",
        description: "Comprehensive yearly financial analysis",
        type: "custom",
        created_at: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
        is_system: false,
        is_active: true
      });
      
      mockTemplates.push({
        id: `template-${reportTypes.length + 2}`,
        name: "Budget vs Actual Performance",
        description: "Comparative analysis of budgeted vs actual spending",
        type: "custom",
        created_at: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        updated_at: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
        is_system: false,
        is_active: true
      });
      
      // Filter data based on search and filters
      let filteredData = [...mockReportUsage];
      
      // Filter by report type
      if (selectedReportType !== "all") {
        filteredData = filteredData.filter(item => item.report_type === selectedReportType);
      }
      
      // Filter by date range
      if (dateRange.start) {
        filteredData = filteredData.filter(
          item => new Date(item.date_generated) >= new Date(dateRange.start)
        );
      }
      
      if (dateRange.end) {
        filteredData = filteredData.filter(
          item => new Date(item.date_generated) <= new Date(dateRange.end)
        );
      }
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          item => 
            item.user_name.toLowerCase().includes(term) || 
            item.report_type.toLowerCase().includes(term)
        );
      }
      
      // Calculate usage statistics
      let mostPopularType = "";
      let maxCount = 0;
      
      const typeCounts: { [key: string]: number } = {};
      mockReportUsage.forEach(item => {
        typeCounts[item.report_type] = (typeCounts[item.report_type] || 0) + 1;
        if (typeCounts[item.report_type] > maxCount) {
          maxCount = typeCounts[item.report_type];
          mostPopularType = item.report_type;
        }
      });
      
      const totalExports = mockReportUsage.reduce((sum, item) => sum + item.export_count, 0);
      const avgTimeSpent = mockReportUsage.reduce((sum, item) => sum + item.time_spent, 0) / 
                           mockReportUsage.length;
      
      const uniqueUsers = new Set(mockReportUsage.map(item => item.user_id)).size;
      
      setUsageStats({
        total_reports_generated: mockReportUsage.length,
        total_exports: totalExports,
        most_popular_report: mostPopularType.charAt(0).toUpperCase() + mostPopularType.slice(1),
        active_users: uniqueUsers,
        avg_time_spent: avgTimeSpent
      });
      
      // Pagination
      const indexOfLastItem = currentPage * itemsPerPage;
      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
      const paginatedData = filteredData.slice(indexOfFirstItem, indexOfLastItem);
      
      setReportUsage(paginatedData);
      setReportTemplates(mockTemplates);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching report data:", error);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleTemplateEdit = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setSelectedTemplate(null);
  };

  const saveTemplate = () => {
    // This would save the template in a real app
    alert("Template saved successfully!");
    closeTemplateModal();
  };

  const toggleTemplateStatus = (templateId: string, isActive: boolean) => {
    // Update template status in a real app
    setReportTemplates(prev => 
      prev.map(t => t.id === templateId ? { ...t, is_active: isActive } : t)
    );
  };

  // Chart configurations
  const getReportTypeDistributionChart = () => {
    const reportTypeCounts: { [key: string]: number } = {};
    
    reportUsage.forEach(item => {
      reportTypeCounts[item.report_type] = (reportTypeCounts[item.report_type] || 0) + 1;
    });
    
    const chartData = Object.keys(reportTypeCounts).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      y: reportTypeCounts[type]
    }));
    
    return {
      chart: {
        type: "pie",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Report Types Distribution"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f} %"
          }
        }
      },
      series: [
        {
          name: "Reports",
          colorByPoint: true,
          data: chartData
        }
      ]
    };
  };

  const getReportUsageTrendChart = () => {
    // Group by date (simplified for demo)
    const dateGroups: { [key: string]: number } = {};
    
    reportUsage.forEach(item => {
      const date = item.date_generated.split('T')[0];
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    
    return {
      chart: {
        type: "line",
        height: 300
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Report Generation Trends"
      },
      xAxis: {
        categories: sortedDates,
        labels: {
          rotation: -45,
          style: {
            fontSize: '10px'
          }
        }
      },
      yAxis: {
        title: {
          text: "Reports Generated"
        }
      },
      series: [
        {
          name: "Reports",
          data: sortedDates.map(date => dateGroups[date]),
          color: "#4e73df"
        }
      ]
    };
  };

  if (loading && !usageStats) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-gray-600">Loading report management data...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">System Reports</h1>
        <div>
          <button className="btn btn-sm btn-success shadow-sm mr-2">
            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Create Report Template
          </button>
          <button className="btn btn-sm btn-primary shadow-sm">
            <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Usage Data
          </button>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="row">
        {/* Total Reports Generated */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Reports Generated
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {usageStats?.total_reports_generated || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-file-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Stats */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Exports
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {usageStats?.total_exports || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-download fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Most Popular Report */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Most Popular Report
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {usageStats?.most_popular_report || "N/A"}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-pie fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Active Users
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {usageStats?.active_users || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="row">
        {/* Report Types Distribution Chart */}
        <div className="col-xl-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Report Type Distribution</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getReportTypeDistributionChart()} />
            </div>
          </div>
        </div>

        {/* Report Usage Trend Chart */}
        <div className="col-xl-6 mb-4">
          <div className="card shadow">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">Report Generation Trends</h6>
            </div>
            <div className="card-body">
              <HighchartsReact highcharts={Highcharts} options={getReportUsageTrendChart()} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">Filter Reports</h6>
        </div>
        <div className="card-body">
          <div className="row align-items-center">
            {/* Search */}
            <div className="col-md-4 mb-3">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-light border-0 small"
                    placeholder="Search reports or users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <div className="input-group-append">
                    <button className="btn btn-danger" type="submit">
                      <i className="fas fa-search fa-sm"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Report Type Filter */}
            <div className="col-md-2 mb-3">
              <select
                className="form-control"
                value={selectedReportType}
                onChange={e => {
                  setSelectedReportType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Report Types</option>
                {reportTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="col-md-2 mb-3">
              <input
                type="date"
                className="form-control"
                placeholder="Start Date"
                value={dateRange.start}
                onChange={e => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="col-md-2 mb-3">
              <input
                type="date"
                className="form-control"
                placeholder="End Date"
                value={dateRange.end}
                onChange={e => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Reset Filters */}
            <div className="col-md-2 mb-3">
              <button
                className="btn btn-secondary btn-block"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedReportType("all");
                  setDateRange({ start: "", end: "" });
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-sync-alt fa-sm mr-1"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Usage Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">Report Usage Analytics</h6>
          <div className="dropdown no-arrow">
            <a
              className="dropdown-toggle"
              href="#"
              role="button"
              id="dropdownMenuLink"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <i className="fas fa-ellipsis-v fa-sm fa-fw text-gray-400"></i>
            </a>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Report Type</th>
                  <th>Generated Date</th>
                  <th>Views</th>
                  <th>Exports</th>
                  <th>Time Spent</th>
                  <th>Last Viewed</th>
                </tr>
              </thead>
              <tbody>
                {reportUsage.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">No report usage data found</td>
                  </tr>
                ) : (
                  reportUsage.map(report => (
                    <tr key={report.id}>
                      <td>{report.user_name}</td>
                      <td>
                        <span className={`badge badge-${
                          report.report_type === "spending" ? "danger" :
                          report.report_type === "income-expense" ? "success" :
                          report.report_type === "trends" ? "info" :
                          report.report_type === "goals" ? "warning" :
                          report.report_type === "predictions" ? "primary" : "secondary"
                        }`}>
                          {report.report_type}
                        </span>
                      </td>
                      <td>{formatDate(report.date_generated)}</td>
                      <td>{report.view_count}</td>
                      <td>{report.export_count}</td>
                      <td>{Math.floor(report.time_spent / 60)}m {report.time_spent % 60}s</td>
                      <td>{formatDate(report.last_viewed)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <nav aria-label="Report usage pagination" className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
              </li>
              {[...Array(5)].map((_, i) => {
                const pageNum = currentPage - 2 + i;
                if (pageNum > 0 && pageNum <= Math.ceil(reportUsage.length / itemsPerPage)) {
                  return (
                    <li
                      key={i}
                      className={`page-item ${currentPage === pageNum ? "active" : ""}`}
                    >
                      <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                        {pageNum}
                      </button>
                    </li>
                  );
                }
                return null;
              })}
              <li className={`page-item ${currentPage === Math.ceil(reportUsage.length / itemsPerPage) ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Report Templates Card */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 admin-card-header">
          <h6 className="m-0 font-weight-bold text-danger">Report Templates</h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing="0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>System Template</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportTemplates.map(template => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>
                      <span className={`badge badge-${
                        template.type === "spending" ? "danger" :
                        template.type === "income-expense" ? "success" :
                        template.type === "trends" ? "info" :
                        template.type === "goals" ? "warning" :
                        template.type === "predictions" ? "primary" : "secondary"
                      }`}>
                        {template.type}
                      </span>
                    </td>
                    <td>{template.description}</td>
                    <td>{formatDate(template.created_at)}</td>
                    <td>{formatDate(template.updated_at)}</td>
                    <td>
                      <div className="custom-control custom-switch">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id={`status-${template.id}`}
                          checked={template.is_active}
                          onChange={() => toggleTemplateStatus(template.id, !template.is_active)}
                        />
                        <label className="custom-control-label" htmlFor={`status-${template.id}`}>
                          {template.is_active ? "Active" : "Inactive"}
                        </label>
                      </div>
                    </td>
                    <td>
                      {template.is_system ? (
                        <span className="badge badge-info">System</span>
                      ) : (
                        <span className="badge badge-secondary">Custom</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary mr-1"
                        onClick={() => handleTemplateEdit(template)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {!template.is_system && (
                        <button className="btn btn-sm btn-outline-danger">
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Template Edit Modal */}
      {showTemplateModal && selectedTemplate && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            backgroundColor: "rgba(0, 0, 0, 0.5)"
          }}
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedTemplate.is_system ? "View" : "Edit"} Template: {selectedTemplate.name}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeTemplateModal}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="form-group">
                    <label>Template Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedTemplate.name}
                      readOnly={selectedTemplate.is_system}
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="form-control"
                      value={selectedTemplate.type}
                      disabled={selectedTemplate.is_system}
                    >
                      {reportTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={selectedTemplate.description}
                      readOnly={selectedTemplate.is_system}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="template-active"
                        checked={selectedTemplate.is_active}
                      />
                      <label className="custom-control-label" htmlFor="template-active">
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle mr-1"></i>
                    {selectedTemplate.is_system ? (
                      "System templates cannot be modified, but can be enabled/disabled."
                    ) : (
                      "Custom templates can be fully edited and configured."
                    )}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeTemplateModal}
                >
                  Close
                </button>
                {!selectedTemplate.is_system && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveTemplate}
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports; 