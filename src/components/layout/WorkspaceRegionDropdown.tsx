import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronsUpDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { writeActiveWorkspaceId } from '../../lib/uiMemory';
import type { WorkspaceResponse } from '../../types/api';
import {
  canShowWorkspaceUpgradeCta,
  createWorkspaceOwnershipHelper,
  isWorkspacesAtLimit,
  PLAN_MANAGED_BY_OWNER_COPY,
  BILLING_UPGRADE_HREF,
  workspaceLimitUpgradeMessage,
  workspaceOwnershipLabel,
  UPGRADE_TO_ADD_WORKSPACES_LABEL,
} from '../../utils/workspaceAccess';
import { SEARCH_VISIBILITY_THRESHOLD } from '../../constants/pagination';
import './WorkspaceRegionDropdown.css';

export function WorkspaceRegionDropdown() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    refreshWorkspaceUsage,
    workspaceUsage,
    currentRole,
    loading,
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const atLimit = isWorkspacesAtLimit(workspaceUsage);
  const canUpgrade = canShowWorkspaceUpgradeCta(currentRole);
  const showSearch = workspaces.length > SEARCH_VISIBILITY_THRESHOLD;
  const ownership = createWorkspaceOwnershipHelper(workspaces, user?.uid, user?.email);

  const filteredWorkspaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [workspaces, searchQuery]);

  const ownedWorkspaces = filteredWorkspaces.filter((w) => !ownership.isShared(w));
  const sharedWorkspaces = filteredWorkspaces.filter((w) => ownership.isShared(w));
  const showOwnershipGroups = ownedWorkspaces.length > 0 && sharedWorkspaces.length > 0;
  const currentIsShared = currentWorkspace ? ownership.isShared(currentWorkspace) : false;

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setShowAddForm(false);
    setNewName('');
    setSearchQuery('');
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

  useEffect(() => {
    if (isOpen && showSearch && !showAddForm) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, showSearch, showAddForm]);

  const handleSelect = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    setCurrentWorkspace(workspace);
    writeActiveWorkspaceId(workspaceId);
    navigate(`/workspace/${workspaceId}`);
    closeMenu();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !user) return;

    if (atLimit) {
      toast.error(workspaceLimitUpgradeMessage(currentRole, 'workspaces'));
      return;
    }

    try {
      setIsCreating(true);
      const token = await user.getIdToken();
      const created = await apiClient.createWorkspace(token, trimmed);
      await refreshWorkspaces();
      await refreshWorkspaceUsage();
      setCurrentWorkspace(created);
      writeActiveWorkspaceId(created.id);
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

  const renderWorkspaceItem = (workspace: WorkspaceResponse) => {
    const isActive = currentWorkspace?.id === workspace.id;
    const kind = ownership.kind(workspace);
    const showBadge = kind === 'shared' || showOwnershipGroups;

    return (
      <li key={workspace.id}>
        <button
          type="button"
          role="option"
          aria-selected={isActive}
          className={`ws-region__item ${isActive ? 'ws-region__item--active' : ''}`}
          onClick={() => handleSelect(workspace.id)}
        >
          <span className="ws-region__item-main">
            <span className="ws-region__item-name">{workspace.name}</span>
            {showBadge && (
              <span
                className={`ws-region__item-badge ws-region__item-badge--${kind}`}
                title={kind === 'shared' ? 'Shared with you from another team' : 'Your workspace'}
              >
                {workspaceOwnershipLabel(kind)}
              </span>
            )}
          </span>
          {isActive && <span className="ws-region__item-dot" aria-hidden />}
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={`ws-region ${isOpen ? 'ws-region--open' : ''}`}>
      <button
        type="button"
        className="ws-region__trigger"
        onClick={toggleOpen}
        disabled={workspaces.length === 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-tour="workspace-switcher"
      >
        <span className="ws-region__trigger-icon" aria-hidden>
          <Building2 size={18} strokeWidth={1.75} />
        </span>
        <span className="ws-region__trigger-copy">
          <span className="ws-region__trigger-label">
            {currentIsShared ? 'Shared workspace' : 'Active region'}
          </span>
          <span className="ws-region__trigger-name-row">
            <span className="ws-region__trigger-name">{displayName}</span>
            {currentIsShared && (
              <span className="ws-region__trigger-badge" title="Shared with you from another team">
                Shared
              </span>
            )}
          </span>
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
          {showSearch && (
            <div className="ws-region__search">
              <Search className="ws-region__search-icon" size={15} strokeWidth={2} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                className="ws-region__search-input"
                placeholder="Search workspaces…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search workspaces"
              />
            </div>
          )}
          {showOwnershipGroups ? (
            <>
              <p className="ws-region__menu-heading">Your workspaces</p>
              <ul className="ws-region__list">
                {ownedWorkspaces.length > 0 ? (
                  ownedWorkspaces.map(renderWorkspaceItem)
                ) : (
                  <li className="ws-region__empty">No matches</li>
                )}
              </ul>
              <p className="ws-region__menu-heading ws-region__menu-heading--secondary">
                Shared with you
              </p>
              <ul className="ws-region__list">
                {sharedWorkspaces.length > 0 ? (
                  sharedWorkspaces.map(renderWorkspaceItem)
                ) : (
                  <li className="ws-region__empty">No matches</li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="ws-region__menu-heading">Available environments</p>
              <ul className="ws-region__list">
                {filteredWorkspaces.length > 0 ? (
                  filteredWorkspaces.map(renderWorkspaceItem)
                ) : (
                  <li className="ws-region__empty">No matching workspaces</li>
                )}
              </ul>
            </>
          )}

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
                  disabled={isCreating || atLimit}
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
                    disabled={!newName.trim() || isCreating || atLimit}
                  >
                    {isCreating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            ) : atLimit && canUpgrade ? (
              <button
                type="button"
                className="ws-region__add-btn ws-region__add-btn--upgrade"
                onClick={() => {
                  setIsOpen(false);
                  navigate(BILLING_UPGRADE_HREF);
                }}
                title={UPGRADE_TO_ADD_WORKSPACES_LABEL}
              >
                {UPGRADE_TO_ADD_WORKSPACES_LABEL}
              </button>
            ) : (
              <button
                type="button"
                className="ws-region__add-btn"
                onClick={() => {
                  if (atLimit) {
                    toast.error(workspaceLimitUpgradeMessage(currentRole, 'workspaces'));
                    return;
                  }
                  setShowAddForm(true);
                }}
                disabled={atLimit}
                title={
                  atLimit
                    ? canUpgrade
                      ? UPGRADE_TO_ADD_WORKSPACES_LABEL
                      : PLAN_MANAGED_BY_OWNER_COPY
                    : undefined
                }
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
