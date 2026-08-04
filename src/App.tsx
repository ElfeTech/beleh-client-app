import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ChatSessionProvider } from './context/ChatSessionContext';
import { UsageProvider } from './context/UsageContext';

import { DatasourceProvider } from './context/DatasourceContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthSessionGate } from './components/auth/AuthSessionGate';
import { AuthSessionWatcher } from './components/auth/AuthSessionWatcher';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootRoute } from './routes/RootRoute';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { Workspace } from './pages/Workspace';
import DatasetsPage from './pages/DatasetsPage';
import { DatasetPreviewPage } from './pages/DatasetPreviewPage';
import SettingsPage from './pages/SettingsPage';
import { BillingSuccessPage } from './pages/BillingSuccessPage';
import { ProviderOAuthCallback } from './pages/ProviderOAuthCallback';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { MainLayout } from './components/layout/MainLayout';
import FeedbackModal from './components/common/FeedbackModal';
import { ClarityInit } from './components/analytics/ClarityInit';
import { GoogleAnalyticsInit } from './components/analytics/GoogleAnalyticsInit';

function WorkspaceSessionsRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/workspace/${id}` : '/settings/workspaces'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ClarityInit />
      <GoogleAnalyticsInit />
      <ThemeProvider>
        <AuthProvider>
          <AuthSessionWatcher />
          <UsageProvider>
            <WorkspaceProvider>
              <DatasourceProvider>
                <ChatSessionProvider>
                  <FeedbackProvider>
                    <Toaster
                      position="top-center"
                      richColors
                      closeButton
                      toastOptions={{
                        style: {
                          background: 'var(--card-background)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-primary)',
                        },
                      }}
                    />
                    <ErrorBoundary>
                      <Routes>
                        {/* Public routes , allowlisted in src/lib/publicRoutes.ts */}
                        <Route path="/" element={<RootRoute />} />
                        <Route path="/signin" element={<SignIn />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
                        <Route path="/auth/provider/callback" element={<ProviderOAuthCallback />} />
                        <Route path="/error" element={<ServerErrorPage />} />

                        {/* All other app routes require session validation */}
                        <Route
                          element={
                            <AuthSessionGate>
                              <MainLayout />
                            </AuthSessionGate>
                          }
                        >
                          <Route path="/workspace/:id" element={<Workspace />} />
                          <Route path="/workspace/:id/datasets" element={<DatasetsPage />} />
                          <Route
                            path="/workspace/:id/datasets/:datasetId/preview"
                            element={<DatasetPreviewPage />}
                          />
                          <Route
                            path="/workspace/:id/sessions"
                            element={<WorkspaceSessionsRedirect />}
                          />
                          <Route
                            path="/workspace/:id/statistics"
                            element={<Navigate to="/settings/usage" replace />}
                          />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/settings/general" element={<SettingsPage />} />
                          <Route path="/settings/security" element={<SettingsPage />} />
                          <Route path="/settings/usage" element={<SettingsPage />} />
                          <Route path="/settings/billing" element={<SettingsPage />} />
                          <Route
                            path="/settings/billing/success"
                            element={<BillingSuccessPage />}
                          />
                          <Route path="/settings/notifications" element={<SettingsPage />} />
                          <Route path="/settings/workspaces" element={<SettingsPage />} />
                          <Route path="/settings/members" element={<SettingsPage />} />
                          <Route path="/settings/help" element={<SettingsPage />} />
                          <Route path="/settings/about" element={<SettingsPage />} />
                        </Route>

                        {/* Unknown paths → dedicated 404 (public) */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </ErrorBoundary>
                    <FeedbackModal />
                  </FeedbackProvider>
                </ChatSessionProvider>
              </DatasourceProvider>
            </WorkspaceProvider>
          </UsageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
