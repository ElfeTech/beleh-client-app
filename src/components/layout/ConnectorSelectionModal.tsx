import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Search, X, FileSpreadsheet, Table2, Braces, Cloud, Database } from 'lucide-react';
import './UploadModal.css';
import './ConnectorModals.css';

interface ConnectorSelectionModalProps {
  onClose: () => void;
  onSelect: (type: 'upload' | 'postgres') => void;
  /** When true, hide file-based connectors (e.g. open from chat for database connections only). */
  hideFileSources?: boolean;
}

type CatalogAction =
  | { kind: 'select'; value: 'upload' | 'postgres' }
  | { kind: 'toast'; message: string };

interface CatalogItem {
  id: string;
  label: string;
  description: string;
  badge?: string;
  action: CatalogAction;
  Icon: typeof FileSpreadsheet;
}

interface CatalogSection {
  id: string;
  label: string;
  items: CatalogItem[];
}

const SECTIONS: CatalogSection[] = [
  {
    id: 'files',
    label: 'Files',
    items: [
      {
        id: 'excel',
        label: 'Excel',
        description: 'XLSX / XLS workbooks',
        Icon: FileSpreadsheet,
        action: { kind: 'select', value: 'upload' },
      },
      {
        id: 'csv',
        label: 'CSV',
        description: 'Comma-separated tables',
        Icon: Table2,
        action: { kind: 'select', value: 'upload' },
      },
      {
        id: 'json',
        label: 'JSON',
        description: 'Structured records',
        Icon: Braces,
        action: { kind: 'select', value: 'upload' },
      },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    items: [
      {
        id: 'sheets',
        label: 'Google Sheets',
        description: 'Live cloud spreadsheets',
        badge: 'Soon',
        Icon: Cloud,
        action: { kind: 'toast', message: 'Google Sheets is on the roadmap.' },
      },
    ],
  },
  {
    id: 'databases',
    label: 'Databases',
    items: [
      {
        id: 'postgres',
        label: 'PostgreSQL',
        description: 'Managed or self-hosted',
        Icon: Database,
        action: { kind: 'select', value: 'postgres' },
      },
      {
        id: 'mysql',
        label: 'MySQL',
        description: 'Relational warehouse',
        badge: 'Soon',
        Icon: Database,
        action: { kind: 'toast', message: 'MySQL connector is coming soon.' },
      },
      {
        id: 'mongo',
        label: 'MongoDB',
        description: 'Document workloads',
        badge: 'Soon',
        Icon: Database,
        action: { kind: 'toast', message: 'MongoDB connector is coming soon.' },
      },
      {
        id: 'dynamo',
        label: 'DynamoDB',
        description: 'AWS key-value',
        badge: 'Soon',
        Icon: Database,
        action: { kind: 'toast', message: 'DynamoDB connector is coming soon.' },
      },
    ],
  },
];

export function ConnectorSelectionModal({ onClose, onSelect, hideFileSources = false }: ConnectorSelectionModalProps) {
  const [query, setQuery] = useState('');

  const catalogSections = useMemo(
    () => (hideFileSources ? SECTIONS.filter((section) => section.id !== 'files') : SECTIONS),
    [hideFileSources]
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogSections;
    return catalogSections.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          section.label.toLowerCase().includes(q)
      ),
    })).filter((s) => s.items.length > 0);
  }, [query, catalogSections]);

  const handleItemClick = (item: CatalogItem) => {
    if (item.action.kind === 'toast') {
      toast.message(item.action.message);
      return;
    }
    onSelect(item.action.value);
  };

  const modalContent = (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-container connector-catalog-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connector-catalog-title"
      >
        <div className="connector-catalog-header">
          <div>
            <p className="connector-catalog-eyebrow">Connectors</p>
            <h2 id="connector-catalog-title">Choose a platform</h2>
            <p className="connector-catalog-subtitle">Select a platform to start analyzing your data.</p>
          </div>
          <button type="button" className="close-btn connector-catalog-close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="connector-catalog-toolbar">
          <div className="connector-catalog-search">
            <Search size={18} strokeWidth={2} aria-hidden className="connector-catalog-search-icon" />
            <input
              type="search"
              className="connector-catalog-search-input"
              placeholder="Search connectors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search connectors"
            />
          </div>
        </div>

        <div className="connector-catalog-body">
          {filteredSections.length === 0 ? (
            <p className="connector-catalog-empty">No connectors match your search.</p>
          ) : (
            filteredSections.map((section) => (
              <section key={section.id} className="connector-catalog-section">
                <h3 className="connector-catalog-section-label">{section.label}</h3>
                <div className="connector-catalog-grid">
                  {section.items.map((item) => {
                    const Icon = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`connector-catalog-card ${item.action.kind === 'toast' ? 'is-soon' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="connector-catalog-card-icon" aria-hidden>
                          <Icon size={22} strokeWidth={1.75} />
                        </div>
                        <div className="connector-catalog-card-text">
                          <span className="connector-catalog-card-title">{item.label}</span>
                          <span className="connector-catalog-card-desc">{item.description}</span>
                        </div>
                        {item.badge && <span className="connector-catalog-badge">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="modal-actions connector-catalog-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
