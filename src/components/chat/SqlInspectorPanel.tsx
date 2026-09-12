import { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import './SqlInspectorPanel.css';

interface SqlInspectorPanelProps {
  sql: string;
  schemaTarget?: string | null;
}

export function SqlInspectorPanel({ sql, schemaTarget }: SqlInspectorPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast.success('SQL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy SQL');
    }
  };

  return (
    <div className="sql-inspector">
      <div className="sql-inspector__header">
        <div className="sql-inspector__title">
          <Terminal className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>Compiled SQL pipeline compiler</span>
        </div>
        <button type="button" className="sql-inspector__copy" onClick={() => void handleCopy()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Script
        </button>
      </div>
      <pre className="sql-inspector__code">
        <code>{sql}</code>
      </pre>
      {schemaTarget ? (
        <div className="sql-inspector__footer">
          <span className="sql-inspector__footer-label">Schema target:</span>
          <span className="sql-inspector__schema-pill">{schemaTarget}</span>
        </div>
      ) : null}
    </div>
  );
}
