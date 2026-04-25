import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, AppLayout } from '@/components/Layout';
import PortfolioTracker from '@/pages/PortfolioTracker';
import LoginPage from '@/pages/LoginPage';
import ClientPortal, { type PortfolioRole } from '@/pages/ClientPortal';

type AppScreen = 'login' | 'portal' | 'dashboard';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [userRole, setUserRole] = useState<PortfolioRole>('owner');

  const handleLogin = () => {
    setScreen('portal');
  };

  const handleSelectPortfolio = (portfolio: { name: string; userRole: PortfolioRole }) => {
    setSelectedPortfolio(portfolio.name);
    setUserRole(portfolio.userRole);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setScreen('login');
    setSelectedPortfolio('');
    setUserRole('owner');
  };

  const handleBackToPortal = () => {
    setScreen('portal');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {screen === 'login' && <LoginPage onLogin={handleLogin} />}
        {screen === 'portal' && (
          <ClientPortal
            onSelectPortfolio={handleSelectPortfolio}
            onLogout={handleLogout}
          />
        )}
        {screen === 'dashboard' && (
          <AppLayout
            title={selectedPortfolio || 'Portfolio Tracker'}
            subtitle="Lease portfolio management & strategic planning"
            onBackToPortal={handleBackToPortal}
            onLogout={handleLogout}
            userRole={userRole}
          >
            <PortfolioTracker userRole={userRole} />
          </AppLayout>
        )}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
