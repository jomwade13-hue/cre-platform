import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, AppLayout } from '@/components/Layout';
import PortfolioTracker from '@/pages/PortfolioTracker';
import LoginPage, { type SessionUser } from '@/pages/LoginPage';
import ClientPortal, { type PortfolioRole } from '@/pages/ClientPortal';
import { StorageRecoveryDialog } from '@/components/StorageRecoveryDialog';

type AppScreen = 'login' | 'portal' | 'dashboard';

interface SelectedPortfolio {
  id: number;
  name: string;
  userRole: PortfolioRole;
  logo?: string;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [selectedPortfolio, setSelectedPortfolio] = useState<SelectedPortfolio | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const handleLogin = (user: SessionUser) => {
    setSessionUser(user);
    setScreen('portal');
  };

  const handleSelectPortfolio = (portfolio: { id: number; name: string; userRole: PortfolioRole; logo?: string }) => {
    setSelectedPortfolio({ id: portfolio.id, name: portfolio.name, userRole: portfolio.userRole, logo: portfolio.logo });
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setScreen('login');
    setSelectedPortfolio(null);
    setSessionUser(null);
  };

  const handleBackToPortal = () => {
    setScreen('portal');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {screen === 'login' && <LoginPage onLogin={handleLogin} />}
        {screen === 'portal' && sessionUser && (
          <ClientPortal
            currentUser={sessionUser}
            onSelectPortfolio={handleSelectPortfolio}
            onLogout={handleLogout}
          />
        )}
        {screen === 'dashboard' && selectedPortfolio && (
          <AppLayout
            title={selectedPortfolio.name || 'Portfolio Tracker'}
            subtitle="Lease portfolio management & strategic planning"
            onBackToPortal={handleBackToPortal}
            onLogout={handleLogout}
            userRole={selectedPortfolio.userRole}
            portfolioId={selectedPortfolio.id}
          >
            {/* key= forces a clean remount per portfolio so each one loads its own isolated data */}
            <PortfolioTracker
              key={selectedPortfolio.id}
              portfolioId={selectedPortfolio.id}
              portfolioName={selectedPortfolio.name}
              userRole={selectedPortfolio.userRole}
              currentUserName={sessionUser?.name ?? 'Jordan Wade'}
              portfolioLogo={selectedPortfolio.logo}
            />
          </AppLayout>
        )}
        <Toaster />
        {/* Global handler that opens a recovery dialog if any IndexedDB write
            fails (almost always: browser quota exceeded). */}
        <StorageRecoveryDialog />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
