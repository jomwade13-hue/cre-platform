import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, AppLayout } from '@/components/Layout';
import PortfolioTracker from '@/pages/PortfolioTracker';
import LoginPage from '@/pages/LoginPage';
import ClientPortal, { type PortfolioRole } from '@/pages/ClientPortal';
import AdminUsers from '@/pages/AdminUsers';
import { StorageRecoveryDialog } from '@/components/StorageRecoveryDialog';
import { fetchMe, logout as apiLogout, type MeResponse } from '@/lib/auth';

type AppScreen = 'login' | 'portal' | 'dashboard' | 'admin';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [userRole, setUserRole] = useState<PortfolioRole>('owner');
  const [session, setSession] = useState<MeResponse | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Restore an existing session on mount.
  useEffect(() => {
    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        if (me) {
          setSession(me);
          setScreen('portal');
        }
      })
      .catch(() => { /* stay on login */ })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  const handleLogin = (me: MeResponse) => {
    setSession(me);
    setScreen('portal');
  };

  const handleSelectPortfolio = (portfolio: { name: string; userRole: PortfolioRole }) => {
    setSelectedPortfolio(portfolio.name);
    setUserRole(portfolio.userRole);
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    setSession(null);
    setScreen('login');
    setSelectedPortfolio('');
    setUserRole('owner');
  };

  const handleBackToPortal = () => {
    setScreen('portal');
  };

  if (restoring) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[hsl(222,47%,11%)]">
            <span className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {screen === 'login' && <LoginPage onLogin={handleLogin} />}
        {screen === 'portal' && session && (
          <ClientPortal
            session={session}
            onSelectPortfolio={handleSelectPortfolio}
            onLogout={handleLogout}
            onOpenAdmin={() => setScreen('admin')}
          />
        )}
        {screen === 'admin' && session?.user.role === 'admin' && (
          <AdminUsers onBack={handleBackToPortal} onLogout={handleLogout} />
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
        {/* Global handler that opens a recovery dialog if any IndexedDB write
            fails (almost always: browser quota exceeded). */}
        <StorageRecoveryDialog />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
