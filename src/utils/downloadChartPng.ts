import { toast } from 'sonner';

/** Resolve a paint-able background so exports are never transparent. */
function resolveBackgroundColor(el: HTMLElement): string {
  let node: HTMLElement | null = el;
  while (node) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    node = node.parentElement;
  }
  return '#ffffff';
}

export function chartPngFilename(title: string | undefined | null): string {
  const slug = (title || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'chart'}-${date}.png`;
}

/**
 * Render a chart container to a PNG download (2x scale for crisp export).
 * html2canvas is imported lazily so chart pages don't pay for it upfront.
 */
export async function downloadElementAsPng(
  el: HTMLElement | null,
  title?: string | null,
): Promise<void> {
  if (!el) return;
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: resolveBackgroundColor(el),
      logging: false,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = chartPngFilename(title);
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Failed to export chart as PNG:', err);
    toast.error('Could not export the chart as PNG. Please try again.');
  }
}
