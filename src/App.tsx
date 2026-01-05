import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ChatSessionProvider } from './context/ChatSessionContext';
import { UsageProvider } from './context/UsageContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Workspace } from './pages/Workspace';
import DatasetsPage from './pages/DatasetsPage';
import SessionsPage from './pages/SessionsPage';
import SettingsPage from './pages/SettingsPage';
import { MainLayout } from './components/layout/MainLayout';
import FeedbackModal from './components/common/FeedbackModal';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UsageProvider>
          <WorkspaceProvider>
            <ChatSessionProvider>
              <FeedbackProvider>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route path="/workspace/:id" element={<Workspace />} />
                    <Route path="/workspace/:id/datasets" element={<DatasetsPage />} />
                    <Route path="/workspace/:id/sessions" element={<SessionsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/general" element={<SettingsPage />} />
                    <Route path="/settings/security" element={<SettingsPage />} />
                    <Route path="/settings/billing" element={<SettingsPage />} />
                    <Route path="/settings/notifications" element={<SettingsPage />} />
                    <Route path="/settings/workspaces" element={<SettingsPage />} />
                    <Route path="/settings/members" element={<SettingsPage />} />
                    <Route path="/settings/help" element={<SettingsPage />} />
                    <Route path="/settings/about" element={<SettingsPage />} />
                  </Route>
                </Routes>
                <FeedbackModal />
              </FeedbackProvider>
            </ChatSessionProvider>
          </WorkspaceProvider>
        </UsageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
