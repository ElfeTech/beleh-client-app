import { Maximize2, Download, Share2 } from 'lucide-react';

interface ChartWidgetProps {
  title: string;
  summary?: string;
  children: React.ReactNode;
}

export function ChartWidget({ title, summary, children }: ChartWidgetProps) {
  return (
    <div className="mt-4 w-full bg-background border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {summary && <p className="text-[11px] text-muted-foreground mt-0.5">{summary}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-background rounded-lg text-muted-foreground transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg text-muted-foreground transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg text-muted-foreground transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-6 min-h-[300px] flex items-center justify-center">
        {children}
      </div>
      <div className="px-6 py-3 bg-muted/10 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium uppercase">Live Data</span>
        <button className="text-[10px] font-bold text-primary hover:underline">
          View Raw Data
        </button>
      </div>
    </div>
  );
}
