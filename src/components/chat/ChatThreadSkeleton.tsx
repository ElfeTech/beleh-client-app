import { cn } from '../../lib/utils';

/**
 * Lightweight chat body placeholder shown while session/history hydrate.
 * Keeps the chat canvas visible without flashing welcome prompts.
 */
export function ChatThreadSkeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <output
      className={cn('flex w-full flex-col gap-5 py-2 md:gap-6', className)}
      aria-busy="true"
      aria-label="Loading conversation"
    >
      <div className="flex w-full justify-end">
        <div className="analytics-skeleton h-14 w-[min(70%,22rem)] rounded-2xl" />
      </div>
      <div className="flex w-full justify-start">
        <div className="analytics-skeleton h-28 w-[min(85%,36rem)] rounded-2xl" />
      </div>
      <div className="flex w-full justify-end">
        <div className="analytics-skeleton h-12 w-[min(55%,18rem)] rounded-2xl" />
      </div>
      <div className="flex w-full justify-start">
        <div className="analytics-skeleton h-36 w-[min(80%,32rem)] rounded-2xl" />
      </div>
      <span className="sr-only">Loading conversation…</span>
    </output>
  );
}
