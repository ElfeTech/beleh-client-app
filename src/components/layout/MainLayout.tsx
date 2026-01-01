import { Outlet, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SideMenu } from './SideMenu';
import { TopNav } from './TopNav';
import BottomNav from './BottomNav';
import { DatasourceProvider } from '../../context/DatasourceContext';
import { UsageWarningBanner } from '../usage/UsageWarningBanner';
import './Layout.css';

export function MainLayout() {
    const { id } = useParams<{ id: string }>();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <DatasourceProvider>
            <div className="main-layout">
                {/* Desktop: Show sidebar */}
                {!isMobile && <SideMenu />}

                <div className={`main-content-wrapper ${isMobile ? 'mobile' : ''}`}>
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
        </DatasourceProvider>
    );
}
