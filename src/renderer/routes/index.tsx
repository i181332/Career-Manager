import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import CompaniesPage from '../pages/CompaniesPage';
import CompanyDetailPage from '../pages/CompanyDetailPage';
import EventsPage from '../pages/EventsPage';
import NotificationsPage from '../pages/NotificationsPage';
import ESPage from '../pages/ESPage';
import SelfAnalysisPage from '../pages/SelfAnalysisPage';
import InterviewNotePage from '../pages/InterviewNotePage';
import AnalyticsPage from '../pages/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import EmailsPage from '../pages/EmailsPage';
import Layout from '../components/Layout';
import { useAuthStore } from '../stores/authStore';

// 認証チェック用のコンポーネント
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 認証不要のルート */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 認証が必要なルート */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="es" element={<ESPage />} />
        <Route path="self-analysis" element={<SelfAnalysisPage />} />
        <Route path="interview-notes" element={<InterviewNotePage />} />
        <Route path="emails" element={<EmailsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRouter;
