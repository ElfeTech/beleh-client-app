import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import './CopyTextButton.css';

interface CopyTextButtonProps {
  text: string;
  /** Toast / aria label context, e.g. "prompt" or "response" */
  label?: string;
  className?: string;
  /** Icon-only (default) or show "Copy" text */
  showLabel?: boolean;
}

export function CopyTextButton({
  text,
  label = 'text',
  className,
  showLabel = false,
}: Readonly<CopyTextButtonProps>) {
  const [copied, setCopied] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      const successMsg =
        label === 'prompt'
          ? 'Prompt copied'
          : label === 'response'
            ? 'Response copied'
            : 'Copied to clipboard';
      toast.success(successMsg);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy ${label}`);
    }
  };

  return (
    <button
      type="button"
      className={cn('copy-text-btn', className)}
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      {showLabel ? <span>{copied ? 'Copied' : 'Copy'}</span> : null}
    </button>
  );
}
