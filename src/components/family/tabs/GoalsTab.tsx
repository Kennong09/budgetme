import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type HighchartsReact from 'highcharts-react-official';
import { Goal } from '../types';
import { formatCurrency, formatDate, formatPercentage } from '../../../utils/helpers';
import { ContributionChart } from '../charts';
import ContributionTimeline from '../components/ContributionTimeline';
import './family-goals-pagination.css';

interface GoalsTabProps {
  familyGoals: Goal[];
  isCreator: boolean;
  loadingFamilyGoals: boolean;
  selectedGoalForContributions: string | null;
  loadingContributions: boolean;
  goalContributions: any[];
  contributionChartData: any;
  contributionPieChartData: any;
  contributionBarChartRef: React.RefObject<HighchartsReact.RefObject>;
  contributionPieChartRef: React.RefObject<HighchartsReact.RefObject>;
  openContributeModal: (goal: Goal) => void;
  fetchGoalContributions: (goalId: string) => void;
  toggleTip: (tipId: string, event?: React.MouseEvent) => void;
  getRemainingDays: (targetDate: string) => number;
  onRefresh?: () => void;
}

// Mobile Goal Card Component
const MobileGoalCard: React.FC<{
  goal: Goal;
  getRemainingDays: (targetDate: string) => number;
  openContributeModal: (goal: Goal) => void;
  fetchGoalContributions: (goalId: string) => void;
  loadingContributions: boolean;
  selectedGoalForContributions: string | null;
}> = ({ goal, getRemainingDays, openContributeModal, fetchGoalContributions, loadingContributions, selectedGoalForContributions }) => {
  const progressPercentage = goal.percentage || 0;
  const remainingDays = getRemainingDays(goal.target_date || goal.deadline);
  const isCompleted = goal.status === "completed" || progressPercentage >= 100;
  
  const getStatusColor = () => {
    if (isCompleted) return 'emerald';
    if (progressPercentage >= 75) return 'blue';
    if (progressPercentage >= 50) return 'indigo';
    if (progressPercentage >= 25) return 'amber';
    return 'rose';
  };
  
  const statusColor = getStatusColor();

  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-800 truncate">{goal.goal_name}</h4>
          <p className="text-[10px] text-gray-500">{goal.owner_name || 'Family Member'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
          goal.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
          goal.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
          goal.status === 'not_started' ? 'bg-gray-100 text-gray-600' :
          'bg-rose-100 text-rose-600'
        }`}>
          {goal.status === 'not_started' ? 'Not Started' : 
           goal.status === 'in_progress' ? 'In Progress' : 
           goal.status === 'completed' ? 'Completed' : 'Cancelled'}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-gray-500">Progress</span>
          <span className={`font-semibold text-${statusColor}-600`}>{formatPercentage(progressPercentage)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 bg-${statusColor}-500`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
      </div>
      
      {/* Goal details */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Target</p>
          <p className="text-xs font-semibold text-gray-800">{formatCurrency(goal.target_amount)}</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Saved</p>
          <p className="text-xs font-semibold text-emerald-600">{formatCurrency(goal.current_amount)}</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-400 uppercase">Days Left</p>
          <p className={`text-xs font-semibold ${remainingDays <= 30 ? 'text-rose-600' : 'text-gray-800'}`}>
            {remainingDays > 0 ? remainingDays : 'Overdue'}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => openContributeModal(goal)}
          disabled={isCompleted}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
            isCompleted 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <i className="fas fa-plus text-[8px]"></i>
          Contribute
        </button>
        <button
          onClick={() => fetchGoalContributions(goal.id)}
          disabled={loadingContributions && selectedGoalForContributions === goal.id}
          className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition-colors"
        >
          {loadingContributions && selectedGoalForContributions === goal.id ? (
            <i className="fas fa-spinner fa-spin text-[10px]"></i>
          ) : (
            <i className="fas fa-chart-bar text-[10px]"></i>
          )}
        </button>
        <Link
          to={`/goals/${goal.id}`}
          className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors"
        >
          <i className="fas fa-eye text-[10px]"></i>
        </Link>
      </div>
    </div>
  );
};

const GoalsTab: React.FC<GoalsTabProps> = ({
  familyGoals,
  isCreator,
  loadingFamilyGoals,
  selectedGoalForContributions,
  loadingContributions,
  goalContributions,
  contributionChartData,
  contributionPieChartData,
  contributionBarChartRef,
  contributionPieChartRef,
  openContributeModal,
  fetchGoalContributions,
  toggleTip,
  getRemainingDays,
  onRefresh
}) => {
  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // Get unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const owners = familyGoals
      .map(goal => ({ id: goal.user_id, name: goal.owner_name || 'Unknown' }))
      .filter((owner, index, self) => 
        index === self.findIndex(o => o.id === owner.id)
      );
    return owners;
  }, [familyGoals]);
  
  // Apply filters
  const filteredGoals = useMemo(() => {
    let filtered = [...familyGoals];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(goal => goal.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(goal => goal.priority === filterPriority);
    }
    if (filterOwner !== 'all') {
      filtered = filtered.filter(goal => goal.user_id === filterOwner);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(goal => 
        goal.goal_name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [familyGoals, filterStatus, filterPriority, filterOwner, searchQuery]);
  
  // Calculate pagination
  const totalItems = filteredGoals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedGoals = filteredGoals.slice(startIndex, endIndex);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPriority, filterOwner, searchQuery]);
  
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterOwner('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterOwner !== 'all' || searchQuery !== '';

  if (loadingFamilyGoals) {
    return (
      <div className="animate__animated animate__fadeIn">
        {/* Mobile Loading */}
        <div className="block md:hidden py-8">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading family goals...</p>
          </div>
        </div>
        {/* Desktop Loading */}
        <div className="d-none d-md-block text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-gray-600 mt-2">Loading family goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Mobile View */}
      <div className="block md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-flag-checkered text-indigo-500 text-xs"></i>
              Family Goals
              <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">{filteredGoals.length}</span>
            </h5>
            <p className="text-[10px] text-gray-500 mt-0.5">Track and contribute to shared goals</p>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={loadingFamilyGoals}
              className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md"
            >
              <i className={`fas fa-sync text-xs ${loadingFamilyGoals ? 'fa-spin' : ''}`}></i>
            </button>
          )}
        </div>

        {familyGoals.length > 0 ? (
          <>
            {/* Mobile Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      hasActiveFilters ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <i className="fas fa-sliders-h text-[10px]"></i>
                    Filters
                    {hasActiveFilters && (
                      <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                        {(filterStatus !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0) + (filterOwner !== 'all' ? 1 : 0) + (searchQuery !== '' ? 1 : 0)}
                      </span>
                    )}
                  </button>
                  
                  {['all', 'in_progress', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        filterStatus === status
                          ? status === 'completed' ? 'bg-emerald-500 text-white shadow-sm' 
                            : status === 'in_progress' ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : status === 'in_progress' ? 'Active' : 'Done'}
                    </button>
                  ))}
                  
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center"
                    >
                      <i className="fas fa-times text-[10px]"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded filter panel */}
              {mobileFiltersExpanded && (
                <div className="p-3 bg-white animate__animated animate__fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                      <select 
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Priority</label>
                      <select 
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Owner</label>
                      <select 
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
                      >
                        <option value="all">All Members</option>
                        {uniqueOwners.map(owner => (
                          <option key={owner.id} value={owner.id}>{owner.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Search</label>
                      <input 
                        type="text"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700"
                        placeholder="Search goals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={resetFilters} className="text-[10px] text-gray-500 font-medium">
                      <i className="fas fa-undo mr-1 text-[8px]"></i>Reset
                    </button>
                    <button onClick={() => setMobileFiltersExpanded(false)} className="text-[10px] text-indigo-600 font-medium">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Goals List */}
            <div className="space-y-2">
              {paginatedGoals.length > 0 ? (
                paginatedGoals.map(goal => (
                  <MobileGoalCard
                    key={goal.id}
                    goal={goal}
                    getRemainingDays={getRemainingDays}
                    openContributeModal={openContributeModal}
                    fetchGoalContributions={fetchGoalContributions}
                    loadingContributions={loadingContributions}
                    selectedGoalForContributions={selectedGoalForContributions}
                  />
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-filter text-gray-400 text-lg"></i>
                  </div>
                  <p className="text-sm text-gray-500">No goals match your filters</p>
                </div>
              )}
            </div>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {startIndex + 1}-{endIndex} of {totalItems}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-chevron-left text-[10px]"></i>
                    </button>
                    <span className="text-[11px] text-gray-700 px-2">{currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="fas fa-chevron-right text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-flag-checkered text-gray-400 text-lg"></i>
            </div>
            <h5 className="text-sm text-gray-500 font-medium mb-1">No family goals yet</h5>
            <p className="text-[11px] text-gray-400 mb-3">Create goals and share them with your family</p>
            {isCreator && (
              <Link to="/goals/create?share=family" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg">
                <i className="fas fa-plus text-xs"></i>Create Goal
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="d-none d-md-block">
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="text-primary font-weight-bold mb-1">Family Goals Overview</h5>
              <p className="text-muted mb-0">Track and contribute to shared financial goals</p>
            </div>
            {onRefresh && (
              <button className="btn btn-sm btn-outline-primary" onClick={onRefresh} disabled={loadingFamilyGoals}>
                <i className={`fas ${loadingFamilyGoals ? "fa-spinner fa-spin" : "fa-sync"} mr-1`}></i>Refresh
              </button>
            )}
          </div>
        </div>

        {familyGoals.length > 0 ? (
          <>
            {/* Filter Controls */}
            <div className="card shadow mb-3">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">Filter Goals</h6>
                <button className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                  <i className="fas fa-undo fa-sm mr-1"></i>Reset
                </button>
              </div>
              <div className="card-body border-bottom bg-light py-3">
                <div className="row align-items-end">
                  <div className="col-lg-2 col-md-3 col-6 mb-2">
                    <label className="text-xs font-weight-bold text-gray-700 mb-1">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-control form-control-sm">
                      <option value="all">All Statuses</option>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-lg-2 col-md-3 col-6 mb-2">
                    <label className="text-xs font-weight-bold text-gray-700 mb-1">Priority</label>
                    <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="form-control form-control-sm">
                      <option value="all">All Priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="col-lg-2 col-md-3 col-6 mb-2">
                    <label className="text-xs font-weight-bold text-gray-700 mb-1">Owner</label>
                    <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="form-control form-control-sm">
                      <option value="all">All Members</option>
                      {uniqueOwners.map(owner => (<option key={owner.id} value={owner.id}>{owner.name}</option>))}
                    </select>
                  </div>
                  <div className="col-lg-6 col-md-3 col-12 mb-2">
                    <label className="text-xs font-weight-bold text-gray-700 mb-1">Search</label>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search goal name or notes..." className="form-control form-control-sm" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Goals Table */}
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Family Goals ({filteredGoals.length})</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Goal</th>
                        <th>Owner</th>
                        <th>Progress</th>
                        <th>Amount</th>
                        <th>Target Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGoals.length > 0 ? paginatedGoals.map(goal => {
                        const progressPercentage = goal.percentage || 0;
                        const isCompleted = goal.status === "completed" || progressPercentage >= 100;
                        const statusClass = goal.status === "completed" ? "badge-success" : goal.status === "in_progress" ? "badge-primary" : goal.status === "not_started" ? "badge-secondary" : "badge-danger";
                        const priorityClass = goal.priority === "high" ? "badge-danger" : goal.priority === "medium" ? "badge-warning" : "badge-info";
                        
                        return (
                          <tr key={goal.id}>
                            <td>
                              <div className="font-weight-bold">{goal.goal_name}</div>
                              <span className="badge badge-info"><i className="fas fa-users mr-1"></i>Family Goal</span>
                            </td>
                            <td>{goal.owner_name || "Family Member"}</td>
                            <td style={{width: "180px"}}>
                              <div className="progress" style={{height: '12px'}}>
                                <div className={`progress-bar ${progressPercentage >= 75 ? "bg-success" : progressPercentage >= 50 ? "bg-info" : progressPercentage >= 25 ? "bg-warning" : "bg-danger"}`} style={{ width: `${progressPercentage}%` }}></div>
                              </div>
                              <div className="small text-muted mt-1">{formatPercentage(progressPercentage)}</div>
                            </td>
                            <td>
                              <div className="font-weight-bold">{formatCurrency(goal.current_amount)}</div>
                              <div className="small text-muted">of {formatCurrency(goal.target_amount)}</div>
                            </td>
                            <td>
                              <div>{formatDate(goal.target_date || goal.deadline)}</div>
                              <div className="small text-muted">{getRemainingDays(goal.target_date || goal.deadline)} days left</div>
                            </td>
                            <td>
                              <span className={`badge ${statusClass}`}>{goal.status === "not_started" ? "Not Started" : goal.status === "in_progress" ? "In Progress" : goal.status === "completed" ? "Completed" : "Cancelled"}</span>
                              <div className="small mt-1"><span className={`badge ${priorityClass}`}>{(goal.priority || 'medium').charAt(0).toUpperCase() + (goal.priority || 'medium').slice(1)} Priority</span></div>
                            </td>
                            <td>
                              <div className="btn-group">
                                <button className="btn btn-info btn-sm" onClick={() => openContributeModal(goal)} disabled={isCompleted}><i className="fas fa-plus mr-1"></i>Contribute</button>
                                <button className="btn btn-info btn-sm" onClick={() => fetchGoalContributions(goal.id)} disabled={loadingContributions && selectedGoalForContributions === goal.id}>
                                  {loadingContributions && selectedGoalForContributions === goal.id ? <span className="spinner-border spinner-border-sm"></span> : <i className="fas fa-chart-bar"></i>}
                                </button>
                                <Link to={`/goals/${goal.id}`} className="btn btn-primary btn-sm"><i className="fas fa-eye"></i></Link>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={7} className="text-center py-4"><i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i><p className="text-gray-500">No goals found matching your filters.</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="card-footer bg-white">
                  <div className="row align-items-center">
                    <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                      <span className="text-muted">Showing {startIndex + 1} to {endIndex} of {totalItems}</span>
                    </div>
                    <div className="col-md-4 text-center mb-2 mb-md-0">
                      <select className="form-select d-inline-block w-auto" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                        <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                      </select>
                    </div>
                    <div className="col-md-4 text-center text-md-end">
                      <nav><ul className="pagination mb-0 justify-content-center justify-content-md-end">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}><i className="fas fa-chevron-left"></i></button></li>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                          return <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}><button className="page-link" onClick={() => setCurrentPage(pageNum)}>{pageNum}</button></li>;
                        })}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}><i className="fas fa-chevron-right"></i></button></li>
                      </ul></nav>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contribution Visualization Section */}
            {selectedGoalForContributions && (
              <div className="card shadow mb-4 mt-4 animate__animated animate__fadeIn">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    Family Goal Contributions
                    <i className="fas fa-info-circle ml-2 text-gray-400" style={{ cursor: 'pointer' }} onClick={(e) => toggleTip('goal-contributions', e)}></i>
                  </h6>
                  <strong>{familyGoals.find(g => g.id === selectedGoalForContributions)?.goal_name || "Shared Goal"}</strong>
                </div>
                <div className="card-body">
                  {loadingContributions ? (
                    <div className="row">
                      <div className="col-xl-6 mb-4"><div className="card h-100"><div className="card-body"><div className="skeleton" style={{width: '100%', height: '250px', borderRadius: '8px'}}></div></div></div></div>
                      <div className="col-xl-6 mb-4"><div className="card h-100"><div className="card-body d-flex justify-content-center"><div className="skeleton skeleton-circle" style={{width: '200px', height: '200px'}}></div></div></div></div>
                    </div>
                  ) : goalContributions.length > 0 ? (
                    <div className="row">
                      <div className="col-xl-6 mb-4">
                        <div className="card h-100">
                          <div className="card-header py-3"><h6 className="m-0 font-weight-bold text-primary">Contribution by Member</h6></div>
                          <div className="card-body"><ContributionChart data={contributionChartData} chartRef={contributionBarChartRef} /></div>
                        </div>
                      </div>
                      <div className="col-xl-6 mb-4">
                        <div className="card h-100">
                          <div className="card-header py-3"><h6 className="m-0 font-weight-bold text-primary">Contribution Breakdown</h6></div>
                          <div className="card-body"><ContributionChart data={contributionPieChartData} chartRef={contributionPieChartRef} /></div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="card shadow-sm">
                          <div className="card-header py-3 bg-white border-bottom"><h6 className="m-0 font-weight-bold text-primary">Recent Contributions</h6></div>
                          <div className="card-body"><ContributionTimeline contributions={goalContributions} /></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="mb-3"><i className="fas fa-users fa-3x text-gray-300"></i></div>
                      <h5 className="text-gray-500 font-weight-light">No Contributions Yet</h5>
                      <p className="text-gray-500 mb-0 small">Be the first to contribute to this goal!</p>
                      <button className="btn btn-primary mt-3" onClick={() => {
                        const goal = familyGoals.find(g => g.id === selectedGoalForContributions);
                        if (goal) openContributeModal(goal);
                      }}>
                        <i className="fas fa-plus-circle mr-2"></i>Make First Contribution
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <div className="mb-3"><i className="fas fa-flag-checkered fa-3x text-gray-300"></i></div>
            <h5 className="text-gray-500 font-weight-light">No family goals found</h5>
            <p className="text-gray-500 mb-0 small">Create a goal and share it with family members to track progress together.</p>
            {isCreator && (
              <Link to="/goals/create?share=family" className="btn btn-sm btn-primary mt-3">
                <i className="fas fa-plus fa-sm mr-1"></i>Create Family Goal
              </Link>
            )}
            {!isCreator && (
              <div className="alert alert-info mt-3 text-left">
                <i className="fas fa-info-circle mr-1"></i>As a family member, you can contribute to existing family goals, but only the family creator can add new family goals.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Contribution Section */}
      {selectedGoalForContributions && (
        <div className="block md:hidden mt-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-chart-bar text-indigo-500 text-[10px]"></i>
                Contributions
              </h6>
              <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
                {familyGoals.find(g => g.id === selectedGoalForContributions)?.goal_name}
              </span>
            </div>
            <div className="p-3">
              {loadingContributions ? (
                <div className="text-center py-6">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">Loading contributions...</p>
                </div>
              ) : goalContributions.length > 0 ? (
                <>
                  <ContributionChart data={contributionChartData} chartRef={contributionBarChartRef} />
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h6 className="text-[11px] font-bold text-gray-800 mb-2">Recent Contributions</h6>
                    <ContributionTimeline contributions={goalContributions.slice(0, 5)} />
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-users text-gray-400 text-sm"></i>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">No contributions yet</p>
                  <button 
                    className="px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg"
                    onClick={() => {
                      const goal = familyGoals.find(g => g.id === selectedGoalForContributions);
                      if (goal) openContributeModal(goal);
                    }}
                  >
                    <i className="fas fa-plus mr-1 text-[9px]"></i>Be First
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTab;
