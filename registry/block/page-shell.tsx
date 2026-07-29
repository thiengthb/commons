import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one page wrapper every route uses — the single source of truth for page-level rhythm.
 *
 * The app shell owns horizontal width and side padding; this owns everything else. Before it existed,
 * every page hand-rolled its own `py-8 space-y-6` + max-width + breadcrumb and they drifted apart (some
 * pages shipped with no breadcrumb at all, max-widths ranged from max-w-2xl to max-w-5xl at random).
 *
 * Everything app-specific is a SLOT, so this file stays identical in every repo: the app supplies its own
 * breadcrumb node, its own header actions, its own mobile bar. No next/* import — it works in any React app.
 *
 * Platform standard: `platform/standards/ui-layout.md`.
 */

export type PageWidth = 'full' | 'wide' | 'narrow' | 'form';

// `full` inherits the app shell's own max-width (data-dense pages: tables, grids, dashboards) and is the
// default and the norm. The narrower tiers centre reading-width content (detail pages, forms, admin) and
// are used sparingly — scattering per-page max-widths is the drift this component exists to stop.
const WIDTH: Record<PageWidth, string> = {
  full: '',
  wide: 'mx-auto max-w-5xl',
  narrow: 'mx-auto max-w-3xl',
  form: 'mx-auto max-w-2xl',
};

interface PageShellProps {
  children: ReactNode;
  /** The breadcrumb trail. The app owns its own route-to-crumb map and passes the rendered node. */
  breadcrumb?: ReactNode;
  /** On the header row, beside the breadcrumb — a `<TabsList>` and/or a page action. */
  headerAside?: ReactNode;
  /** Pinned to the far right of the header row on every page — a notification bell, an avatar. */
  actions?: ReactNode;
  /** First on the header row — typically a mobile-only bar (app icon + sidebar opener). */
  leading?: ReactNode;
  /** Content max-width tier. Defaults to `full`. */
  width?: PageWidth;
  className?: string;
}

export function PageShell({
  children,
  breadcrumb,
  headerAside,
  actions,
  leading,
  width = 'full',
  className,
}: PageShellProps) {
  const hasHeader = Boolean(leading || breadcrumb || headerAside || actions);
  return (
    // `text-sm` is the body baseline: page content inherits 14px so a bare content block never renders
    // larger than its own heading. Headings opt UP, meta opts DOWN to text-xs.
    <div className={cn('space-y-4 py-6 text-sm', WIDTH[width], className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {leading}
          {breadcrumb}
          {headerAside}
          {/* `ml-auto` pins the actions right whatever else is on the row — including a page with
              nothing else on it at all. */}
          {actions && <div className="ml-auto shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
