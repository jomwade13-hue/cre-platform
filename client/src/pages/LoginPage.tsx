import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Eye, EyeOff, LogIn, Upload, X, Lock, Mail, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/Layout';

interface LoginPageProps {
  onLogin: () => void;
}

const ADMIN_EMAIL = 'jomwade13@icloud.com';
const ADMIN_PASS = 'H@nn@h123';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        onLogin();
      } else {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
      }
    }, 600);
  };

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-[hsl(222,47%,11%)] dark:via-[hsl(222,47%,14%)] dark:to-[hsl(221,83%,20%)]">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 z-20 w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-white/70 hover:bg-white border border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:border-white/[0.08] dark:text-white/60 dark:hover:text-white"
        aria-label="Toggle theme"
        data-testid="button-theme-toggle"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? 'white' : '#0f172a'} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-400/15 dark:bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Login Card */}
        <div className="bg-white/95 border border-slate-200 shadow-2xl shadow-slate-900/10 dark:bg-white/[0.06] dark:border-white/[0.08] dark:shadow-black/40 backdrop-blur-xl rounded-2xl p-8">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            {logo ? (
              <div className="relative group mb-4">
                <img src={logo} alt="Company logo" className="h-14 max-w-[200px] object-contain" />
                <button
                  onClick={() => setLogo('')}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="mb-4 cursor-pointer group" title="Upload company logo">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                />
                <p className="text-[10px] text-slate-400 dark:text-white/30 text-center mt-2 flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />Upload logo
                </p>
              </label>
            )}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Sign in to your client dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-white/50 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-blue-500/20 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                  data-testid="input-email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-white/50 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-blue-500/20 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                  data-testid="input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg px-3 py-2.5">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium" data-testid="text-login-error">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              data-testid="button-login"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-white/25">
              <span>Transcend Client Dashboard</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
