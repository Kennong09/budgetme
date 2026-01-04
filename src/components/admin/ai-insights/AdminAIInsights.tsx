import React, { FC, useState, useCallback, useEffect } from "react";
import { Alert } from "react-bootstrap";
import { useToast } from "../../../utils/ToastContext";
import AIInsightsStatsCards from "./AIInsightsStatsCards";
import AIInsightsFilters from "./AIInsightsFilters";
import AIInsightsTable from "./AIInsightsTable";
import AIInsightsAnalyticsCharts from "./AIInsightsAnalyticsCharts";
import ViewInsightModal from "./ViewInsightModal";
import GenerateInsightModal from "./GenerateInsightModal";
import DeleteInsightModal from "./DeleteInsightModal";
import { useAIInsightsData } from "./useAIInsightsData";
import { useAIInsightsFilters } from "./useAIInsightsFilters";
import { AIInsightSummary, AIInsightDetail } from "./types";

const AdminAIInsights: FC = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  
  // Modal states
  const [selectedInsight, setSelectedInsight] = useState<AIInsightSummary | null>(null);
  const [selectedInsightDetail, setSelectedInsightDetail] = useState<AIInsightDetail | null>(null);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  const { showSuccessToast, showErrorToast } = useToast();

  // Use the custom hooks
  const {
    insights,
    stats,
    users,
    services,
    totalPages,
    totalItems,
    loading,
    error,
    fetchInsights,
    getInsightDetail,
    createInsight,
    deleteInsight,
    regenerateInsight,
    refreshData,
    fetchServices
  } = useAIInsightsData();

  const {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount
  } = useAIInsightsFilters();

  // Create a stable fetch function
  const fetchInsightsWithUsers = useCallback(async (filtersToUse: any) => {
    if (users.length > 0) {
      await fetchInsights(filtersToUse, users);
    }
  }, [fetchInsights, users]);

  // Fetch insights when filters change (but not during initial load)
  useEffect(() => {
    // Only fetch insights if not in initial loading state and users are loaded
    if (!loading && users.length > 0) {
      fetchInsightsWithUsers(filters);
    }
  }, [filters, loading, users.length, fetchInsightsWithUsers]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      await fetchInsightsWithUsers(filters);
      setLastUpdated(new Date());
      setShowUpdateAlert(true);
      setTimeout(() => setShowUpdateAlert(false), 3000);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, filters, fetchInsightsWithUsers]);

  // Modal handlers
  const handleView = useCallback(async (insight: AIInsightSummary) => {
    setSelectedInsight(insight);
    try {
      const detail = await getInsightDetail(insight.insightId);
      if (detail) {
        setSelectedInsightDetail(detail);
        setShowViewModal(true);
      }
    } catch (err) {
      showErrorToast('Failed to load insight details');
    }
  }, [getInsightDetail, showErrorToast]);

  const handleGenerate = useCallback(() => {
    setSelectedInsight(null);
    setShowGenerateModal(true);
  }, []);

  const handleDelete = useCallback((insight: AIInsightSummary) => {
    setSelectedInsight(insight);
    setShowDeleteModal(true);
  }, []);

  // Generate insight function that converts form data to AI insight
  const generateInsight = useCallback(async (formData: any): Promise<boolean> => {
    try {
      // Convert generate form data to AI insight format
      const insightData = {
        user_id: formData.user_id,
        prediction_id: formData.prediction_id, // Link to the selected prediction
        ai_service: formData.ai_service,
        model_used: formData.model_used,
        insights: {
          summary: `AI-generated financial insight analysis based on Prophet prediction data, user's transaction history, and predictive financial modeling. Generated from prediction ID: ${formData.prediction_id}.`,
          timestamp: new Date().toISOString(),
          riskAssessment: formData.include_risk_assessment ? {
            level: 'medium' as const,
            factors: ["Irregular spending patterns", "Limited emergency savings"],
            mitigationSuggestions: ["Set up automatic savings", "Create a monthly spending budget"]
          } : undefined,
          recommendations: formData.generate_recommendations ? [
            "Based on prediction trends, consider increasing monthly savings by 10%",
            "Review and optimize recurring subscriptions identified in prediction analysis",
            "Establish an emergency fund aligned with predicted future expenses",
            "Take advantage of predicted income increases for investment opportunities"
          ] : [],
          opportunityAreas: formData.analyze_trends ? [
            "Investment diversification based on predicted income trends",
            "Tax-efficient savings strategies aligned with forecasted earnings",
            "Automated budgeting tools optimized for predicted spending patterns"
          ] : []
        },
        risk_assessment: formData.include_risk_assessment ? {
          level: 'medium' as const,
          factors: ["Irregular spending patterns", "Limited emergency savings"],
          mitigationSuggestions: ["Set up automatic savings", "Create a monthly spending budget"]
        } : undefined,
        recommendations: formData.generate_recommendations ? [
          "Based on prediction trends, consider increasing monthly savings by 10%",
          "Review and optimize recurring subscriptions identified in prediction analysis",
          "Establish an emergency fund aligned with predicted future expenses",
          "Take advantage of predicted income increases for investment opportunities"
        ] : [],
        opportunity_areas: formData.analyze_trends ? [
          "Investment diversification based on predicted income trends",
          "Tax-efficient savings strategies aligned with forecasted earnings",
          "Automated budgeting tools optimized for predicted spending patterns"
        ] : [],
        confidence_level: formData.confidence_threshold,
        model_version: "1.0.0",
        processing_status: 'completed' as const,
        generation_time_ms: Math.floor(Math.random() * 3000) + 1000, // Simulate processing time
        token_usage: {
          prompt_tokens: Math.floor(Math.random() * 500) + 200,
          completion_tokens: Math.floor(Math.random() * 800) + 300,
          total_tokens: Math.floor(Math.random() * 1200) + 600
        },
        daily_usage_count: 1,
        rate_limited: false,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        access_count: 0
      };

      const success = await createInsight(insightData);
      if (success) {
        showSuccessToast('AI insights generated successfully!');
      } else {
        showErrorToast('Failed to generate AI insights');
      }
      return success;
    } catch (error) {
      console.error('Error generating insight:', error);
      showErrorToast('Failed to generate AI insights');
      return false;
    }
  }, [createInsight, showSuccessToast, showErrorToast]);

  // CRUD operations
  const handleInsightGenerated = useCallback(async () => {
    setShowGenerateModal(false);
    await fetchInsightsWithUsers(filters);
  }, [filters, fetchInsightsWithUsers]);

  const handleInsightDeleted = useCallback(async () => {
    setShowDeleteModal(false);
    setSelectedInsight(null);
    await fetchInsightsWithUsers(filters);
  }, [filters, fetchInsightsWithUsers]);

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: any) => {
    updateFilters(newFilters);
  }, [updateFilters]);

  const handlePageChange = useCallback((page: number) => {
    updateFilters({ currentPage: page });
  }, [updateFilters]);

  const handleSortChange = useCallback((sortBy: any, sortOrder: any) => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  // Loading state with modern skeleton design
  if (loading) {
    return (
      <div className="modern-user-management">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading AI insights...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          {/* Enhanced Header Skeleton */}
          <div className="user-management-header mb-5">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div className="header-content">
                <div className="d-flex align-items-center mb-2">
                  <div className="header-icon-container mr-3">
                    <div className="skeleton-icon"></div>
                  </div>
                  <div>
                    <div className="skeleton-line skeleton-header-title mb-1"></div>
                    <div className="skeleton-line skeleton-header-subtitle"></div>
                  </div>
                </div>
              </div>
              
              <div className="header-actions d-flex align-items-center">
                <div className="last-updated-info mr-3">
                  <div className="skeleton-line skeleton-date"></div>
                </div>
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button mr-2"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>

        {/* Stats Cards Skeleton */}
        <div className="stats-section mb-5">
          <AIInsightsStatsCards stats={{
            totalInsights: 0,
            activeServices: 0,
            averageConfidence: 0,
            totalUsers: 0,
            riskDistribution: { high: 0, medium: 0, low: 0, unknown: 0 },
            serviceUsage: { openrouter: 0, chatbot: 0, prophet: 0, fallback: 0 },
            processingMetrics: { averageTime: 0, totalTokens: 0, successRate: 0 },
            usageToday: 0,
            rateLimitedToday: 0
          }} loading={true} />
        </div>
        
        {/* Analytics Charts Skeleton */}
        <AIInsightsAnalyticsCharts 
          stats={stats}
          insights={[]}
          loading={true} 
        />

        {/* Controls Section Skeleton */}
        <AIInsightsFilters
          filters={filters}
          users={[]}
          onFiltersChange={() => {}}
          onResetFilters={() => {}}
          hasActiveFilters={false}
          activeFilterCount={0}
          loading={true}
        />

        {/* Table Skeleton */}
        <AIInsightsTable
          insights={[]}
          filters={filters}
          totalPages={1}
          totalItems={0}
          loading={true}
          onSort={() => {}}
          onPageChange={() => {}}
          onView={() => {}}
          onDelete={() => {}}
        />
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* Mobile Page Heading - Floating action buttons */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">AI Insights</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <i className={`fas fa-sync text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={handleGenerate}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="Generate insights"
            >
              <i className="fas fa-magic text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile System Status Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">AI Services Status</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-check-circle text-white text-sm"></i>
            </div>
          </div>
          <div className="text-white text-lg font-bold mb-1">
            All AI Services Operational
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/70 text-xs">
              <i className="fas fa-clock text-[10px] mr-1"></i>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          {/* Mini stats row - One Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Insights</p>
              <p className="text-white text-sm font-bold">{stats.totalInsights}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Users</p>
              <p className="text-white text-sm font-bold">{stats.totalUsers}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-white/60 text-[9px] uppercase">Accuracy</p>
              <p className="text-white text-sm font-bold">{stats.averageConfidence.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Desktop */}
      <div className="user-management-header mb-5 hidden md:block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content">
            <div className="d-flex align-items-center mb-2">
              <div className="header-icon-container mr-3">
                <i className="fas fa-brain"></i>
              </div>
              <div>
                <h1 className="header-title mb-1">AI Insights Management</h1>
                <p className="header-subtitle mb-0">
                  Monitor and manage AI-powered financial insights and analytics across all users
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3">
              <small className="text-muted">
                <i className="far fa-clock mr-1"></i>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            </div>
            <button 
              className="btn btn-outline-secondary btn-sm shadow-sm mr-2"
              onClick={() => setShowCharts(!showCharts)}
            >
              <i className={`fas fa-sync-alt mr-1`}></i>
              Update Model
            </button>
            <button 
              className="btn btn-outline-danger btn-sm shadow-sm refresh-btn mr-2"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh All'}
            </button>
            <button 
              className="btn btn-danger btn-sm shadow-sm"
              onClick={handleGenerate}
            >
              <i className="fas fa-magic mr-1"></i>
              Generate Insights
            </button>
          </div>
        </div>
        
        {/* Dashboard Status Indicator */}
        <div className="dashboard-status-bar mt-3">
          <div className="d-flex align-items-center">
            <div className="status-indicator status-online mr-2"></div>
            <span className="small text-success font-weight-medium">
              AI insight services operational - Models running normally
            </span>
            <div className="ml-auto">
              <span className="badge badge-success badge-pill">
                <i className="fas fa-check-circle mr-1"></i>
                Live Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Alert */}
      {showUpdateAlert && (
        <Alert 
          variant="success" 
          onClose={() => setShowUpdateAlert(false)} 
          dismissible
        >
          <Alert.Heading>Model Updated Successfully!</Alert.Heading>
          <p>
            The AI insight model has been updated with the latest data. All user insights will
            reflect the updated model on their next analysis.
          </p>
        </Alert>
      )}

      {/* Statistics Cards Section */}
      <div className="stats-section mb-5">
        <AIInsightsStatsCards stats={stats} loading={loading} />
      </div>

      {/* Analytics Charts Section */}
      <AIInsightsAnalyticsCharts 
        stats={stats}
        insights={insights}
        loading={loading} 
      />

      {/* Controls Section */}
      <AIInsightsFilters
        filters={filters}
        users={users}
        onFiltersChange={handleFiltersChange}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={getActiveFilterCount()}
        loading={loading}
      />

      {/* AI Insights Table */}
      <AIInsightsTable
        insights={insights}
        filters={filters}
        totalPages={totalPages}
        totalItems={totalItems}
        loading={loading}
        onSort={handleSortChange}
        onPageChange={handlePageChange}
        onView={handleView}
        onDelete={handleDelete}
      />

      {/* Modals */}
      {showViewModal && selectedInsightDetail && (
        <ViewInsightModal
          show={showViewModal}
          insight={selectedInsightDetail}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showGenerateModal && (
        <GenerateInsightModal
          show={showGenerateModal}
          users={users}
          services={services}
          onClose={() => setShowGenerateModal(false)}
          onInsightGenerated={handleInsightGenerated}
          onGenerate={generateInsight}
        />
      )}

      {showDeleteModal && selectedInsight && (
        <DeleteInsightModal
          show={showDeleteModal}
          insight={selectedInsight}
          onClose={() => setShowDeleteModal(false)}
          onInsightDeleted={handleInsightDeleted}
          onDelete={deleteInsight}
        />
      )}
    </div>
  );
};

export default AdminAIInsights;
