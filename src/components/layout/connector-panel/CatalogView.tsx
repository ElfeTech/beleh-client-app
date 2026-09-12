import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, FileSpreadsheet, Table2, Braces, Cloud, Database, Hexagon } from 'lucide-react';

export type ConnectorPanelSelect = 'upload' | 'postgres' | 'supabase';

type CatalogAction =
  | { kind: 'select'; value: ConnectorPanelSelect }
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

function isComingSoon(item: CatalogItem): boolean {
  return item.action.kind === 'toast' || Boolean(item.badge);
}

/** Keep live connectors in their original groups; collect Soon items at the bottom. */
function partitionCatalog(sections: CatalogSection[]): CatalogSection[] {
  const available: CatalogSection[] = [];
  const comingSoonItems: CatalogItem[] = [];

  for (const section of sections) {
    const ready = section.items.filter((item) => !isComingSoon(item));
    comingSoonItems.push(...section.items.filter(isComingSoon));
    if (ready.length > 0) {
      available.push({ ...section, items: ready });
    }
  }

  if (comingSoonItems.length > 0) {
    available.push({
      id: 'coming-soon',
      label: 'Coming soon',
      items: comingSoonItems,
    });
  }

  return available;
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
        badge: 'Soon',
        Icon: Braces,
        action: { kind: 'toast', message: 'JSON ingestion is on the roadmap.' },
      },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    items: [
      {
        id: 'supabase',
        label: 'Supabase',
        description: 'Connect via organization OAuth',
        Icon: Hexagon,
        action: { kind: 'select', value: 'supabase' },
      },
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

interface CatalogViewProps {
  hideFileSources?: boolean;
  onSelect: (type: ConnectorPanelSelect) => void;
}

export function CatalogView({ hideFileSources = false, onSelect }: CatalogViewProps) {
  const [query, setQuery] = useState('');

  const catalogSections = useMemo(() => {
    const source = hideFileSources ? SECTIONS.filter((section) => section.id !== 'files') : SECTIONS;
    return partitionCatalog(source);
  }, [hideFileSources]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogSections;
    return catalogSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            section.label.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query, catalogSections]);

  const handleItemClick = (item: CatalogItem) => {
    if (item.action.kind === 'toast') {
      toast.message(item.action.message);
      return;
    }
    onSelect(item.action.value);
  };

  return (
    <div className="ds-conn-catalog ds-conn-panel__body">
      <div className="ds-conn-catalog__search">
        <Search size={18} strokeWidth={2} aria-hidden className="ds-conn-catalog__search-icon" />
        <input
          type="search"
          className="ds-conn-catalog__search-input"
          placeholder="Search connectors…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search connectors"
        />
      </div>

      {filteredSections.length === 0 ? (
        <p className="ds-conn-catalog__empty">No connectors match your search.</p>
      ) : (
        filteredSections.map((section) => (
          <section key={section.id} className="ds-conn-catalog__section">
            <h3 className="ds-conn-catalog__section-label">{section.label}</h3>
            <div className="ds-conn-catalog__grid">
              {section.items.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`ds-conn-catalog__card ${item.action.kind === 'toast' ? 'is-soon' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="ds-conn-catalog__card-icon" aria-hidden>
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <div className="ds-conn-catalog__card-text">
                      <span className="ds-conn-catalog__card-title">{item.label}</span>
                      <span className="ds-conn-catalog__card-desc">{item.description}</span>
                    </div>
                    {item.badge ? (
                      <span className="ds-conn-catalog__badge">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
