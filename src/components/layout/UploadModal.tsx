import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/useAuth';
import { useFeedback } from '../../context/FeedbackContext';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { DataSourceResponse } from '../../types/api';
import './UploadModal.css';

interface UploadModalProps {
    workspaceId: string;
    onClose: () => void;
    onSuccess: () => void;
}

type UploadStatus = 'IDLE' | 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export function UploadModal({ workspaceId, onClose, onSuccess }: UploadModalProps) {
    const { user } = useAuth();
    const { trackDatasetUpload } = useFeedback();
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
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

    // Poll dataset status
    const pollDatasetStatus = async (datasetId: string) => {
        try {
            const token = authService.getAuthToken();
            if (!token) return;

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/datasets/datasources/${datasetId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) return;

            const dataset: DataSourceResponse = await response.json();

            setUploadStatus(dataset.status);

            // Update progress based on status
            if (dataset.status === 'PENDING') {
                setProgress(33);
            } else if (dataset.status === 'PROCESSING') {
                setProgress(66);
            } else if (dataset.status === 'READY') {
                setProgress(100);
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
                // Track dataset upload for feedback
                trackDatasetUpload();
                // Wait a bit to show the success state, then refresh and close
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else if (dataset.status === 'FAILED') {
                setProgress(0);
                setError(dataset.ingestion_error || 'Dataset processing failed');
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
            // Auto-populate name from filename (remove extension)
            const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
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

            setUploadStatus(dataset.status);
            setProgress(25);

            // Start polling for status updates
            pollIntervalRef.current = setInterval(() => {
                pollDatasetStatus(dataset.id);
            }, 2000); // Poll every 2 seconds

            // Initial poll
            pollDatasetStatus(dataset.id);
        } catch (err) {
            console.error('Upload failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload datasource');
            setUploadStatus('FAILED');
            setProgress(0);
        }
    };

    const handleClose = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
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
            case 'PROCESSING':
                return 'Processing and analyzing data...';
            case 'READY':
                return 'Dataset ready!';
            case 'FAILED':
                return 'Processing failed';
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
            default:
                return '#6b7280';
        }
    };

    const isProcessing = ['UPLOADING', 'PENDING', 'PROCESSING'].includes(uploadStatus);
    const isComplete = uploadStatus === 'READY';
    const hasFailed = uploadStatus === 'FAILED';

    const modalContent = (
        <div className="modal-backdrop" onClick={!isProcessing ? handleClose : undefined}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Dataset</h2>
                    {!isProcessing && (
                        <button className="close-btn" onClick={handleClose}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Select File</label>
                        <div
                            className="file-upload-area"
                            onClick={() => !isProcessing && fileInputRef.current?.click()}
                            style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv,.xlsx,.xls"
                                style={{ display: 'none' }}
                                disabled={isProcessing}
                            />
                            {file ? (
                                <div className="file-info">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                    <span>{file.name}</span>
                                </div>
                            ) : (
                                <div className="upload-placeholder">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span>Click to upload CSV or Excel</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ds-name">Dataset Name</label>
                        <input
                            id="ds-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter dataset name"
                            required
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Progress Tracker */}
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
                                        <svg className="status-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                        transition: 'width 0.5s ease-in-out'
                                    }}
                                />
                            </div>
                            <div className="progress-stages">
                                <div className={`stage ${progress >= 25 ? 'completed' : ''}`}>
                                    <div className="stage-dot" />
                                    <span>Upload</span>
                                </div>
                                <div className={`stage ${progress >= 50 ? 'completed' : ''}`}>
                                    <div className="stage-dot" />
                                    <span>Queue</span>
                                </div>
                                <div className={`stage ${progress >= 75 ? 'completed' : ''}`}>
                                    <div className="stage-dot" />
                                    <span>Process</span>
                                </div>
                                <div className={`stage ${progress === 100 ? 'completed' : ''}`}>
                                    <div className="stage-dot" />
                                    <span>Ready</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <div className="form-error">{error}</div>}

                    <div className="modal-actions">
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
                            className="primary-btn"
                            disabled={!file || isProcessing || isComplete}
                        >
                            {isProcessing ? 'Processing...' : isComplete ? 'Completed' : 'Upload Dataset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
