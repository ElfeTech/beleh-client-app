import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import logoImage from '../../assets/logo.webp';
import { UnifiedSidebar } from './UnifiedSidebar';
import { UsageWarningBanner } from '../usage/UsageWarningBanner';
import BottomNav from './BottomNav';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../../context/WorkspaceContext';

export function MainLayout() {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const location = useLocation();
    const { currentWorkspace } = useWorkspace();

    const workspaceIdFromPath = useMemo(() => {
        const m = location.pathname.match(/^\/workspace\/([^/]+)/);
        const id = m?.[1];
        return id && id !== 'undefined' ? id : null;
    }, [location.pathname]);

    const workspaceIdForReturn = useMemo(() => {
        if (workspaceIdFromPath) return workspaceIdFromPath;
        const ctxId = currentWorkspace?.id;
        if (ctxId && ctxId !== 'undefined') return ctxId;
        try {
            const v = localStorage.getItem('activeWorkspaceId');
            return v && v !== 'undefined' ? v : null;
        } catch {
            return null;
        }
    }, [workspaceIdFromPath, currentWorkspace?.id]);

    const onSettingsRoute = location.pathname.startsWith('/settings');

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setMobileDrawerOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobile) setMobileDrawerOpen(false);
    }, [isMobile]);

    return (
        <div className="flex h-screen overflow-hidden font-sans bg-[color:var(--bg-secondary)]">
            {!isMobile && <UnifiedSidebar />}

            {isMobile && (
                <>
                    <header className="fixed left-0 right-0 top-0 z-[900] flex h-14 items-center gap-3 border-b border-[color:var(--border-primary)] bg-[color:var(--bg-primary)] px-3 pt-[env(safe-area-inset-top)] shadow-sm">
                        <button
                            type="button"
                            onClick={() => setMobileDrawerOpen((o) => !o)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)] text-[color:var(--text-primary)] transition-colors active:scale-[0.98]"
                            aria-expanded={mobileDrawerOpen}
                            aria-controls="mobile-nav-drawer"
                            aria-label={mobileDrawerOpen ? 'Close menu' : 'Open menu'}
                        >
                            {mobileDrawerOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
                        </button>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <img
                                src={logoImage}
                                alt="Beleh"
                                className="h-7 w-auto max-w-[7.5rem] shrink-0 object-contain object-left"
                            />
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                                {onSettingsRoute ? 'Settings' : workspaceIdFromPath ? 'Workspace' : 'Menu'}
                            </p>
                        </div>
                        {onSettingsRoute && workspaceIdForReturn ? (
                            <Link
                                to={`/workspace/${workspaceIdForReturn}`}
                                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)] px-3 py-2 text-xs font-bold text-[color:var(--text-primary)] transition-colors active:scale-[0.98]"
                            >
                                <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
                                <span className="max-w-[5.5rem] truncate sm:max-w-none">Chat</span>
                            </Link>
                        ) : null}
                    </header>

                    {mobileDrawerOpen && (
                        <>
                            <button
                                type="button"
                                className="fixed inset-0 z-[1090] bg-black/50 backdrop-blur-[2px]"
                                aria-label="Close menu"
                                onClick={() => setMobileDrawerOpen(false)}
                            />
                            <div
                                id="mobile-nav-drawer"
                                className="fixed bottom-0 left-0 top-0 z-[1100] flex w-[min(90vw,288px)] max-w-full flex-col border-r border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] shadow-2xl"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Navigation"
                            >
                                <div className="flex shrink-0 items-center justify-end border-b border-[color:var(--border-primary)] bg-[color:var(--bg-primary)] px-2 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                                    <button
                                        type="button"
                                        onClick={() => setMobileDrawerOpen(false)}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-tertiary)]"
                                        aria-label="Close menu"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                    <UnifiedSidebar />
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            <div
                className={cn(
                    'relative flex min-w-0 flex-1 flex-col',
                    isMobile && 'pt-14',
                    isMobile && workspaceIdFromPath && 'pb-[calc(64px+env(safe-area-inset-bottom,0px))]'
                )}
            >
                <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <UsageWarningBanner />
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <Outlet />
                    </div>
                </main>
                {isMobile && workspaceIdFromPath ? <BottomNav workspaceId={workspaceIdFromPath} /> : null}
            </div>
        </div>
    );
}
