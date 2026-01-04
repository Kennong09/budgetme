import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JoinFamily from './JoinFamily';
import PendingInvitations from './PendingInvitations';

interface NoFamilyHandlerProps {
  onJoinSuccess: () => void;
}

const NoFamilyHandler: React.FC<NoFamilyHandlerProps> = ({ onJoinSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'invitations'>('create');

  const handleTabChange = (tab: 'create' | 'join' | 'invitations') => {
    setActiveTab(tab);
  };

  const handleCreateFamily = () => {
    navigate('/family/create');
  };

  return (
    <div className="container-fluid">
      {/* Mobile View */}
      <div className="block md:hidden animate__animated animate__fadeIn">
        {/* Mobile Header */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-users text-indigo-500 text-2xl"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-1">Family Finance</h1>
          <p className="text-xs text-gray-500">Start collaborating together</p>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button 
            type="button"
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              activeTab === "create" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("create")}
          >
            <i className="fas fa-plus-circle mr-1"></i>
            Create
          </button>
          <button 
            type="button"
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              activeTab === "join" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("join")}
          >
            <i className="fas fa-sign-in-alt mr-1"></i>
            Join
          </button>
          <button 
            type="button"
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              activeTab === "invitations" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("invitations")}
          >
            <i className="fas fa-envelope mr-1"></i>
            Invites
          </button>
        </div>

        {/* Mobile Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          {activeTab === 'create' && (
            <MobileCreateFamilyTab onCreateFamily={handleCreateFamily} />
          )}
          
          {activeTab === 'join' && (
            <JoinFamily onJoinSuccess={onJoinSuccess} />
          )}
          
          {activeTab === 'invitations' && (
            <PendingInvitations onAcceptSuccess={onJoinSuccess} />
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="d-flex justify-content-center mb-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center"
                 style={{ width: "80px", height: "80px", backgroundColor: "rgba(78, 115, 223, 0.1)" }}>
              <i className="fas fa-users fa-2x text-primary" />
            </div>
          </div>
          <h1 className="h2 text-gray-800 mb-2">Family Financial Management</h1>
          <p className="text-gray-600 mb-0">Start collaborating on your family finances</p>
        </div>

        {/* Main Content Card */}
        <div className="card shadow mb-4">
          <div className="card-header py-3">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button 
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === "create" ? "active" : ""}`} 
                  onClick={() => handleTabChange("create")}
                >
                  <i className="fas fa-plus-circle mr-1" /> Create Family
                </button>
              </li>
              <li className="nav-item">
                <button 
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === "join" ? "active" : ""}`} 
                  onClick={() => handleTabChange("join")}
                >
                  <i className="fas fa-sign-in-alt mr-1" /> Join Family
                </button>
              </li>
              <li className="nav-item">
                <button 
                  type="button"
                  className={`nav-link btn btn-link ${activeTab === "invitations" ? "active" : ""}`} 
                  onClick={() => handleTabChange("invitations")}
                >
                  <i className="fas fa-envelope mr-1" /> Invitations
                </button>
              </li>
            </ul>
          </div>
          
          <div className="card-body">
            {activeTab === 'create' && (
              <CreateFamilyTab onCreateFamily={handleCreateFamily} />
            )}
            
            {activeTab === 'join' && (
              <JoinFamilyTab onJoinSuccess={onJoinSuccess} />
            )}
            
            {activeTab === 'invitations' && (
              <InvitationsTab onAcceptSuccess={onJoinSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Create Family Tab Component
const MobileCreateFamilyTab: React.FC<{ onCreateFamily: () => void }> = ({ onCreateFamily }) => {
  return (
    <div className="text-center">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">Create Your Family</h3>
        <p className="text-xs text-gray-500 mb-4">
          Start managing finances together with your household.
        </p>
        
        <button 
          type="button"
          className="w-full py-3 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
          onClick={onCreateFamily}
        >
          <i className="fas fa-home"></i>
          Create Family Group
        </button>
      </div>

      {/* Mobile Benefits */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <i className="fas fa-chart-line text-emerald-500 text-xs"></i>
          </div>
          <p className="text-[9px] font-semibold text-gray-700">Shared</p>
          <p className="text-[8px] text-gray-400">Overview</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <i className="fas fa-bullseye text-amber-500 text-xs"></i>
          </div>
          <p className="text-[9px] font-semibold text-gray-700">Team</p>
          <p className="text-[8px] text-gray-400">Goals</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center mx-auto mb-2">
            <i className="fas fa-shield-alt text-rose-500 text-xs"></i>
          </div>
          <p className="text-[9px] font-semibold text-gray-700">Privacy</p>
          <p className="text-[8px] text-gray-400">Control</p>
        </div>
      </div>
    </div>
  );
};

// Create Family Tab Component
const CreateFamilyTab: React.FC<{ onCreateFamily: () => void }> = ({ onCreateFamily }) => {
  return (
    <div className="text-center">
      {/* Hero Section */}
      <div className="mb-5">
        <h3 className="text-gray-800 mb-3">Create Your Family Budget</h3>
        <p className="text-gray-600 mb-4">
          Start managing your family's finances together. Collaborate on budgets, 
          track shared expenses, and achieve your financial goals as a team.
        </p>
        
        <button 
          type="button"
          className="btn btn-primary btn-lg shadow-sm"
          onClick={onCreateFamily}
          style={{ minWidth: "200px", padding: "12px 30px" }}
        >
          <i className="fas fa-home mr-2" />
          Create Family Group
        </button>
      </div>

      {/* Benefits Section */}
      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card border-0 h-100">
            <div className="card-body text-center">
              <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                   style={{ width: "60px", height: "60px", backgroundColor: "rgba(28, 200, 138, 0.1)" }}>
                <i className="fas fa-chart-line fa-2x text-success" />
              </div>
              <h5 className="card-title">Shared Financial Overview</h5>
              <p className="card-text text-gray-600 small">
                View combined family income, expenses, and savings in real-time dashboards.
              </p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-4">
          <div className="card border-0 h-100">
            <div className="card-body text-center">
              <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                   style={{ width: "60px", height: "60px", backgroundColor: "rgba(246, 194, 62, 0.1)" }}>
                <i className="fas fa-bullseye fa-2x text-warning" />
              </div>
              <h5 className="card-title">Collaborative Goals</h5>
              <p className="card-text text-gray-600 small">
                Set and track family financial goals together. Everyone can contribute and see progress.
              </p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-4">
          <div className="card border-0 h-100">
            <div className="card-body text-center">
              <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                   style={{ width: "60px", height: "60px", backgroundColor: "rgba(231, 74, 59, 0.1)" }}>
                <i className="fas fa-shield-alt fa-2x text-danger" />
              </div>
              <h5 className="card-title">Privacy & Control</h5>
              <p className="card-text text-gray-600 small">
                You control who can see what. Set permissions and maintain financial privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Join Family Tab Component
const JoinFamilyTab: React.FC<{ onJoinSuccess: () => void }> = ({ onJoinSuccess }) => {
  return (
    <div>
      <div className="mb-4 text-center">
        <h3 className="text-gray-800 mb-2">Join an Existing Family</h3>
        <p className="text-gray-600">
          Find and request to join a family group that's already been created.
        </p>
      </div>
      
      <JoinFamily onJoinSuccess={onJoinSuccess} />
    </div>
  );
};

// Invitations Tab Component
const InvitationsTab: React.FC<{ onAcceptSuccess: () => void }> = ({ onAcceptSuccess }) => {
  return (
    <div>
      <PendingInvitations onAcceptSuccess={onAcceptSuccess} />
    </div>
  );
};

export default NoFamilyHandler;