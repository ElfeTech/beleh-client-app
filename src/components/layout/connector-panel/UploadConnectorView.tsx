import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { useFeedback } from '../../../context/FeedbackContext';
import { useUsage } from '../../../context/UsageContext';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { apiClient } from '../../../services/apiClient';
import { authService } from '../../../services/authService';
import type { DataSourceResponse, ExcelSheet, SheetRecoveryConfig } from '../../../types/api';
import { extractApiErrorDetail, formatDatasourceError } from '../../../utils/apiErrorMessage';
import {
  isDatasourcesAtLimit,
  PLAN_LIMIT_REACHED_TOOLTIP,
  workspaceLimitUpgradeMessage,
} from '../../../utils/workspaceAccess';
import { StepIndicator } from '../../upload/StepIndicator';
import { SheetSelection } from '../../upload/SheetSelection';
import { HeaderRowPicker } from '../../upload/HeaderSelection';
import '../UploadModal.css';

export interface UploadConnectorViewProps {
  workspaceId: string;
  onSuccess: () => void;
  onCancel: () => void;
  /**
   * Register a back handler for panel chrome.
   * Handler returns true when the wizard consumed Back; false when the panel should pop.
   */
  onRegisterBackHandler?: (handler: (() => boolean) | null) => void;
}

type UploadStatus =
  'IDLE' | 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'NEEDS_INPUT';

type WizardPhase = 'upload' | 'sheets' | 'headers' | 'importing';

function needsUserInput(dataset: DataSourceResponse): boolean {
  return (
    dataset.status === 'NEEDS_INPUT' ||
    (dataset.status === 'FAILED' && Boolean(dataset.metadata_json?.requires_user_input))
  );
}

function mapDatasourceToSheets(ds: DataSourceResponse): ExcelSheet[] {
  const validationResult = ds.metadata_json?.validation_result;
  if (!validationResult?.sheets) return [];

  return validationResult.sheets.map((s) => ({
    name: s.sheet_name,
    status: s.status === 'valid' ? 'READY' : 'NEEDS_ATTENTION',
    needs_user_input: s.status === 'invalid',
    preview_rows: s.sample_rows?.map((row) => row.values) || [],
    selected: true,
    reason: s.reason,
    issues: s.issues,
  }));
}

function buildHeaderQueue(sheets: ExcelSheet[]): ExcelSheet[] {
  return sheets.filter((s) => s.selected && s.needs_user_input);
}

function buildRecoveryConfigs(
  sheets: ExcelSheet[],
  selectedHeaders: Record<string, number>,
): SheetRecoveryConfig[] {
  return sheets
    .filter((s) => s.selected)
    .map((s) => ({
      sheet_name: s.name,
      header_row_index: selectedHeaders[s.name] ?? (s.needs_user_input ? -1 : 0),
    }));
}

export function UploadConnectorView({
  workspaceId,
  onSuccess,
  onCancel,
  onRegisterBackHandler,
}: Readonly<UploadConnectorViewProps>) {
  const { user } = useAuth();
  const { trackDatasetUpload } = useFeedback();
  const { refreshUsageAfterAction } = useUsage();
  const { workspaceUsage, currentRole, refreshWorkspaceUsage } = useWorkspace();
  const datasourcesAtLimit = isDatasourcesAtLimit(workspaceUsage);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<WizardPhase>('upload');
  const [datasource, setDatasource] = useState<DataSourceResponse | null>(null);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [headerQueue, setHeaderQueue] = useState<ExcelSheet[]>([]);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, number>>({});
  const [includeSheetsStep, setIncludeSheetsStep] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  const runRecoveryRef = useRef<
    (
      ds: DataSourceResponse,
      sheetsSnapshot: ExcelSheet[],
      headersSnapshot: Record<string, number>,
    ) => Promise<void>
  >(() => Promise.resolve());

  const startHeaderPhase = (
    ds: DataSourceResponse,
    nextSheets: ExcelSheet[],
    multiSheet: boolean,
  ) => {
    const queue = buildHeaderQueue(nextSheets);
    setHeaderQueue(queue);
    setHeaderIndex(0);
    setIncludeSheetsStep(multiSheet);
    if (queue.length === 0) {
      void runRecoveryRef.current(ds, nextSheets, {});
      return;
    }
    setPhase('headers');
  };

  const enterNeedsInputFlow = (dataset: DataSourceResponse) => {
    setDatasource(dataset);
    setUploadStatus('NEEDS_INPUT');
    setError(null);
    setProgress(50);
    clearPoll();

    const mappedSheets = mapDatasourceToSheets(dataset);
    setSheets(mappedSheets);
    setSelectedHeaders({});

    const multi = mappedSheets.length > 1;
    setIncludeSheetsStep(multi);
    if (multi) {
      setPhase('sheets');
    } else {
      startHeaderPhase(dataset, mappedSheets, false);
    }
  };

  const pollDatasetStatus = async (datasetId: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) return;

      const dataset = await apiClient.getDatasource(token, datasetId);
      setDatasource(dataset);

      if (needsUserInput(dataset) && phase !== 'headers' && phase !== 'sheets') {
        enterNeedsInputFlow(dataset);
        return;
      }

      if (dataset.status === 'PENDING') {
        setUploadStatus('PENDING');
        setPhase('importing');
        setProgress(33);
      } else if (dataset.status === 'PROCESSING') {
        setUploadStatus('PROCESSING');
        setPhase('importing');
        setProgress(66);
      } else if (dataset.status === 'READY') {
        setUploadStatus('READY');
        setPhase('importing');
        setProgress(100);
        clearPoll();
        trackDatasetUpload();
        refreshUsageAfterAction();
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else if (dataset.status === 'FAILED' && !needsUserInput(dataset)) {
        setUploadStatus('FAILED');
        setPhase('upload');
        setProgress(0);
        setError(formatDatasourceError(dataset));
        clearPoll();
      }
    } catch (err) {
      console.error('Error polling dataset status:', err);
    }
  };

  const runRecovery = async (
    ds: DataSourceResponse,
    sheetsSnapshot: ExcelSheet[],
    headersSnapshot: Record<string, number>,
  ) => {
    if (!user) return;

    try {
      setError(null);
      setUploadStatus('PROCESSING');
      setPhase('importing');
      setProgress(60);
      const token = await user.getIdToken();
      const result = await apiClient.recoverDatasource(token, ds.id, {
        datasource_id: ds.id,
        sheets_to_ingest: sheetsSnapshot.filter((s) => s.selected).map((s) => s.name),
        sheet_configurations: buildRecoveryConfigs(sheetsSnapshot, headersSnapshot),
      });

      if (!result?.datasource_id) {
        throw new Error('Invalid response from recovery API');
      }

      if (result.ingestion_started) {
        setUploadStatus('PENDING');
        pollIntervalRef.current = setInterval(() => {
          void pollDatasetStatus(result.datasource_id);
        }, 2000);
        void pollDatasetStatus(result.datasource_id);
      } else {
        setUploadStatus('NEEDS_INPUT');
        setError(
          result.message ||
            'Some sheets still need attention. Check your header row has no empty cells.',
        );
        const multi = sheetsSnapshot.length > 1;
        setIncludeSheetsStep(multi);
        setPhase(multi ? 'sheets' : 'headers');
        if (!multi) {
          const queue = buildHeaderQueue(sheetsSnapshot);
          setHeaderQueue(queue);
          setHeaderIndex(0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover dataset');
      setUploadStatus('FAILED');
      setPhase('upload');
    }
  };
  runRecoveryRef.current = runRecovery;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName.slice(0, 23));
    }
  };

  const handleUpload = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!file || !user || !name.trim()) return;
    if (datasourcesAtLimit) {
      setError(workspaceLimitUpgradeMessage(currentRole, 'datasources'));
      return;
    }

    try {
      setUploadStatus('UPLOADING');
      setProgress(10);
      setError(null);
      setPhase('upload');

      const token = await user.getIdToken();
      const dataset = await apiClient.createDatasource(token, workspaceId, file, name);
      await refreshWorkspaceUsage();
      setDatasource(dataset);

      if (needsUserInput(dataset)) {
        enterNeedsInputFlow(dataset);
        return;
      }

      if (dataset.status === 'FAILED') {
        setUploadStatus('FAILED');
        setProgress(0);
        setError(formatDatasourceError(dataset));
        return;
      }

      setUploadStatus(dataset.status);
      setPhase('importing');
      setProgress(25);

      pollIntervalRef.current = setInterval(() => {
        void pollDatasetStatus(dataset.id);
      }, 2000);
      void pollDatasetStatus(dataset.id);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : (extractApiErrorDetail(err) ?? 'Failed to upload datasource'),
      );
      setUploadStatus('FAILED');
      setProgress(0);
    }
  };

  const handleToggleSheet = (sheetName: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.name === sheetName ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleSelectAllSheets = () => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected: true })));
  };

  const handleClearSheets = () => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const cleanupFailedDatasource = async () => {
    if (!datasource?.id || !user) return;
    const midWizard = phase === 'sheets' || phase === 'headers' || phase === 'importing';
    const isFailed = uploadStatus === 'FAILED' || datasource.status === 'FAILED';
    if (!isFailed && !midWizard) return;
    if (uploadStatus === 'READY') return;

    try {
      const token = await user.getIdToken();
      await apiClient.deleteDatasource(token, datasource.id);
    } catch (err) {
      console.error('[Cleanup] Failed to delete datasource:', err);
    }
  };

  const leaveUpload = async () => {
    clearPoll();
    await cleanupFailedDatasource();
    onCancel();
  };

  const handleWizardBack = useCallback((): boolean => {
    if (phase === 'headers') {
      if (headerIndex > 0) {
        setHeaderIndex((i) => i - 1);
        return true;
      }
      if (includeSheetsStep) {
        setPhase('sheets');
        return true;
      }
      void leaveUpload();
      return true;
    }
    if (phase === 'sheets') {
      void leaveUpload();
      return true;
    }
    if (phase === 'importing' && (uploadStatus === 'READY' || uploadStatus === 'FAILED')) {
      void leaveUpload();
      return true;
    }
    if (phase === 'upload') {
      return false;
    }
    return false;
    // leaveUpload intentionally not in deps — uses latest state via closures on call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, headerIndex, includeSheetsStep, uploadStatus]);

  useEffect(() => {
    if (!onRegisterBackHandler) return;
    onRegisterBackHandler(() => handleWizardBack());
    return () => onRegisterBackHandler(null);
  }, [onRegisterBackHandler, handleWizardBack]);

  const handlePrimary = () => {
    if (phase === 'sheets') {
      if (!sheets.some((s) => s.selected)) return;
      if (!datasource) return;
      startHeaderPhase(datasource, sheets, true);
      return;
    }
    if (phase === 'headers') {
      const current = headerQueue[headerIndex];
      if (!current || selectedHeaders[current.name] == null) return;
      if (headerIndex < headerQueue.length - 1) {
        setHeaderIndex((i) => i + 1);
        return;
      }
      if (!datasource) return;
      void runRecovery(datasource, sheets, selectedHeaders);
      return;
    }
    if (phase === 'importing' && uploadStatus === 'READY') {
      onSuccess();
    }
  };

  const wizardSteps = useMemo(() => {
    const steps: { id: number; label: string }[] = [{ id: 1, label: 'Upload' }];
    let id = 2;
    if (includeSheetsStep) {
      steps.push({ id: id++, label: 'Sheets' });
    }
    steps.push({ id: id++, label: 'Headers' });
    steps.push({ id: id, label: 'Import' });
    return steps;
  }, [includeSheetsStep]);

  const wizardStepCurrent = useMemo(() => {
    if (phase === 'upload') return 1;
    if (phase === 'sheets') return 2;
    if (phase === 'headers') return includeSheetsStep ? 3 : 2;
    return wizardSteps[wizardSteps.length - 1]?.id ?? 4;
  }, [phase, includeSheetsStep, wizardSteps]);

  const showStepChrome = phase === 'sheets' || phase === 'headers' || phase === 'importing';

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'UPLOADING':
        return 'Uploading file…';
      case 'PENDING':
        return 'Queued for processing…';
      case 'PROCESSING':
        return 'Importing your data…';
      case 'READY':
        return 'Dataset ready';
      case 'FAILED':
        return error || 'Processing failed';
      default:
        return 'Working…';
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
      default:
        return '#6b7280';
    }
  };

  const isBusy = ['UPLOADING', 'PENDING', 'PROCESSING'].includes(uploadStatus);
  const isComplete = uploadStatus === 'READY';
  const hasFailed = uploadStatus === 'FAILED';
  const controlsLocked = isBusy || datasourcesAtLimit;

  const currentHeaderSheet = headerQueue[headerIndex];
  const headerProgressLabel =
    headerQueue.length > 1 ? `${headerIndex + 1} of ${headerQueue.length}` : null;
  const headerRowSelected =
    currentHeaderSheet != null && selectedHeaders[currentHeaderSheet.name] != null;
  const isLastHeaderSheet = headerIndex >= headerQueue.length - 1;

  const primaryLabel = (() => {
    if (phase === 'sheets') return 'Continue';
    if (phase === 'headers') return isLastHeaderSheet ? 'Start import' : 'Continue';
    if (phase === 'importing') {
      if (isComplete) return 'Done';
      if (hasFailed) return 'Close';
      return 'Importing…';
    }
    return 'Upload dataset';
  })();

  const primaryDisabled = (() => {
    if (phase === 'sheets') return !sheets.some((s) => s.selected);
    if (phase === 'headers') return !headerRowSelected;
    if (phase === 'importing') return isBusy;
    return !file || !name.trim() || isBusy || datasourcesAtLimit;
  })();

  return (
    <div className="ds-conn-embed ds-conn-panel__body upload-wizard">
      {datasourcesAtLimit && (
        <div className="form-error upload-modal-error">
          {workspaceLimitUpgradeMessage(currentRole, 'datasources')}
        </div>
      )}
      {error && phase !== 'upload' ? (
        <div className="form-error upload-modal-error">{error}</div>
      ) : null}

      {showStepChrome ? (
        <StepIndicator currentStep={wizardStepCurrent} steps={wizardSteps} />
      ) : null}

      {phase === 'upload' && (
        <form onSubmit={handleUpload} className="upload-modal-form">
          <div className="form-group upload-modal-field">
            <label className="upload-modal-label" htmlFor="upload-file-input-panel">
              File
            </label>
            <button
              type="button"
              className={`upload-dropzone ${file ? 'has-file' : ''} ${controlsLocked ? 'is-locked' : ''}`}
              onClick={() => !controlsLocked && fileInputRef.current?.click()}
              disabled={controlsLocked}
              title={datasourcesAtLimit ? PLAN_LIMIT_REACHED_TOOLTIP : undefined}
              aria-describedby="upload-file-hint-panel"
            >
              <input
                id="upload-file-input-panel"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="upload-dropzone-input"
                disabled={controlsLocked}
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
                  {!controlsLocked && <span className="upload-dropzone-replace">Replace file</span>}
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
              onChange={(e) => setName(e.target.value.slice(0, 23))}
              placeholder="e.g. Q4 Sales pipeline"
              maxLength={23}
              required
              disabled={controlsLocked}
            />
          </div>

          {uploadStatus !== 'IDLE' && (
            <div className="upload-progress-container">
              <div className="progress-header">
                <div className="progress-status" style={{ color: getStatusColor() }}>
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

          {error ? <div className="form-error upload-modal-error">{error}</div> : null}

          <div className="modal-actions upload-modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void leaveUpload()}
              disabled={isBusy}
            >
              {hasFailed ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn-gradient-primary"
              disabled={primaryDisabled}
              title={datasourcesAtLimit ? PLAN_LIMIT_REACHED_TOOLTIP : undefined}
            >
              {isBusy ? 'Uploading…' : 'Upload dataset'}
            </button>
          </div>
        </form>
      )}

      {phase === 'sheets' && (
        <>
          <SheetSelection
            sheets={sheets}
            onToggleSheet={handleToggleSheet}
            onSelectAll={handleSelectAllSheets}
            onClearAll={handleClearSheets}
          />
          <div className="modal-actions upload-modal-actions">
            <button type="button" className="secondary-btn" onClick={() => void leaveUpload()}>
              Back
            </button>
            <button
              type="button"
              className="btn-gradient-primary"
              onClick={handlePrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>
          </div>
        </>
      )}

      {phase === 'headers' && currentHeaderSheet && (
        <>
          <HeaderRowPicker
            sheet={currentHeaderSheet}
            selectedRow={selectedHeaders[currentHeaderSheet.name]}
            progressLabel={headerProgressLabel}
            onSelectRow={(rowIndex) => {
              setSelectedHeaders((prev) => ({
                ...prev,
                [currentHeaderSheet.name]: rowIndex,
              }));
            }}
          />
          <div className="modal-actions upload-modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                handleWizardBack();
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-gradient-primary"
              onClick={handlePrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>
          </div>
        </>
      )}

      {phase === 'importing' && (
        <>
          <div className="upload-progress-container">
            <div className="progress-header">
              <div className="progress-status" style={{ color: getStatusColor() }}>
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
            <p className="status-help-text">
              {isComplete
                ? 'Your dataset is ready.'
                : hasFailed
                  ? error || 'Import failed. You can close and try again.'
                  : 'Importing the full sheets you selected…'}
            </p>
          </div>
          <div className="modal-actions upload-modal-actions">
            <button
              type="button"
              className="btn-gradient-primary"
              onClick={handlePrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
