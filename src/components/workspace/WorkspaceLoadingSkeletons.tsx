import { cn } from '../../lib/utils';

/** Placeholder rows for recent chats while sessions hydrate. */
export function SessionListSkeleton({
  rows = 5,
  className,
}: Readonly<{ rows?: number; className?: string }>) {
  return (
    <output
      className={cn('flex flex-col gap-1.5 px-0.5 py-1', className)}
      aria-busy="true"
      aria-label="Loading recent chats"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="analytics-skeleton h-8 w-full rounded-md"
          style={{ width: `${88 - (i % 3) * 10}%` }}
        />
      ))}
      <span className="sr-only">Loading chats…</span>
    </output>
  );
}

/** Datasets / sources route gate while workspace catalogs settle. */
export function WorkspacePageSkeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <output
      className={cn('flex min-h-0 flex-1 flex-col gap-4 p-6 md:p-8', className)}
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="analytics-skeleton h-8 w-48 rounded-lg" />
        <div className="analytics-skeleton h-4 w-72 max-w-full rounded-md" />
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="analytics-skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading workspace…</span>
    </output>
  );
}
