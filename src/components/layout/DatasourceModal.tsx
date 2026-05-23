import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { DataSourceResponse, ExcelSheet, SheetRecoveryConfig } from '../../types/api';
import { StepIndicator } from '../upload/StepIndicator';
import { SheetSelection } from '../upload/SheetSelection';
import { HeaderSelection } from '../upload/HeaderSelection';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDatasourceError } from '../../utils/apiErrorMessage';
import './UploadModal.css';

interface DatasourceModalProps {
  mode: 'add' | 'edit' | 'rename';
  workspaceId?: string; // Required for add mode
  datasourceId?: string; // Required for edit/rename mode
  initialName?: string; // For edit mode
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStatus =
  | 'IDLE'
  | 'UPLOADING'
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'NEEDS_INPUT';

const FLOW_STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Select Sheets' },
  { id: 3, label: 'Set Headers' },
  { id: 4, label: 'Finalize' },
];

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Upload a spreadsheet and name your dataset. We support CSV and Excel.',
  2: 'Choose which sheets to include in this dataset.',
  3: 'Confirm the header row for each selected sheet.',
  4: 'We are validating and preparing your data for analysis.',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DatasourceModal({
  mode,
  workspaceId,
  datasourceId,
  initialName = '',
  onClose,
  onSuccess,
}: DatasourceModalProps) {
  const { user } = useAuth();
  const { refreshDatasources, saveWorkspaceState, currentWorkspace } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(initialName);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [datasource, setDatasource] = useState<DataSourceResponse | null>(null);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const mapDatasourceToSheets = (ds: DataSourceResponse): ExcelSheet[] => {
    const validationResult = ds.metadata_json?.validation_result;
    if (!validationResult || !validationResult.sheets) return [];

    return validationResult.sheets.map((s) => ({
      name: s.sheet_name,
      status: s.status === 'valid' ? 'READY' : 'NEEDS_ATTENTION',
      needs_user_input: s.status === 'invalid',
      preview_rows: s.sample_rows?.map((row) => row.values) || [],
      selected: true,
      reason: s.reason,
      issues: s.issues,
    }));
  };

  const pollDatasetStatus = async (datasetId: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) return;

      const dataset: DataSourceResponse = await apiClient.getDatasource(token, datasetId);

      setDatasource(dataset);

      // Check if user input is needed (even if status is FAILED)
      const needsInput =
        dataset.status === 'NEEDS_INPUT' ||
        (dataset.status === 'FAILED' && dataset.metadata_json?.requires_user_input);

      if (needsInput) {
        setUploadStatus('NEEDS_INPUT');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        const mappedSheets = mapDatasourceToSheets(dataset);
        setSheets(mappedSheets);

        // Determine next step
        if (mappedSheets.length > 1) {
          setCurrentStep(2);
        } else if (mappedSheets.some((s) => s.needs_user_input)) {
          setCurrentStep(3);
        }
        setProgress(50);
      } else if (dataset.status === 'PENDING') {
        setProgress(60);
      } else if (dataset.status === 'PROCESSING') {
        setProgress(80);
      } else if (dataset.status === 'READY') {
        setProgress(100);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        // Auto-create chat session and update workspace state
        try {
          const authToken = await user?.getIdToken();
          if (authToken && currentWorkspace) {
            console.log('[AutoSession] Creating session for dataset:', dataset.id);
            const session = await apiClient.createChatSession(
              authToken,
              dataset.id,
              `Chat: ${dataset.name}`,
            );

            console.log('[AutoSession] Updating workspace state with session:', session.id);
            await saveWorkspaceState(currentWorkspace.id, dataset.id, session.id);

            // Refresh datasources to ensure the new one is listed
            await refreshDatasources();
          }
        } catch (sessionErr) {
          console.error('[AutoSession] Failed to initialize chat for new dataset:', sessionErr);
        }

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (dataset.status === 'FAILED') {
        setProgress(0);
        setUploadStatus('FAILED');
        setError(formatDatasourceError(dataset));
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch (err) {
      console.error('Error polling dataset status:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (mode === 'add') {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setName(baseName.slice(0, 23));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    if (mode === 'add' && !file) return;

    try {
      setUploadStatus('UPLOADING');
      setProgress(10);
      setError(null);

      const token = await user.getIdToken();
      let result: DataSourceResponse;

      if (mode === 'add') {
        result = await apiClient.createDatasource(token, workspaceId!, file!, name);
      } else if (mode === 'rename') {
        result = await apiClient.renameDatasource(token, datasourceId!, name.trim());
        setUploadStatus('READY');
        setProgress(100);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
        return;
      } else {
        if (file) {
          result = await apiClient.overrideDatasource(token, datasourceId!, file, name.trim());
        } else {
          result = await apiClient.renameDatasource(token, datasourceId!, name.trim());
          setUploadStatus('READY');
          setProgress(100);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
          return;
        }
      }

      setDatasource(result);

      const needsInput =
        result.status === 'NEEDS_INPUT' ||
        (result.status === 'FAILED' && result.metadata_json?.requires_user_input);

      if (result.status === 'FAILED' && !needsInput) {
        setUploadStatus('FAILED');
        setProgress(0);
        setError(formatDatasourceError(result));
        return;
      }

      if (needsInput) {
        setUploadStatus('NEEDS_INPUT');
        const mappedSheets = mapDatasourceToSheets(result);
        setSheets(mappedSheets);

        if (mappedSheets.length > 1) {
          setCurrentStep(2);
        } else if (mappedSheets.some((s) => s.needs_user_input)) {
          setCurrentStep(3);
        }
      } else {
        setUploadStatus(result.status);
        if (result.id) {
          pollIntervalRef.current = setInterval(() => pollDatasetStatus(result.id), 2000);
        } else {
          console.error('[Upload] Missing ID in response:', result);
          setError('Internal error: Missing dataset ID');
          setUploadStatus('FAILED');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
      setUploadStatus('FAILED');
      setProgress(0);
    }
  };

  const handleToggleSheet = (sheetName: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.name === sheetName ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleSheetsContinue = () => {
    const selectedSheetNames = sheets.filter((s) => s.selected).map((s) => s.name);
    if (selectedSheetNames.length === 0) return;
    setCurrentStep(3);
  };

  const cleanupFailedDatasource = async () => {
    if (!datasource?.id || !user) return;

    // Only cleanup if we are in a state that should be cleaned up (failed or intermediate add mode)
    const isFailed = uploadStatus === 'FAILED' || datasource.status === 'FAILED';
    const isIntermediate = currentStep > 1 && currentStep < 4;

    if (mode === 'add' && (isFailed || isIntermediate)) {
      try {
        const token = await user.getIdToken();
        await apiClient.deleteDatasource(token, datasource.id);
        console.log('[Cleanup] Deleted failed/cancelled datasource:', datasource.id);
      } catch (err) {
        console.error('[Cleanup] Failed to delete datasource:', err);
      }
    }
  };

  const handleRecoverySubmit = async (configs: SheetRecoveryConfig[]) => {
    if (!datasource || !user) return;

    try {
      setUploadStatus('PROCESSING');
      const token = await user.getIdToken();
      const result = await apiClient.recoverDatasource(token, datasource.id, {
        datasource_id: datasource.id,
        sheets_to_ingest: sheets.filter((s) => s.selected).map((s) => s.name),
        sheet_configurations: configs,
      });

      if (!result || !result.datasource_id) {
        throw new Error('Invalid response from recovery API');
      }

      if (result.ingestion_started) {
        setUploadStatus('PENDING');
        setCurrentStep(4);
        // Ensure we use datasource_id explicitly
        pollIntervalRef.current = setInterval(() => pollDatasetStatus(result.datasource_id), 2000);
      } else {
        // If ingestion didn't start, it might mean more input is needed
        setUploadStatus('NEEDS_INPUT');
        setError(
          result.message ||
            "Some sheets still have validation issues. Please review and retry. Check your header doesn't have empty cell",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover dataset');
      setUploadStatus('FAILED');
    }
  };

  const handleClose = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    // Cleanup if necessary before closing
    await cleanupFailedDatasource();
    onClose();
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'IDLE':
        return '';
      case 'UPLOADING':
        return 'Uploading file...';
      case 'PENDING':
        return 'Queued for processing...';
      case 'NEEDS_INPUT':
        return 'Action required';
      case 'PROCESSING':
        return 'Processing data...';
      case 'READY':
        return 'Dataset ready!';
      case 'FAILED':
        return error || 'Processing failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'UPLOADING':
      case 'PENDING':
        return '#f59e0b';
      case 'NEEDS_INPUT':
        return '#3b82f6';
      case 'PROCESSING':
        return '#3b82f6';
      case 'READY':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const canClose =
    uploadStatus === 'IDLE' || uploadStatus === 'FAILED' || uploadStatus === 'NEEDS_INPUT';
  const isStepLocked = uploadStatus !== 'IDLE' && currentStep === 1;

  const headerCopy = useMemo(() => {
    if (mode === 'rename') {
      return {
        eyebrow: 'Dataset',
        title: 'Rename dataset',
        subtitle: 'Update the display name for this dataset.',
      };
    }
    if (mode === 'edit') {
      return {
        eyebrow: 'Import data',
        title: 'Update dataset',
        subtitle: STEP_SUBTITLES[currentStep] ?? STEP_SUBTITLES[1],
      };
    }
    return {
      eyebrow: 'Import data',
      title: 'Add new dataset',
      subtitle: STEP_SUBTITLES[currentStep] ?? STEP_SUBTITLES[1],
    };
  }, [mode, currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="dataset-wizard-step dataset-wizard-step--upload">
            {mode !== 'rename' && (
              <div className="form-group upload-modal-field">
                <label className="upload-modal-label" htmlFor="ds-file-input">
                  {mode === 'add' ? 'File' : 'Replace file'}
                </label>
                <button
                  type="button"
                  className={`upload-dropzone ${file ? 'has-file' : ''} ${isStepLocked ? 'is-locked' : ''}`}
                  onClick={() => !isStepLocked && fileInputRef.current?.click()}
                  disabled={isStepLocked}
                >
                  <input
                    id="ds-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls"
                    className="upload-dropzone-input"
                    disabled={isStepLocked}
                  />
                  {file ? (
                    <div className="upload-dropzone-file">
                      <div className="upload-dropzone-file-icon" aria-hidden>
                        <FileSpreadsheet size={22} strokeWidth={1.75} />
                      </div>
                      <div className="upload-dropzone-file-meta">
                        <span className="upload-dropzone-file-name">{file.name}</span>
                        <span className="upload-dropzone-file-size">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      {!isStepLocked && (
                        <span className="upload-dropzone-replace">Replace file</span>
                      )}
                    </div>
                  ) : (
                    <div className="upload-dropzone-empty">
                      <div className="upload-dropzone-icon-ring" aria-hidden>
                        <Upload className="upload-dropzone-icon" size={22} strokeWidth={2} />
                      </div>
                      <p className="upload-dropzone-title">Drop a file here or click to browse</p>
                      <p className="upload-dropzone-hint">
                        Secure upload · CSV and Excel supported
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
            )}
            <div className="form-group upload-modal-field">
              <label className="upload-modal-label" htmlFor="ds-name">
                Dataset name
              </label>
              <input
                id="ds-name"
                type="text"
                className="upload-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 23))}
                placeholder="e.g. Q4 Sales pipeline"
                maxLength={23}
                required
                disabled={isStepLocked}
              />
              <p className="dataset-wizard-hint">Max 23 characters</p>
            </div>
          </div>
        );
      case 2:
        return <SheetSelection sheets={sheets} onToggleSheet={handleToggleSheet} />;
      case 3:
        return (
          <HeaderSelection
            sheets={sheets}
            onSubmit={handleRecoverySubmit}
            onBack={() => (sheets.length > 1 ? setCurrentStep(2) : setCurrentStep(1))}
          />
        );
      case 4:
        return (
          <div className="upload-progress-container dataset-wizard-progress finalize-step">
            <div className="progress-header">
              <div className="progress-status" style={{ color: getStatusColor() }}>
                {uploadStatus === 'READY' ? (
                  <CheckCircle2 className="status-icon" size={20} strokeWidth={2} />
                ) : uploadStatus === 'FAILED' ? (
                  <AlertCircle className="status-icon" size={20} strokeWidth={2} />
                ) : (
                  <Loader2 className="status-icon spinner" size={20} strokeWidth={2} />
                )}
                <span>{getStatusText()}</span>
              </div>
              <span className="progress-percentage">{progress}%</span>
            </div>
            <div className="progress-bar dataset-wizard-progress-bar">
              <div
                className="progress-fill dataset-wizard-progress-fill"
                style={{ width: `${progress}%`, backgroundColor: getStatusColor() }}
              />
            </div>
            <p className="status-help-text">
              {uploadStatus === 'READY'
                ? 'Everything looks good! Your data is ready to be visualized.'
                : uploadStatus === 'FAILED'
                  ? error || 'Processing failed. Please try again.'
                  : uploadStatus === 'PROCESSING'
                    ? "We're almost there. Just making sure all your data is properly structured."
                    : 'Preparing your data...'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const modalContent = (
    <div className="modal-backdrop dataset-wizard-backdrop" style={{ zIndex: 10001 }}>
      <div className="modal-container dataset-wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header upload-modal-header dataset-wizard-header">
          <div className="upload-modal-header-text">
            <p className="upload-modal-eyebrow">{headerCopy.eyebrow}</p>
            <h2>{headerCopy.title}</h2>
            <p className="upload-modal-subtitle">{headerCopy.subtitle}</p>
          </div>
          {canClose && (
            <button type="button" className="close-btn" onClick={handleClose} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {error && <div className="form-error upload-modal-error dataset-wizard-error">{error}</div>}

        <div className="dataset-wizard-body">
          {currentStep > 1 && mode === 'add' && (
            <StepIndicator currentStep={currentStep} steps={FLOW_STEPS} />
          )}

          <div className="dataset-wizard-step-content">{renderStepContent()}</div>
        </div>

        <div className="modal-actions upload-modal-actions dataset-wizard-actions">
          {uploadStatus === 'FAILED' ? (
            <button type="button" className="secondary-btn" onClick={handleClose}>
              Close & cleanup
            </button>
          ) : (
            <>
              {currentStep === 1 && (
                <>
                  <button type="button" className="secondary-btn" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-gradient-primary"
                    onClick={handleSubmit}
                    disabled={(mode === 'add' && !file) || !name.trim() || uploadStatus !== 'IDLE'}
                  >
                    {mode === 'rename'
                      ? uploadStatus === 'UPLOADING'
                        ? 'Saving…'
                        : 'Save name'
                      : uploadStatus === 'UPLOADING'
                        ? 'Uploading…'
                        : mode === 'edit'
                          ? 'Save changes'
                          : 'Continue'}
                  </button>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <button type="button" className="secondary-btn" onClick={() => setCurrentStep(1)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-gradient-primary"
                    onClick={handleSheetsContinue}
                    disabled={!sheets.some((s) => s.selected)}
                  >
                    Continue to headers
                  </button>
                </>
              )}
              {currentStep === 3 && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => (sheets.length > 1 ? setCurrentStep(2) : setCurrentStep(1))}
                >
                  Back
                </button>
              )}
              {currentStep === 4 && (
                <button
                  type="button"
                  className="btn-gradient-primary"
                  onClick={handleClose}
                  disabled={uploadStatus !== 'READY'}
                >
                  {uploadStatus === 'READY' ? 'Finish & visualize' : 'Processing…'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
