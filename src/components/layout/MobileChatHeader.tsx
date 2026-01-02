import React, { useContext } from 'react';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import { DatasourceContext } from '../../context/DatasourceContext';
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

  const context = useContext(WorkspaceContext);
  const datasourceContext = useContext(DatasourceContext);

  if (!context || !datasourceContext) {
    return null;
  }

  const { currentWorkspace, datasources } = context;
  const { selectedDatasourceId } = datasourceContext;

  // Reserved for future use when dataset selector is shown in header
  const _selectedDataset = datasources.find((ds) => ds.id === selectedDatasourceId);
  void _selectedDataset;

  return (
    <div className="mobile-chat-header">
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
    </div>
  );
};

export default MobileChatHeader;
