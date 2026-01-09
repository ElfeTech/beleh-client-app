import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { DataSourceResponse, ExcelSheet, SheetRecoveryConfig } from '../../types/api';
import { StepIndicator } from '../upload/StepIndicator';
import { SheetSelection } from '../upload/SheetSelection';
import { HeaderSelection } from '../upload/HeaderSelection';
import { useWorkspace } from '../../context/WorkspaceContext';
import './UploadModal.css';

interface DatasourceModalProps {
    mode: 'add' | 'edit' | 'rename';
    workspaceId?: string; // Required for add mode
    datasourceId?: string; // Required for edit/rename mode
    initialName?: string; // For edit mode
    onClose: () => void;
    onSuccess: () => void;
}

type UploadStatus = 'IDLE' | 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'NEEDS_INPUT';

const FLOW_STEPS = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Select Sheets' },
    { id: 3, label: 'Set Headers' },
    { id: 4, label: 'Finalize' },
];

export function DatasourceModal({ mode, workspaceId, datasourceId, initialName = '', onClose, onSuccess }: DatasourceModalProps) {
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

        return validationResult.sheets.map(s => ({
            name: s.sheet_name,
            status: s.status === 'valid' ? 'READY' : 'NEEDS_ATTENTION',
            needs_user_input: s.status === 'invalid',
            preview_rows: s.sample_rows?.map(row => row.values) || [],
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
            const needsInput = dataset.status === 'NEEDS_INPUT' ||
                (dataset.status === 'FAILED' && dataset.metadata_json?.requires_user_input);

            if (needsInput) {
                setUploadStatus('NEEDS_INPUT');
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

                const mappedSheets = mapDatasourceToSheets(dataset);
                setSheets(mappedSheets);

                // Determine next step
                if (mappedSheets.length > 1) {
                    setCurrentStep(2);
                } else if (mappedSheets.some(s => s.needs_user_input)) {
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
                        const session = await apiClient.createChatSession(authToken, dataset.id, `Chat: ${dataset.name}`);

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
                setError(dataset.ingestion_error || 'Dataset processing failed');
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
                const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
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
                setTimeout(() => { onSuccess(); onClose(); }, 1000);
                return;
            } else {
                if (file) {
                    result = await apiClient.overrideDatasource(token, datasourceId!, file, name.trim());
                } else {
                    result = await apiClient.renameDatasource(token, datasourceId!, name.trim());
                    setUploadStatus('READY');
                    setProgress(100);
                    setTimeout(() => { onSuccess(); onClose(); }, 1000);
                    return;
                }
            }

            setDatasource(result);

            const needsInput = result.status === 'NEEDS_INPUT' ||
                (result.status === 'FAILED' && result.metadata_json?.requires_user_input);

            if (needsInput) {
                setUploadStatus('NEEDS_INPUT');
                const mappedSheets = mapDatasourceToSheets(result);
                setSheets(mappedSheets);

                if (mappedSheets.length > 1) {
                    setCurrentStep(2);
                } else if (mappedSheets.some(s => s.needs_user_input)) {
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
        setSheets(prev => prev.map(s =>
            s.name === sheetName ? { ...s, selected: !s.selected } : s
        ));
    };

    const handleSheetsContinue = () => {
        const selectedSheetNames = sheets.filter(s => s.selected).map(s => s.name);
        if (selectedSheetNames.length === 0) return;
        setCurrentStep(3);
    };

    const cleanupFailedDatasource = async () => {
        if (!datasource?.id || !user) return;

        // Only cleanup if we are in a state that should be cleaned up (failed or intermediate add mode)
        const isFailed = uploadStatus === 'FAILED' || (datasource.status === 'FAILED');
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
                sheets_to_ingest: sheets.filter(s => s.selected).map(s => s.name),
                sheet_configurations: configs
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
                setError(result.message || 'Some sheets still have validation issues. Please review and retry. Check your header doesn\'t have empty cell');
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
            case 'IDLE': return '';
            case 'UPLOADING': return 'Uploading file...';
            case 'PENDING': return 'Queued for processing...';
            case 'NEEDS_INPUT': return 'Action required';
            case 'PROCESSING': return 'Processing data...';
            case 'READY': return 'Dataset ready!';
            case 'FAILED': return 'Processing failed';
            default: return '';
        }
    };

    const getStatusColor = () => {
        switch (uploadStatus) {
            case 'UPLOADING': case 'PENDING': return '#f59e0b';
            case 'NEEDS_INPUT': return '#3b82f6';
            case 'PROCESSING': return '#3b82f6';
            case 'READY': return '#10b981';
            case 'FAILED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="step-upload">
                        {mode !== 'rename' && (
                            <div className="form-group">
                                <label>{mode === 'add' ? 'Select File' : 'Replace Dataset File'}</label>
                                <div className="file-upload-area" onClick={() => uploadStatus === 'IDLE' && fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" style={{ display: 'none' }} />
                                    {file ? (
                                        <div className="file-info">
                                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                            <span>{file.name}</span>
                                        </div>
                                    ) : (
                                        <div className="upload-placeholder">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <span>Click to upload Excel or CSV</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="ds-name">Dataset Name</label>
                            <input id="ds-name" type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 23))} placeholder="Enter dataset name" maxLength={23} required />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <SheetSelection
                        sheets={sheets}
                        onToggleSheet={handleToggleSheet}
                    />
                );
            case 3:
                return (
                    <HeaderSelection
                        sheets={sheets}
                        onSubmit={handleRecoverySubmit}
                        onBack={() => sheets.length > 1 ? setCurrentStep(2) : setCurrentStep(1)}
                    />
                );
            case 4:
                return (
                    <div className="upload-progress-container finalize-step">
                        <div className="progress-header">
                            <div className="progress-status" style={{ color: getStatusColor() }}>
                                {uploadStatus === 'READY' ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                ) : uploadStatus === 'FAILED' ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                                ) : (
                                    <svg className="status-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                                )}
                                <span>{getStatusText()}</span>
                            </div>
                            <span className="progress-percentage">{progress}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: getStatusColor() }} />
                        </div>
                        <p className="status-help-text">
                            {uploadStatus === 'READY'
                                ? "Everything looks good! Your data is ready to be visualized."
                                : uploadStatus === 'PROCESSING'
                                    ? "We're almost there. Just making sure all your data is properly structured."
                                    : "Preparing your data..."
                            }
                        </p>
                    </div>
                );
            default: return null;
        }
    };

    const modalContent = (
        <div className="modal-backdrop" onClick={(uploadStatus === 'IDLE' || uploadStatus === 'FAILED' || uploadStatus === 'NEEDS_INPUT') ? handleClose : undefined} style={{ zIndex: 10001 }}>
            <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'add' ? 'Add New Dataset' : mode === 'rename' ? 'Rename Dataset' : 'Update Dataset'}</h2>
                    {(uploadStatus === 'IDLE' || uploadStatus === 'FAILED' || uploadStatus === 'NEEDS_INPUT') && (
                        <button className="close-btn" onClick={handleClose}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    )}
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="modal-body">
                    {currentStep > 1 && <StepIndicator currentStep={currentStep} steps={FLOW_STEPS} />}

                    <div className="step-content">
                        {renderStepContent()}
                    </div>
                </div>

                <div className="modal-actions">
                    {uploadStatus === 'FAILED' ? (
                        <button type="button" className="secondary-btn" onClick={handleClose}>Close & Cleanup</button>
                    ) : (
                        <>
                            {currentStep === 1 && (
                                <>
                                    <button type="button" className="secondary-btn" onClick={handleClose}>Cancel</button>
                                    <button type="submit" className="primary-btn" onClick={handleSubmit} disabled={(mode !== 'rename' && !file && mode === 'add') || !name.trim() || uploadStatus !== 'IDLE'}>
                                        {mode === 'rename' ? (uploadStatus === 'UPLOADING' ? 'Renaming...' : 'Save Name') : (uploadStatus === 'UPLOADING' ? 'Uploading...' : 'Next: Select Sheets')}
                                    </button>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <button type="button" className="secondary-btn" onClick={() => setCurrentStep(1)}>Back</button>
                                    <button type="button" className="primary-btn" onClick={handleSheetsContinue} disabled={!sheets.some(s => s.selected)}>
                                        Continue
                                    </button>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <button type="button" className="secondary-btn" onClick={() => sheets.length > 1 ? setCurrentStep(2) : setCurrentStep(1)}>
                                        Back
                                    </button>
                                    {/* Submit All is inside HeaderSelection component */}
                                </>
                            )}
                            {currentStep === 4 && (
                                <button type="button" className="primary-btn" onClick={handleClose} disabled={uploadStatus !== 'READY'}>
                                    {uploadStatus === 'READY' ? 'Finish & Visualize' : 'Processing...'}
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
