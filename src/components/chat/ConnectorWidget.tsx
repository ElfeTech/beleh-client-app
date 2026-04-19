import { Database, FileUp, Globe, Plus, ChevronRight } from 'lucide-react';

interface ConnectorOption {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  type: 'db' | 'file' | 'saas';
}

const CONNECTORS: ConnectorOption[] = [
  { id: 'postgres', name: 'PostgreSQL', icon: Database, description: 'Connect to your RDS or local instance', type: 'db' },
  { id: 'mysql', name: 'MySQL', icon: Database, description: 'Connect to your MySQL database', type: 'db' },
  { id: 'excel', name: 'Excel / CSV', icon: FileUp, description: 'Upload spreadsheets or text files', type: 'file' },
  { id: 'gsheets', name: 'Google Sheets', icon: Globe, description: 'Connect to a shared Google Sheet', type: 'saas' },
];

export function ConnectorWidget({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full max-w-2xl text-left">
      {CONNECTORS.map((connector) => (
        <button
          key={connector.id}
          onClick={() => onSelect(connector.id)}
          className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border hover:border-primary hover:shadow-md transition-all group"
        >
          <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
            <connector.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{connector.name}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{connector.description}</p>
          </div>
        </button>
      ))}
      <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-muted/50 border border-dashed border-border hover:border-primary transition-colors text-xs font-medium text-muted-foreground hover:text-primary md:col-span-2">
        <Plus className="w-4 h-4" />
        Request a new connector
      </button>
    </div>
  );
}
