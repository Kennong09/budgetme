import React, { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { ViewSessionModalProps, ChatMessage } from "./types";

const ViewSessionModal: FC<ViewSessionModalProps> = ({
  show,
  onClose,
  session,
  messages,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'messages'>('info');

  if (!show || !session) return null;

  const getStatusInfo = (isActive: boolean) => {
    return isActive 
      ? { label: 'Active', color: '#28a745', icon: 'fa-circle' }
      : { label: 'Ended', color: '#6c757d', icon: 'fa-stop-circle' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = endTime - startTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const statusInfo = getStatusInfo(session.is_active);
  const userMessages = messages.filter(m => m.message_type === 'user').length;
  const assistantMessages = messages.filter(m => m.message_type === 'assistant').length;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        {/* Mobile Modal */}
        <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white w-full max-h-[90vh] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col animate__animated animate__slideInUp animate__faster">
            {/* Mobile Header */}
            <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <i className="fas fa-comments text-white text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <h6 className="text-sm font-bold mb-0 truncate">
                    {loading ? "Loading..." : session.session_title || "Chat Session"}
                  </h6>
                  <p className="text-[10px] opacity-90 mb-0 truncate">
                    {loading ? "Please wait..." : session.user_name || session.user_email || "Anonymous User"}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Mobile Quick Stats - One Row */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className={`fas ${statusInfo.icon} text-[10px]`} style={{ color: statusInfo.color }}></i>
                  <div>
                    <p className="text-[8px] text-gray-500 mb-0">Status</p>
                    <p className="text-[10px] font-bold mb-0" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-envelope text-red-500 text-[10px]"></i>
                  <div>
                    <p className="text-[8px] text-gray-500 mb-0">Messages</p>
                    <p className="text-[10px] font-bold text-red-500 mb-0">{session.message_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-clock text-red-500 text-[10px]"></i>
                  <div>
                    <p className="text-[8px] text-gray-500 mb-0">Duration</p>
                    <p className="text-[10px] font-bold text-red-500 mb-0">{formatDuration(session.start_time, session.end_time)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <i className={`fas ${session.user_satisfaction_rating ? 'fa-star text-amber-500' : 'fa-star-half-alt text-gray-400'} text-[10px]`}></i>
                  <div>
                    <p className="text-[8px] text-gray-500 mb-0">Rating</p>
                    <p className={`text-[10px] font-bold mb-0 ${session.user_satisfaction_rating ? 'text-amber-500' : 'text-gray-400'}`}>
                      {session.user_satisfaction_rating ? `${session.user_satisfaction_rating}/5` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex gap-2">
                {[
                  { id: 'info' as const, icon: 'fa-info-circle', label: 'Info' },
                  { id: 'messages' as const, icon: 'fa-comments', label: `Messages (${messages.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={`fas ${tab.icon} mr-1`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">Loading session data...</p>
                </div>
              ) : (
                <>
                  {/* Mobile Session Info Tab */}
                  {activeTab === 'info' && (
                    <div>
                      {/* User Card */}
                      <div className="text-center mb-4">
                        <div className="relative inline-block mb-2">
                          {session.user_avatar ? (
                            <img
                              src={session.user_avatar}
                              alt={session.user_name || "User"}
                              className="w-16 h-16 rounded-full object-cover border-3 border-red-500"
                              onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-xl">
                              {(session.user_name || session.user_email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${session.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <h6 className="text-sm font-bold text-gray-800 mb-0">{session.user_name || "Anonymous User"}</h6>
                        <p className="text-[10px] text-gray-500">{session.user_email || "No email"}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${session.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                            <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-600">
                            <i className="fas fa-tag mr-1"></i>{session.session_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-[10px] font-semibold text-red-600 mb-2">
                          <i className="fas fa-info-circle mr-1"></i>Session Details
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200">
                            <span className="text-[10px] text-gray-500">Session ID</span>
                            <code className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded">{session.id?.substring(0, 12)}...</code>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200">
                            <span className="text-[10px] text-gray-500">Started</span>
                            <span className="text-[10px] text-gray-700">{formatDate(session.start_time)}</span>
                          </div>
                          {session.end_time && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-200">
                              <span className="text-[10px] text-gray-500">Ended</span>
                              <span className="text-[10px] text-gray-700">{formatDate(session.end_time)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[10px] text-gray-500">AI Model</span>
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{session.ai_model_version || 'Default'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Message Breakdown */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-blue-600 mb-0">{userMessages}</p>
                          <p className="text-[9px] text-gray-500">User Messages</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-emerald-600 mb-0">{assistantMessages}</p>
                          <p className="text-[9px] text-gray-500">AI Responses</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Messages Tab */}
                  {activeTab === 'messages' && (
                    <div>
                      {messages.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <i className="fas fa-comment-slash text-gray-400 text-lg"></i>
                          </div>
                          <p className="text-xs font-medium text-gray-600">No messages</p>
                          <p className="text-[10px] text-gray-400">This session has no messages yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => {
                            const isUser = message.message_type === 'user';
                            const isAssistant = message.message_type === 'assistant';
                            
                            return (
                              <div 
                                key={message.id} 
                                className={`p-3 rounded-lg border-l-3 ${
                                  isUser ? 'bg-blue-50 border-blue-500' : 
                                  isAssistant ? 'bg-emerald-50 border-emerald-500' : 
                                  'bg-gray-50 border-gray-500'
                                }`}
                              >
                                {/* Message Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${
                                      isUser ? 'bg-blue-500 text-white' : 
                                      isAssistant ? 'bg-emerald-500 text-white' : 
                                      'bg-gray-500 text-white'
                                    }`}>
                                      <i className={`fas ${isUser ? 'fa-user' : isAssistant ? 'fa-robot' : 'fa-cog'} mr-0.5`}></i>
                                      {message.message_type.toUpperCase()}
                                    </span>
                                    <span className="text-[9px] text-gray-400">#{message.message_order}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400">
                                    <i className="far fa-clock mr-0.5"></i>
                                    {new Date(message.created_at).toLocaleTimeString()}
                                  </span>
                                </div>

                                {/* Message Content */}
                                <p className="text-xs text-gray-700 mb-2 whitespace-pre-wrap">{message.message_text}</p>

                                {/* Message Metadata */}
                                <div className="flex flex-wrap gap-1">
                                  {message.message_sentiment && (
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                                      message.message_sentiment === 'positive' ? 'bg-emerald-100 text-emerald-600' : 
                                      message.message_sentiment === 'negative' ? 'bg-red-100 text-red-600' : 
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      <i className={`fas ${message.message_sentiment === 'positive' ? 'fa-smile' : message.message_sentiment === 'negative' ? 'fa-frown' : 'fa-meh'} mr-0.5`}></i>
                                      {message.message_sentiment}
                                    </span>
                                  )}
                                  {message.confidence_score && (
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                                      message.confidence_score >= 0.8 ? 'bg-emerald-100 text-emerald-600' : 
                                      message.confidence_score >= 0.5 ? 'bg-amber-100 text-amber-600' : 
                                      'bg-red-100 text-red-600'
                                    }`}>
                                      <i className="fas fa-percentage mr-0.5"></i>{(message.confidence_score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  {message.response_time_ms && (
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                      <i className="fas fa-bolt mr-0.5"></i>{message.response_time_ms}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Footer - Responsive */}
            <div 
              className="border-t border-gray-100 flex flex-wrap items-center"
              style={{ 
                background: '#f8f9fa',
                padding: '10px 16px',
                gap: '8px'
              }}
            >
              <small className="text-muted hidden sm:block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{session.id?.substring(0, 12)}...</code>
              </small>
              <button
                onClick={onClose}
                className="btn btn-danger w-full"
                style={{ 
                  padding: '10px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  minHeight: '42px'
                }}
              >
                <i className="fas fa-times mr-1"></i>Close
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Modal */}
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable d-none d-md-block" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
            
            {/* Header - Compact */}
            <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-comments fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">
                    {loading ? "Loading Session..." : session.session_title || "Chat Session"}
                  </h6>
                  <small style={{ opacity: 0.9 }}>
                    {loading ? "Please wait..." : session.user_name || session.user_email || "Anonymous User"}
                  </small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={onClose} 
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Compact */}
            <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${statusInfo.icon} mr-2`} style={{ color: statusInfo.color }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Status</small>
                      <strong style={{ color: statusInfo.color, fontSize: '0.8rem' }}>{statusInfo.label}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-envelope text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Messages</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{session.message_count}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-clock text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Duration</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formatDuration(session.start_time, session.end_time)}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${session.user_satisfaction_rating ? 'fa-star text-warning' : 'fa-star-half-alt text-muted'} mr-2`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Rating</small>
                      <strong style={{ fontSize: '0.8rem' }} className={session.user_satisfaction_rating ? 'text-warning' : 'text-muted'}>
                        {session.user_satisfaction_rating ? `${session.user_satisfaction_rating}/5` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Compact */}
            <div className="px-3 pt-2">
              <div className="d-flex" style={{ gap: '6px' }}>
                {[
                  { id: 'info' as const, icon: 'fa-info-circle', label: 'Session Info' },
                  { id: 'messages' as const, icon: 'fa-comments', label: `Messages (${messages.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    <i className={`fas ${tab.icon} mr-1`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - Compact */}
            <div className="modal-body py-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-danger" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 mb-0">Loading session data...</p>
                </div>
              ) : (
                <>
                  {/* Session Info Tab */}
                  {activeTab === 'info' && (
                    <div className="row">
                      {/* Left Column - User Info */}
                      <div className="col-lg-5 text-center mb-3 mb-lg-0">
                        <div className="position-relative d-inline-block mb-3">
                          {session.user_avatar ? (
                            <img
                              src={session.user_avatar}
                              alt={session.user_name || "User"}
                              className="rounded-circle"
                              style={{ width: '80px', height: '80px', objectFit: 'cover', border: '3px solid #dc3545' }}
                              onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center rounded-circle"
                                 style={{ width: '80px', height: '80px', background: '#dc3545', color: 'white', fontSize: '2rem', fontWeight: 600 }}>
                              {(session.user_name || session.user_email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="position-absolute" style={{ bottom: '5px', right: '5px', width: '18px', height: '18px', borderRadius: '50%', background: statusInfo.color, border: '2px solid white' }}></div>
                        </div>
                        <h6 className="font-weight-bold mb-1">{session.user_name || "Anonymous User"}</h6>
                        <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>{session.user_email || "No email"}</p>
                        <div className="d-flex justify-content-center flex-wrap" style={{ gap: '6px' }}>
                          <Badge bg={session.is_active ? 'success' : 'secondary'} style={{ fontSize: '0.7rem' }}>
                            <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                          </Badge>
                          <Badge bg="primary" style={{ fontSize: '0.7rem' }}>
                            <i className="fas fa-tag mr-1"></i>{session.session_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Right Column - Session Details */}
                      <div className="col-lg-7">
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Session Details</h6>
                        <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">Session ID</small>
                            <code style={{ fontSize: '0.75rem' }}>{session.id?.substring(0, 16)}...</code>
                          </div>
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">Started</small>
                            <span style={{ fontSize: '0.8rem' }}>{formatDate(session.start_time)}</span>
                          </div>
                          {session.end_time && (
                            <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                              <small className="text-muted">Ended</small>
                              <span style={{ fontSize: '0.8rem' }}>{formatDate(session.end_time)}</span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">AI Model</small>
                            <Badge bg="info" style={{ fontSize: '0.65rem' }}>{session.ai_model_version || 'Default'}</Badge>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <small className="text-muted">Created</small>
                            <span style={{ fontSize: '0.8rem' }}>{formatDate(session.created_at)}</span>
                          </div>
                        </div>

                        {/* Message Breakdown */}
                        <h6 className="text-danger mb-2 mt-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-chart-pie mr-2"></i>Message Breakdown</h6>
                        <div className="row g-2">
                          <div className="col-6">
                            <div className="p-2 text-center" style={{ background: '#e7f1ff', borderRadius: '6px' }}>
                              <div className="text-primary font-weight-bold" style={{ fontSize: '1.1rem' }}>{userMessages}</div>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>User Messages</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 text-center" style={{ background: '#e8f5e9', borderRadius: '6px' }}>
                              <div className="text-success font-weight-bold" style={{ fontSize: '1.1rem' }}>{assistantMessages}</div>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>AI Responses</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages Tab */}
                  {activeTab === 'messages' && (
                    <div>
                      {messages.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="d-flex align-items-center justify-content-center mb-3"
                               style={{ width: '60px', height: '60px', background: '#f8f9fa', borderRadius: '50%', margin: '0 auto' }}>
                            <i className="fas fa-comment-slash fa-2x text-muted"></i>
                          </div>
                          <p className="text-muted mb-0">No messages in this session</p>
                        </div>
                      ) : (
                        <div className="messages-list">
                          {messages.map((message) => {
                            const isUser = message.message_type === 'user';
                            const isAssistant = message.message_type === 'assistant';
                            const bgColor = isUser ? '#e7f1ff' : isAssistant ? '#e8f5e9' : '#f8f9fa';
                            const borderColor = isUser ? '#007bff' : isAssistant ? '#28a745' : '#6c757d';
                            
                            return (
                              <div key={message.id} className="mb-3 p-3" 
                                   style={{ background: bgColor, borderRadius: '8px', borderLeft: `3px solid ${borderColor}` }}>
                                {/* Message Header */}
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <div className="d-flex align-items-center">
                                    <Badge bg={isUser ? 'primary' : isAssistant ? 'success' : 'secondary'} 
                                           style={{ fontSize: '0.7rem' }}>
                                      <i className={`fas ${isUser ? 'fa-user' : isAssistant ? 'fa-robot' : 'fa-cog'} mr-1`}></i>
                                      {message.message_type.toUpperCase()}
                                    </Badge>
                                    <small className="text-muted ml-2" style={{ fontSize: '0.75rem' }}>#{message.message_order}</small>
                                  </div>
                                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    <i className="far fa-clock mr-1"></i>
                                    {new Date(message.created_at).toLocaleTimeString()}
                                  </small>
                                </div>

                                {/* Message Content */}
                                <p className="mb-2" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{message.message_text}</p>

                                {/* Message Metadata */}
                                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                                  {message.message_sentiment && (
                                    <Badge bg={message.message_sentiment === 'positive' ? 'success' : message.message_sentiment === 'negative' ? 'danger' : 'secondary'}
                                           style={{ fontSize: '0.65rem' }}>
                                      <i className={`fas ${message.message_sentiment === 'positive' ? 'fa-smile' : message.message_sentiment === 'negative' ? 'fa-frown' : 'fa-meh'} mr-1`}></i>
                                      {message.message_sentiment}
                                    </Badge>
                                  )}
                                  {message.confidence_score && (
                                    <Badge bg={message.confidence_score >= 0.8 ? 'success' : message.confidence_score >= 0.5 ? 'warning' : 'danger'}
                                           style={{ fontSize: '0.65rem' }}>
                                      <i className="fas fa-percentage mr-1"></i>{(message.confidence_score * 100).toFixed(0)}%
                                    </Badge>
                                  )}
                                  {message.response_time_ms && (
                                    <Badge bg="light" className="text-muted" style={{ fontSize: '0.65rem' }}>
                                      <i className="fas fa-bolt mr-1"></i>{message.response_time_ms}ms
                                    </Badge>
                                  )}
                                  {message.intent_classification && (
                                    <Badge bg="info" style={{ fontSize: '0.65rem' }}>
                                      <i className="fas fa-crosshairs mr-1"></i>{message.intent_classification}
                                    </Badge>
                                  )}
                                  {message.user_feedback && (
                                    <Badge bg={message.user_feedback === 'helpful' ? 'success' : 'warning'} style={{ fontSize: '0.65rem' }}>
                                      <i className={`fas ${message.user_feedback === 'helpful' ? 'fa-thumbs-up' : 'fa-thumbs-down'} mr-1`}></i>
                                      {message.user_feedback.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer - Compact */}
            <div className="modal-footer border-0 py-2" style={{ background: '#f8f9fa' }}>
              <small className="text-muted mr-auto" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '0.7rem' }}>{session.id?.substring(0, 12)}...</code>
              </small>
              <button type="button" className="btn btn-danger btn-sm" onClick={onClose}>
                <i className="fas fa-times mr-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewSessionModal;
