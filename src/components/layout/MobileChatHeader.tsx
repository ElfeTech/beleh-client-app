import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import { DatasourceContext } from '../../context/DatasourceContext';
import { useUsage } from '../../context/UsageContext';
import './MobileChatHeader.css';

interface MobileChatHeaderProps {
  onWorkspaceClick: () => void;
  onDatasetClick: () => void;
  showDatasetSelector?: boolean;
}

const MobileChatHeader: React.FC<MobileChatHeaderProps> = ({
  onWorkspaceClick,
  onDatasetClick: _onDatasetClick,
  showDatasetSelector: _showDatasetSelector = true,
}) => {
  // Reserved for future dataset selector feature
  void _onDatasetClick;
  void _showDatasetSelector;

  const navigate = useNavigate();
  const context = useContext(WorkspaceContext);
  const datasourceContext = useContext(DatasourceContext);
  const { remaining } = useUsage();

  if (!context || !datasourceContext) {
    return null;
  }

  const { currentWorkspace, datasources } = context;
  const { selectedDatasourceId } = datasourceContext;

  // Reserved for future use when dataset selector is shown in header
  const _selectedDataset = datasources.find((ds) => ds.id === selectedDatasourceId);
  void _selectedDataset;

  // Calculate usage status and color
  const getUsageStatus = () => {
    if (!remaining) return { level: 'normal', color: '#10b981' };
    const percentage = remaining.percentage_used;

    if (percentage >= 90) return { level: 'critical', color: '#ef4444' };
    if (percentage >= 70) return { level: 'warning', color: '#f59e0b' };
    return { level: 'normal', color: '#10b981' };
  };

  const usageStatus = getUsageStatus();
  const queriesRemaining = remaining?.queries_remaining ?? 0;
  const queriesLimit = remaining?.queries_limit ?? 0;
  const percentageUsed = remaining?.percentage_used ?? 0;

  const handleUsageClick = () => {
    navigate('/settings/billing');
  };

  return (
    <div className="mobile-chat-header">
      <div className="mobile-header-row">
        <button className="mobile-selector workspace-selector-btn" onClick={onWorkspaceClick}>
          <svg className="selector-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div className="selector-content">
            <span className="selector-label">Workspace</span>
            <span className="selector-value">{currentWorkspace?.name || 'Select workspace'}</span>
          </div>
          <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Mobile Usage Badge - Circular Progress */}
        <button
          className={`mobile-usage-badge ${usageStatus.level}`}
          onClick={handleUsageClick}
          aria-label={`${queriesRemaining} queries remaining out of ${queriesLimit}`}
        >
          <svg className="usage-circle" viewBox="0 0 48 48">
            {/* Background circle */}
            <circle
              className="usage-circle-bg"
              cx="24"
              cy="24"
              r="20"
              fill="none"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              className="usage-circle-progress"
              cx="24"
              cy="24"
              r="20"
              fill="none"
              strokeWidth="4"
              strokeDasharray={`${percentageUsed * 1.257} ${125.7 - percentageUsed * 1.257}`}
              strokeDashoffset="0"
              transform="rotate(-90 24 24)"
              style={{ stroke: usageStatus.color }}
            />
            {/* Center text - remaining count */}
            <text
              x="24"
              y="24"
              textAnchor="middle"
              dominantBaseline="central"
              className="usage-circle-text"
            >
              {queriesRemaining}
            </text>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MobileChatHeader;
