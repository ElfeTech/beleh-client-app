import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';

interface WorkspaceModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function WorkspaceModal({ onClose, onSuccess }: WorkspaceModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the input field when modal opens
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        try {
            setIsCreating(true);
            setError(null);
            const token = await user.getIdToken();
            await apiClient.createWorkspace(token, name.trim());
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Workspace creation failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to create workspace');
        } finally {
            setIsCreating(false);
        }
    };

    const modalContent = (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10001 }}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Workspace</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="workspace-name">Workspace Name</label>
                        <input
                            ref={inputRef}
                            id="workspace-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter workspace name"
                            required
                        />
                        <p className="form-hint">
                            Choose a descriptive name for your workspace (e.g., "Sales Analytics", "Marketing Hub")
                        </p>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose} disabled={isCreating}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-btn" disabled={!name.trim() || isCreating}>
                            {isCreating ? 'Creating...' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
