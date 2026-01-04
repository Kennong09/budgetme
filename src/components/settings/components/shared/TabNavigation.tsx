import React, { FC } from 'react';
import { SettingsTab } from '../../types';

interface TabNavigationProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation: FC<TabNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <>
      {/* Mobile Tab Navigation - Horizontal Scrollable Pills */}
      <div className="block md:hidden mb-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${tab.icon} text-[10px]`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Tab Navigation - Vertical List */}
      <div className="hidden md:block card shadow border-0">
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
    </>
  );
};

export default TabNavigation;
