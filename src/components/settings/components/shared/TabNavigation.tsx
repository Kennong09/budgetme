import React, { FC } from 'react';
import { SettingsTab } from '../../types';

interface TabNavigationProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation: FC<TabNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="card shadow border-0">
      <div className="card-body p-0">
        <div className="list-group list-group-flush settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`list-group-item list-group-item-action ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <i className={`fas ${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
