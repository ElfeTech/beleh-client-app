import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { useFeedback } from '../../../context/FeedbackContext';
import { useUsage } from '../../../context/UsageContext';
import { apiClient } from '../../../services/apiClient';
import { authService } from '../../../services/authService';
import type { DataSourceResponse } from '../../../types/api';
import { extractApiErrorDetail, formatDatasourceError } from '../../../utils/apiErrorMessage';
import '../UploadModal.css';

interface UploadConnectorViewProps {
  workspaceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type UploadStatus =
  | 'IDLE'
  | 'UPLOADING'
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'NEEDS_INPUT';

export function UploadConnectorView({
  workspaceId,
  onSuccess,
  onCancel,
}: UploadConnectorViewProps) {
  const { user } = useAuth();
  const { trackDatasetUpload } = useFeedback();
  const { refreshUsageAfterAction } = useUsage();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const pollDatasetStatus = async (datasetId: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/datasets/datasources/${datasetId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const dataset: DataSourceResponse = await response.json();

      setUploadStatus(dataset.status);

      if (dataset.status === 'PENDING') {
        setProgress(33);
      } else if (dataset.status === 'PROCESSING') {
        setProgress(66);
      } else if (dataset.status === 'READY') {
        setProgress(100);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        trackDatasetUpload();
        refreshUsageAfterAction();
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else if (dataset.status === 'FAILED') {
        setProgress(0);
        setError(formatDatasourceError(dataset));
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    } catch (err) {
      console.error('Error polling dataset status:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    try {
      setUploadStatus('UPLOADING');
      setProgress(10);
      setError(null);

      const token = await user.getIdToken();
      const dataset = await apiClient.createDatasource(token, workspaceId, file, name);

      if (dataset.status === 'FAILED') {
        setUploadStatus('FAILED');
        setProgress(0);
        setError(formatDatasourceError(dataset));
        return;
      }

      setUploadStatus(dataset.status);
      setProgress(25);

      pollIntervalRef.current = setInterval(() => {
        pollDatasetStatus(dataset.id);
      }, 2000);

      pollDatasetStatus(dataset.id);
    } catch (err) {
      console.error('Upload failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(extractApiErrorDetail(err) ?? 'Failed to upload datasource');
      }
      setUploadStatus('FAILED');
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    onCancel();
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'IDLE':
        return '';
      case 'UPLOADING':
        return 'Uploading file…';
      case 'PENDING':
        return 'Queued for processing…';
      case 'PROCESSING':
        return 'Processing and analyzing…';
      case 'READY':
        return 'Dataset ready';
      case 'FAILED':
        return error || 'Processing failed';
      case 'NEEDS_INPUT':
        return 'Needs your input…';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'UPLOADING':
      case 'PENDING':
        return '#f59e0b';
      case 'PROCESSING':
        return '#3b82f6';
      case 'READY':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      case 'NEEDS_INPUT':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const isProcessing = ['UPLOADING', 'PENDING', 'PROCESSING', 'NEEDS_INPUT'].includes(uploadStatus);
  const isComplete = uploadStatus === 'READY';
  const hasFailed = uploadStatus === 'FAILED';

  return (
    <div className="ds-conn-embed ds-conn-panel__body">
      <form onSubmit={handleSubmit} className="upload-modal-form">
        <div className="form-group upload-modal-field">
          <label className="upload-modal-label" htmlFor="upload-file-input-panel">
            File
          </label>
          <button
            type="button"
            className={`upload-dropzone ${file ? 'has-file' : ''} ${isProcessing ? 'is-locked' : ''}`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            disabled={isProcessing}
            aria-describedby="upload-file-hint-panel"
          >
            <input
              id="upload-file-input-panel"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls"
              className="upload-dropzone-input"
              disabled={isProcessing}
            />
            {file ? (
              <div className="upload-dropzone-file">
                <div className="upload-dropzone-file-icon" aria-hidden>
                  <FileSpreadsheet size={22} strokeWidth={1.75} />
                </div>
                <div className="upload-dropzone-file-meta">
                  <span className="upload-dropzone-file-name">{file.name}</span>
                  <span className="upload-dropzone-file-size">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                {!isProcessing && <span className="upload-dropzone-replace">Replace file</span>}
              </div>
            ) : (
              <div className="upload-dropzone-empty">
                <div className="upload-dropzone-icon-ring" aria-hidden>
                  <Upload className="upload-dropzone-icon" size={22} strokeWidth={2} />
                </div>
                <p className="upload-dropzone-title">Drop a file here or click to browse</p>
                <p id="upload-file-hint-panel" className="upload-dropzone-hint">
                  Secure upload · CSV and Excel supported.
                </p>
                <div className="upload-dropzone-badges">
                  <span>.csv</span>
                  <span>.xlsx</span>
                  <span>.xls</span>
                </div>
              </div>
            )}
          </button>
        </div>

        <div className="form-group upload-modal-field">
          <label className="upload-modal-label" htmlFor="ds-name-panel">
            Dataset name
          </label>
          <input
            id="ds-name-panel"
            type="text"
            className="upload-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q4 Sales pipeline"
            required
            disabled={isProcessing}
          />
        </div>

        {uploadStatus !== 'IDLE' && (
          <div className="upload-progress-container">
            <div className="progress-header">
              <div className="progress-status" style={{ color: getStatusColor() }}>
                {isComplete && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
                {isProcessing && (
                  <svg
                    className="status-icon spinner"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                )}
                {hasFailed && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
                <span>{getStatusText()}</span>
              </div>
              <span className="progress-percentage">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getStatusColor(),
                  transition: 'width 0.5s ease-in-out',
                }}
              />
            </div>
          </div>
        )}

        {error && <div className="form-error upload-modal-error">{error}</div>}

        <div className="modal-actions upload-modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleClose}
            disabled={isProcessing}
          >
            {isComplete ? 'Close' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn-gradient-primary"
            disabled={!file || isProcessing || isComplete}
          >
            {isProcessing ? 'Processing…' : isComplete ? 'Done' : 'Upload dataset'}
          </button>
        </div>
      </form>
    </div>
  );
}
