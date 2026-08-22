import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { DataSourceResponse, ExcelSheet } from '../../types/api';
import { StepIndicator } from '../upload/StepIndicator';
import { SheetSelection } from '../upload/SheetSelection';
import { HeaderRowPicker } from '../upload/HeaderSelection';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDatasourceError } from '../../utils/apiErrorMessage';
import {
  isDatasourcesAtLimit,
  PLAN_LIMIT_REACHED_TOOLTIP,
  workspaceLimitUpgradeMessage,
} from '../../utils/workspaceAccess';
import {
  formatSpreadsheetFileSize,
  spreadsheetUploadHint,
  validateSpreadsheetUpload,
} from '../../utils/spreadsheetUpload';
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
  'IDLE' | 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'NEEDS_INPUT';

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Upload a spreadsheet and name your dataset. We support CSV and Excel.',
  2: 'Choose which sheets to include. Preview samples help you decide.',
  3: 'Tap the row that has the column titles. Preview is a sliced sample.',
  4: 'Importing the full sheets you selected.',
};

function buildHeaderQueue(sheets: ExcelSheet[]): ExcelSheet[] {
  return sheets.filter((s) => s.selected && s.needs_user_input);
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
  const {
    refreshDatasources,
    refreshWorkspaceUsage,
    saveWorkspaceState,
    currentWorkspace,
    workspaceUsage,
    currentRole,
  } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(initialName);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [datasource, setDatasource] = useState<DataSourceResponse | null>(null);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [headerQueue, setHeaderQueue] = useState<ExcelSheet[]>([]);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, number>>({});
  const [includeSheetsStep, setIncludeSheetsStep] = useState(false);

  const datasourcesAtLimit = mode === 'add' && isDatasourcesAtLimit(workspaceUsage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const submitRecoveryRef = useRef<
    (
      ds: DataSourceResponse,
      sheetsSnapshot: ExcelSheet[],
      headersSnapshot: Record<string, number>,
    ) => Promise<void>
  >(() => Promise.resolve());

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

  const enterNeedsInputFlow = (dataset: DataSourceResponse) => {
    setDatasource(dataset);
    setUploadStatus('NEEDS_INPUT');
    setError(null);
    setProgress(50);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const mappedSheets = mapDatasourceToSheets(dataset);
    setSheets(mappedSheets);
    setSelectedHeaders({});
    const multi = mappedSheets.length > 1;
    setIncludeSheetsStep(multi);

    if (multi) {
      setCurrentStep(2);
      return;
    }

    const queue = buildHeaderQueue(mappedSheets);
    setHeaderQueue(queue);
    setHeaderIndex(0);
    if (queue.length === 0) {
      void submitRecoveryRef.current(dataset, mappedSheets, {});
      return;
    }
    setCurrentStep(3);
  };

  const pollDatasetStatus = async (datasetId: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) return;

      const dataset: DataSourceResponse = await apiClient.getDatasource(token, datasetId);

      setDatasource(dataset);

      const needsInput =
        dataset.status === 'NEEDS_INPUT' ||
        (dataset.status === 'FAILED' && dataset.metadata_json?.requires_user_input);

      if (needsInput && currentStep < 2) {
        enterNeedsInputFlow(dataset);
      } else if (dataset.status === 'PENDING') {
        setProgress(60);
      } else if (dataset.status === 'PROCESSING') {
        setProgress(80);
      } else if (dataset.status === 'READY') {
        setProgress(100);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        try {
          const authToken = await user?.getIdToken();
          if (authToken && currentWorkspace) {
            const session = await apiClient.createChatSession(
              authToken,
              dataset.id,
              `Chat: ${dataset.name}`,
            );
            await saveWorkspaceState(currentWorkspace.id, dataset.id, session.id);
            await refreshDatasources();
          }
        } catch (sessionErr) {
          console.error('[AutoSession] Failed to initialize chat for new dataset:', sessionErr);
        }

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else if (dataset.status === 'FAILED' && !needsInput) {
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
    if (!selectedFile) return;

    const validationError = validateSpreadsheetUpload(selectedFile);
    setFile(selectedFile);
    if (mode === 'add') {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName.slice(0, 23));
    }
    setError(validationError);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    if (mode === 'add' && !file) return;
    if (datasourcesAtLimit) {
      setError(workspaceLimitUpgradeMessage(currentRole, 'datasources'));
      return;
    }
    if (file) {
      const validationError = validateSpreadsheetUpload(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      setUploadStatus('UPLOADING');
      setProgress(10);
      setError(null);

      const token = await user.getIdToken();
      let result: DataSourceResponse;

      if (mode === 'add') {
        result = await apiClient.createDatasource(token, workspaceId!, file!, name);
        await refreshWorkspaceUsage();
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
        enterNeedsInputFlow(result);
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

  const handleSelectAllSheets = () => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected: true })));
  };

  const handleClearSheets = () => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const submitRecovery = async (
    ds: DataSourceResponse,
    sheetsSnapshot: ExcelSheet[],
    headersSnapshot: Record<string, number>,
  ) => {
    if (!user) return;

    try {
      setError(null);
      setUploadStatus('PROCESSING');
      setCurrentStep(4);
      setProgress(60);
      const token = await user.getIdToken();
      const result = await apiClient.recoverDatasource(token, ds.id, {
        datasource_id: ds.id,
        sheets_to_ingest: sheetsSnapshot.filter((s) => s.selected).map((s) => s.name),
        sheet_configurations: sheetsSnapshot
          .filter((s) => s.selected)
          .map((s) => ({
            sheet_name: s.name,
            header_row_index: headersSnapshot[s.name] ?? (s.needs_user_input ? -1 : 0),
          })),
      });

      if (!result || !result.datasource_id) {
        throw new Error('Invalid response from recovery API');
      }

      if (result.ingestion_started) {
        setUploadStatus('PENDING');
        pollIntervalRef.current = setInterval(() => pollDatasetStatus(result.datasource_id), 2000);
      } else {
        setUploadStatus('NEEDS_INPUT');
        setError(
          result.message ||
            'Some sheets still need attention. Check your header row has no empty cells.',
        );
        const multi = sheetsSnapshot.length > 1;
        setIncludeSheetsStep(multi);
        setCurrentStep(multi ? 2 : 3);
        if (!multi) {
          const queue = buildHeaderQueue(sheetsSnapshot);
          setHeaderQueue(queue);
          setHeaderIndex(0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover dataset');
      setUploadStatus('FAILED');
    }
  };
  submitRecoveryRef.current = submitRecovery;

  const handleSheetsContinue = () => {
    if (!sheets.some((s) => s.selected) || !datasource) return;
    const queue = buildHeaderQueue(sheets);
    setHeaderQueue(queue);
    setHeaderIndex(0);
    if (queue.length === 0) {
      void submitRecovery(datasource, sheets, selectedHeaders);
      return;
    }
    setCurrentStep(3);
  };

  const handleHeaderContinue = () => {
    const current = headerQueue[headerIndex];
    if (!current || selectedHeaders[current.name] == null || !datasource) return;
    if (headerIndex < headerQueue.length - 1) {
      setHeaderIndex((i) => i + 1);
      return;
    }
    void submitRecovery(datasource, sheets, selectedHeaders);
  };

  const handleWizardBack = () => {
    if (currentStep === 3) {
      if (headerIndex > 0) {
        setHeaderIndex((i) => i - 1);
        return;
      }
      if (includeSheetsStep) {
        setCurrentStep(2);
        return;
      }
      setCurrentStep(1);
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const cleanupFailedDatasource = async () => {
    if (!datasource?.id || !user) return;

    const isFailed = uploadStatus === 'FAILED' || datasource.status === 'FAILED';
    const isIntermediate = currentStep > 1 && currentStep < 4;

    if (mode === 'add' && (isFailed || isIntermediate)) {
      try {
        const token = await user.getIdToken();
        await apiClient.deleteDatasource(token, datasource.id);
      } catch (err) {
        console.error('[Cleanup] Failed to delete datasource:', err);
      }
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

  const wizardSteps = useMemo(() => {
    const steps: { id: number; label: string }[] = [{ id: 1, label: 'Upload' }];
    let id = 2;
    if (includeSheetsStep) steps.push({ id: id++, label: 'Sheets' });
    steps.push({ id: id++, label: 'Headers' });
    steps.push({ id: id, label: 'Import' });
    return steps;
  }, [includeSheetsStep]);

  const wizardStepCurrent = useMemo(() => {
    if (currentStep === 1) return 1;
    if (currentStep === 2) return 2;
    if (currentStep === 3) return includeSheetsStep ? 3 : 2;
    return wizardSteps[wizardSteps.length - 1]?.id ?? 4;
  }, [currentStep, includeSheetsStep, wizardSteps]);

  const currentHeaderSheet = headerQueue[headerIndex];
  const headerProgressLabel =
    headerQueue.length > 1 ? `${headerIndex + 1} of ${headerQueue.length}` : null;
  const headerRowSelected =
    currentHeaderSheet != null && selectedHeaders[currentHeaderSheet.name] != null;
  const isLastHeaderSheet = headerIndex >= headerQueue.length - 1;

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
                  className={`upload-dropzone ${file ? 'has-file' : ''} ${isStepLocked ? 'is-locked' : ''} ${file && validateSpreadsheetUpload(file) ? 'is-invalid' : ''}`}
                  onClick={() => !isStepLocked && fileInputRef.current?.click()}
                  disabled={isStepLocked}
                  aria-describedby={error ? 'upload-file-error-modal' : undefined}
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
                          {formatSpreadsheetFileSize(file.size)}
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
                        Secure upload · {spreadsheetUploadHint()}
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
        return (
          <SheetSelection
            sheets={sheets}
            onToggleSheet={handleToggleSheet}
            onSelectAll={handleSelectAllSheets}
            onClearAll={handleClearSheets}
          />
        );
      case 3:
        return currentHeaderSheet ? (
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
        ) : null;
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
                ? 'Your dataset is ready.'
                : uploadStatus === 'FAILED'
                  ? error || 'Processing failed. Please try again.'
                  : 'Importing the full sheets you selected…'}
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

        {datasourcesAtLimit && (
          <div className="form-error upload-modal-error dataset-wizard-error">
            {workspaceLimitUpgradeMessage(currentRole, 'datasources')}
          </div>
        )}
        {error && (
          <div
            id="upload-file-error-modal"
            className="form-error upload-modal-error dataset-wizard-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="dataset-wizard-body">
          {currentStep > 1 && mode === 'add' && (
            <StepIndicator currentStep={wizardStepCurrent} steps={wizardSteps} />
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
                    disabled={
                      datasourcesAtLimit ||
                      (mode === 'add' && !file) ||
                      Boolean(file && validateSpreadsheetUpload(file)) ||
                      !name.trim() ||
                      uploadStatus !== 'IDLE'
                    }
                    title={datasourcesAtLimit ? PLAN_LIMIT_REACHED_TOOLTIP : undefined}
                  >
                    {mode === 'rename'
                      ? uploadStatus === 'UPLOADING'
                        ? 'Saving…'
                        : 'Save name'
                      : uploadStatus === 'UPLOADING'
                        ? 'Uploading…'
                        : mode === 'edit'
                          ? 'Save changes'
                          : 'Upload dataset'}
                  </button>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <button type="button" className="secondary-btn" onClick={handleWizardBack}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-gradient-primary"
                    onClick={handleSheetsContinue}
                    disabled={!sheets.some((s) => s.selected)}
                  >
                    Continue
                  </button>
                </>
              )}
              {currentStep === 3 && (
                <>
                  <button type="button" className="secondary-btn" onClick={handleWizardBack}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-gradient-primary"
                    onClick={handleHeaderContinue}
                    disabled={!headerRowSelected}
                  >
                    {isLastHeaderSheet ? 'Start import' : 'Continue'}
                  </button>
                </>
              )}
              {currentStep === 4 && (
                <button
                  type="button"
                  className="btn-gradient-primary"
                  onClick={handleClose}
                  disabled={uploadStatus !== 'READY'}
                >
                  {uploadStatus === 'READY' ? 'Done' : 'Importing…'}
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
