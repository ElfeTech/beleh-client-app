import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import './WorkspaceRegionDropdown.css';

export function WorkspaceRegionDropdown() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces, loading } =
    useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setShowAddForm(false);
    setNewName('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (showAddForm && isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showAddForm, isOpen]);

  const handleSelect = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    setCurrentWorkspace(workspace);
    localStorage.setItem('activeWorkspaceId', workspaceId);
    navigate(`/workspace/${workspaceId}`);
    closeMenu();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !user) return;

    try {
      setIsCreating(true);
      const token = await user.getIdToken();
      const created = await apiClient.createWorkspace(token, trimmed);
      await refreshWorkspaces();
      setCurrentWorkspace(created);
      localStorage.setItem('activeWorkspaceId', created.id);
      navigate(`/workspace/${created.id}`);
      toast.success(`Workspace "${trimmed}" created`);
      closeMenu();
    } catch (err) {
      console.error('Failed to create workspace:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleOpen = () => {
    if (workspaces.length === 0) return;
    setIsOpen((prev) => {
      if (prev) {
        setShowAddForm(false);
        setNewName('');
      }
      return !prev;
    });
  };

  const displayName = currentWorkspace?.name || (loading ? 'Loading…' : 'Select workspace');

  return (
    <div ref={rootRef} className={`ws-region ${isOpen ? 'ws-region--open' : ''}`}>
      <button
        type="button"
        className="ws-region__trigger"
        onClick={toggleOpen}
        disabled={workspaces.length === 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="ws-region__trigger-icon" aria-hidden>
          <Building2 size={18} strokeWidth={1.75} />
        </span>
        <span className="ws-region__trigger-copy">
          <span className="ws-region__trigger-label">Active region</span>
          <span className="ws-region__trigger-name">{displayName}</span>
        </span>
        <ChevronsUpDown
          className="ws-region__trigger-chevron"
          size={16}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="ws-region__menu" role="listbox" aria-label="Available environments">
          <p className="ws-region__menu-heading">Available environments</p>

          <ul className="ws-region__list">
            {workspaces.map((workspace) => {
              const isActive = currentWorkspace?.id === workspace.id;
              return (
                <li key={workspace.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`ws-region__item ${isActive ? 'ws-region__item--active' : ''}`}
                    onClick={() => handleSelect(workspace.id)}
                  >
                    <span className="ws-region__item-name">{workspace.name}</span>
                    {isActive && <span className="ws-region__item-dot" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="ws-region__footer">
            {showAddForm ? (
              <form className="ws-region__form" onSubmit={(e) => void handleCreate(e)}>
                <input
                  ref={inputRef}
                  type="text"
                  className="ws-region__input"
                  placeholder="Workspace name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isCreating}
                  required
                />
                <div className="ws-region__form-actions">
                  <button
                    type="button"
                    className="ws-region__cancel-btn"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewName('');
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ws-region__create-btn"
                    disabled={!newName.trim() || isCreating}
                  >
                    {isCreating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="ws-region__add-btn"
                onClick={() => setShowAddForm(true)}
              >
                + Add workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
