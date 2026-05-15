/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import RoundsPage from './pages/RoundsPage';
import RoundRoom from './pages/RoundRoom';
import ExpressionsPage from './pages/ExpressionsPage';
import SchedulesPage from './pages/SchedulesPage';
import AdminPanel from './pages/AdminPanel';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import ThemeToggle from './components/ThemeToggle';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'landing' | 'auth' | 'dashboard' | 'rounds' | 'round-room' | 'expressions' | 'schedules' | 'admin' | 'profile' | 'community';

function AppContent() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [roundsTab, setRoundsTab] = useState<'active' | 'completed'>('active');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-primary)] border-t-transparent"></div>
      </div>
    );
  }

  // Route protection
  const navigate = (page: Page, params?: { roundId?: string, tab?: 'active' | 'completed' }) => {
    if (page === 'round-room' && params?.roundId) {
      setActiveRoundId(params.roundId);
    }
    if (page === 'rounds' && params?.tab) {
      setRoundsTab(params.tab);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    if (!user && currentPage !== 'landing' && currentPage !== 'auth') {
      return <LandingPage onNavigate={navigate} />;
    }

    switch (currentPage) {
      case 'landing': return <LandingPage onNavigate={navigate} />;
      case 'auth': return <AuthPage onNavigate={navigate} />;
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'rounds': return <RoundsPage onNavigate={navigate} initialTab={roundsTab} />;
      case 'round-room': return activeRoundId ? <RoundRoom roundId={activeRoundId} onNavigate={navigate} /> : <RoundsPage onNavigate={navigate} />;
      case 'expressions': return <ExpressionsPage onNavigate={navigate} />;
      case 'schedules': return <SchedulesPage onNavigate={navigate} />;
      case 'admin': return isAdmin ? <AdminPanel onNavigate={navigate} /> : <Dashboard onNavigate={navigate} />;
      case 'profile': return <ProfilePage onNavigate={navigate} />;
      case 'community': return <CommunityPage onNavigate={navigate} />;
      default: return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500">
      <ThemeToggle />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
