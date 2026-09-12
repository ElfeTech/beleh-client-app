import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import './MarkdownText.css';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/** Renders assistant narrative as Markdown (GFM: tables, strikethrough, task lists, etc.). */
export function MarkdownText({ children, className }: Readonly<MarkdownTextProps>) {
  if (!children) return null;

  return (
    <div className={cn('md-text', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
          table: ({ children: tableChildren }) => (
            <div className="md-text__table-wrap">
              <table>{tableChildren}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
