import { Outlet, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SideMenu } from './SideMenu';
import { TopNav } from './TopNav';
import BottomNav from './BottomNav';
import { useDatasource } from '../../context/DatasourceContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UsageWarningBanner } from '../usage/UsageWarningBanner';
import './Layout.css';

export function MainLayout() {
    const { id } = useParams<{ id: string }>();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        // Restore collapsed state from localStorage
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });

    const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
    const workspaceContext = useWorkspace();

    // Auto-Select last active dataset from backend state (Runs on both Mobile & Desktop)
    useEffect(() => {
        // If we already have a selection, don't override it
        if (selectedDatasourceId) return;

        const savedDatasetId = workspaceContext.workspaceContext?.state?.last_active_dataset_id;
        const dataSources = workspaceContext.datasources || [];

        if (savedDatasetId && dataSources.some(ds => ds.id === savedDatasetId)) {
            setSelectedDatasourceId(savedDatasetId);
        } else if (dataSources.length > 0) {
            // Fallback to first available if backend state is empty or invalid
            setSelectedDatasourceId(dataSources[0].id);
        }
    }, [workspaceContext.workspaceContext, workspaceContext.datasources, selectedDatasourceId, setSelectedDatasourceId]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleToggleCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebar-collapsed', String(newState));
            return newState;
        });
    };

    return (
        <div className="main-layout">
            {/* Desktop: Show sidebar */}
            {!isMobile && (
                <SideMenu
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />
            )}

            <div className={`main-content-wrapper ${isMobile ? 'mobile' : ''} ${!isMobile && isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Desktop: Show top nav */}
                {!isMobile && <TopNav />}

                <main className={`main-content ${isMobile ? 'mobile-content-wrapper' : ''}`}>
                    <UsageWarningBanner />
                    <Outlet />
                </main>
            </div>

            {/* Mobile: Show bottom navigation */}
            {isMobile && <BottomNav workspaceId={id || '1'} />}
        </div>
    );
}
