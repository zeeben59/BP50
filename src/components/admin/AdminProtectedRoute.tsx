import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isAdmin, authLoading, login } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | '2fa'>('login');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060a1e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If already logged in and is an admin, grant access directly.
  if (isLoggedIn && isAdmin) return <>{children}</>;
  
  // If logged in but NOT an admin, throw them to the unauthorized screen.
  if (isLoggedIn && !isAdmin) return <Navigate to="/unauthorized" replace />;

  // If NOT logged in, show the standalone Admin Login form.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, step === '2fa' ? otp : undefined);
    
    if (result !== true) {
      if (result === '2FA_REQUIRED') {
         setStep('2fa');
         setError(''); // Clear previous errors
      } else {
         setError(typeof result === 'string' ? result : 'Invalid credentials');
         if (step === '2fa') setOtp('');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#060a1e] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Console</h1>
          <p className="text-slate-500 text-sm mt-2">
            {step === 'login' ? 'Sign into your master account' : 'Verification Required'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-[#0a0e27] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>

          <div className="space-y-5">
            {step === 'login' ? (
              <>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="superadmin@example.com"
                    autoFocus
                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 placeholder-slate-600 transition-all"
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 placeholder-slate-600 transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Step */
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="block text-sm font-medium text-slate-300 mb-4 text-center">
                  Enter the 6-digit code from your authenticator app
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-4 text-2xl font-mono tracking-[1em] text-center focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 placeholder-slate-700 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => { setStep('login'); setOtp(''); setError(''); }}
                  className="w-full text-xs text-slate-500 hover:text-red-400 mt-4 transition-colors"
                  disabled={loading}
                >
                  Back to Login
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={(step === 'login' ? (!email || !password) : otp.length !== 6) || loading}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/20 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Authenticating...' : (step === 'login' ? 'Secure Login' : 'Verify Code')}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-600 leading-relaxed uppercase tracking-widest font-semibold">
              Authorized Personnel Only
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProtectedRoute;
