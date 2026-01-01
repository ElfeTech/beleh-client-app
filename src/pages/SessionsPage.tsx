import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatSessionContext } from '../context/ChatSessionContext';
import { DatasourceContext } from '../context/DatasourceContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import './SessionsPage.css';

const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const chatContext = useContext(ChatSessionContext);
  const datasourceContext = useContext(DatasourceContext);
  const workspaceContext = useContext(WorkspaceContext);
  const [longPressSession, setLongPressSession] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Ref to track if we've already loaded sessions for current datasource
  const loadedDatasourceRef = useRef<string | null>(null);

  const sessions = chatContext?.sessions || [];
  const setSessions = chatContext?.setSessions || (() => {});
  const addSession = chatContext?.addSession || (() => ({ id: '', dataset_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title: '', is_deleted: false }));
  const removeSession = chatContext?.removeSession || (() => {});
  const activeSessionId = chatContext?.activeSessionId || null;
  const setActiveSessionId = chatContext?.setActiveSessionId || (() => {});
  const selectedDatasourceId = datasourceContext?.selectedDatasourceId || null;
  const datasources = workspaceContext?.datasources || [];

  const selectedDataset = datasources.find(ds => ds.id === selectedDatasourceId);

  // Load sessions from API when datasource changes
  useEffect(() => {
    const loadSessions = async () => {
      // Don't make API calls if no datasource is selected
      if (!selectedDatasourceId) {
        loadedDatasourceRef.current = null;
        setSessions([]);
        setIsLoadingSessions(false);
        return;
      }

      // Only load if we haven't already loaded for this datasource
      if (loadedDatasourceRef.current === selectedDatasourceId) {
        return;
      }

      try {
        loadedDatasourceRef.current = selectedDatasourceId;
        setIsLoadingSessions(true);
        const token = authService.getAuthToken();
        if (!token) {
          console.error('No auth token found');
          setIsLoadingSessions(false);
          return;
        }

        // Fetch sessions from API for the selected datasource
        const sessionList = await apiClient.listChatSessions(token, selectedDatasourceId);
        setSessions(sessionList);

        // Restore last active session for this datasource if it exists
        const savedActiveSession = localStorage.getItem(`activeSession_${selectedDatasourceId}`);
        if (savedActiveSession && sessionList.some(s => s.id === savedActiveSession)) {
          setActiveSessionId(savedActiveSession);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadSessions();
  }, [selectedDatasourceId, setSessions, setActiveSessionId]);

  // Filter sessions by selected dataset (sessions are now already filtered by API)
  const datasetSessions = sessions.filter(
    session => session.dataset_id === selectedDatasourceId
  );

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getSessionTitle = (session: { id: string; title: string }) => {
    // Use the actual session title from the API, trimmed for mobile display
    const title = session.title || `Session ${session.id.substring(0, 8)}`;
    const maxLength = 50; // Optimal length for mobile display

    if (title.length > maxLength) {
      return title.substring(0, maxLength) + '...';
    }

    return title;
  };

  const handleNewChat = async () => {
    if (!selectedDatasourceId) {
      // Navigate to datasets if none selected
      navigate(`/workspace/${workspaceId}/datasets`);
      return;
    }

    if (isCreatingSession) return;

    setIsCreatingSession(true);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Create session on backend (matching desktop behavior)
      const newSession = await apiClient.createChatSession(
        token,
        selectedDatasourceId,
        `Chat ${new Date().toLocaleDateString()}`
      );

      // Add to context and set as active
      addSession(newSession);
      setActiveSessionId(newSession.id);

      // Clear any stale localStorage data to ensure clean state
      localStorage.setItem('activeSessionId', newSession.id);
      localStorage.setItem(`activeSession_${selectedDatasourceId}`, newSession.id);

      // Navigate to workspace - the Workspace component will load messages (empty for new session)
      navigate(`/workspace/${workspaceId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      // Still navigate but without creating session - user can try again from workspace
      navigate(`/workspace/${workspaceId}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem('activeSessionId', sessionId);
    navigate(`/workspace/${workspaceId}`);
  };

  const handleTouchStart = (sessionId: string) => {
    const timer = setTimeout(() => {
      setLongPressSession(sessionId);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleRename = (sessionId: string) => {
    const newName = prompt('Enter new session name:');
    if (newName) {
      // TODO: Implement rename functionality in context
    }
    setLongPressSession(null);
  };

  const handleDelete = (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      removeSession(sessionId);
    }
    setLongPressSession(null);
  };

  const handleBackdropClick = () => {
    setLongPressSession(null);
  };

  useEffect(() => {
    return () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
      }
    };
  }, [pressTimer]);

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <h1>Chat Sessions</h1>
        {selectedDataset && (
          <p className="selected-dataset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            {selectedDataset.name}
          </p>
        )}
      </div>

      <button
        className="new-chat-btn"
        onClick={handleNewChat}
        disabled={isCreatingSession || !selectedDatasourceId}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {isCreatingSession ? 'Creating...' : 'New Chat'}
      </button>

      {!selectedDatasourceId ? (
        <div className="sessions-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3>No dataset selected</h3>
          <p>Select a dataset to view or create chat sessions</p>
          <button className="goto-datasets-btn" onClick={() => navigate(`/workspace/${workspaceId}/datasets`)}>
            Go to Datasets
          </button>
        </div>
      ) : isLoadingSessions ? (
        <div className="sessions-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="loading-spinner">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3>Loading sessions...</h3>
        </div>
      ) : datasetSessions.length === 0 ? (
        <div className="sessions-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3>No sessions yet</h3>
          <p>Start a new chat to begin analyzing your data</p>
        </div>
      ) : (
        <div className="sessions-list">
          {datasetSessions.map((session) => (
            <button
              key={session.id}
              className={`session-card ${activeSessionId === session.id ? 'active' : ''}`}
              onClick={() => handleSessionClick(session.id)}
              onTouchStart={() => handleTouchStart(session.id)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart(session.id)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
            >
              <div className="session-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>

              <div className="session-content">
                <h3 className="session-title">{getSessionTitle(session)}</h3>
                <p className="session-timestamp">{formatTimestamp(new Date(session.created_at))}</p>
              </div>

              <svg className="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Long-press action menu */}
      {longPressSession && (
        <div className="action-menu-backdrop" onClick={handleBackdropClick}>
          <div className="action-menu" onClick={(e) => e.stopPropagation()}>
            <button className="action-menu-item" onClick={() => handleRename(longPressSession)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            <button className="action-menu-item danger" onClick={() => handleDelete(longPressSession)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button className="action-menu-item cancel" onClick={handleBackdropClick}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
