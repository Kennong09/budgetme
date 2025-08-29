import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JoinFamily from './JoinFamily';

interface NoFamilyHandlerProps {
  onJoinSuccess: () => void;
}

const NoFamilyHandler: React.FC<NoFamilyHandlerProps> = ({ onJoinSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleTabChange = (tab: 'create' | 'join') => {
    setActiveTab(tab);
  };

  const handleCreateFamily = () => {
    navigate('/family/create');
  };

  return (
    <div className="container-fluid">
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
          </ul>
        </div>
        
        <div className="card-body">
          {activeTab === 'create' && (
            <CreateFamilyTab onCreateFamily={handleCreateFamily} />
          )}
          
          {activeTab === 'join' && (
            <JoinFamilyTab onJoinSuccess={onJoinSuccess} />
          )}
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

export default NoFamilyHandler;