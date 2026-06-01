import React from 'react';
import { FiBarChart2, FiSettings } from 'react-icons/fi';

/**
 * Tab Navigation Bar
 * Centered at top of page, shows General | Stats | Settings tabs
 */
export function TabBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'general', label: 'General', icon: null },
    { id: 'stats', label: 'Stats', icon: FiBarChart2 },
    { id: 'workout', label: 'Workout', icon: FiBarChart2 },
    { id: 'journal', label: 'Journal', icon: FiCalendar },
    { id: 'insights', label: 'Insights', icon: FiTrendingUp },
    { id: 'settings', label: 'Settings', icon: FiSettings }
  ];

  return (
    <div className="tab-bar">
      <div className="tab-bar__container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              {Icon && <Icon size={16} />}
              <span className="tab-button__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabBar;
