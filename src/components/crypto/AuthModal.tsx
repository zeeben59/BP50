import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { X, Eye, EyeOff, Mail, Lock, User, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';

const AuthModal: React.FC = () => {
  const {
    showAuthModal, setShowAuthModal,
    authMode, setAuthMode,
    login, register,
    requestOTP, verifyOTP, resetPassword,
    verifyRegistration
  } = useAppContext();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [show2FA, setShow2FA] = useState(false);

  // Steps for forgot password: 'email' | 'otp' | 'reset' | 'success'
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'reset' | 'success'>('email');
  const [registerStep, setRegisterStep] = useState<'form' | 'verify'>('form');

  if (!showAuthModal) return null;

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setError('');
    setSuccessMessage('');
    setResetStep('email');
    setRegisterStep('form');
    setShow2FA(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        const res = await login(email, password, show2FA ? otp : undefined);
        if (res === '2FA_REQUIRED') {
          setShow2FA(true);
          setSuccessMessage('Please enter your 2FA token.');
          return;
        }
        if (res !== true) setError(typeof res === 'string' ? res : 'Invalid credentials');
      } else if (authMode === 'register') {
        if (registerStep === 'form') {
          if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
          if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
          const res = await register(email, username, password);
          if (res === true) {
            // Should not happen if verification is enabled, but handle for safety
            setSuccessMessage('Account created successfully!');
          } else if (typeof res === 'object' && res.verificationRequired) {
            setRegisterStep('verify');
            setSuccessMessage('A verification code has been sent to your email.');
          } else {
            setError(typeof res === 'string' ? res : 'Registration failed');
          }
        } else {
          // Verification Step
          const res = await verifyRegistration(email, otp);
          if (!res.success) {
            setError(res.message);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (resetStep === 'email') {
        const res = await requestOTP(email);
        if (res.success) {
          setResetStep('otp');
          setSuccessMessage('An OTP has been sent to your email (check console).');
        } else {
          setError(res.message);
        }
      } else if (resetStep === 'otp') {
        const res = await verifyOTP(email, otp);
        if (res.success) {
          setResetStep('reset');
          setSuccessMessage('OTP verified. Set your new password.');
        } else {
          setError(res.message);
        }
      } else if (resetStep === 'reset') {
        if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        const res = await resetPassword(email, otp, password);
        if (res.success) {
          setResetStep('success');
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPassword = () => {
    if (resetStep === 'success') {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
          <p className="text-gray-400 text-sm mb-6">Your password has been updated successfully. You can now sign in with your new password.</p>
          <button
            onClick={() => { setAuthMode('login'); resetForm(); }}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            Go to Login
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleForgotStep} className="space-y-4">
        {resetStep === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="you@example.com"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Enter the email associated with your account to receive a 6-digit OTP.</p>
          </div>
        )}

        {resetStep === 'otp' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Enter 6-digit OTP</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 text-center tracking-[0.5em] font-bold text-lg"
                placeholder="000000"
              />
            </div>
          </div>
        )}

        {resetStep === 'reset' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Min 6 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </>
        )}

        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
        {successMessage && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{successMessage}</div>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing...' : (
            resetStep === 'email' ? 'Send OTP' :
              resetStep === 'otp' ? 'Verify OTP' : 'Reset Password'
          )}
        </button>

        <button
          type="button"
          onClick={() => { setAuthMode('login'); resetForm(); }}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm py-2 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Login
        </button>
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowAuthModal(false); resetForm(); }} />
      <div className="relative w-full max-w-md bg-[#111738] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500" />

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Welcome Back' : authMode === 'register' ? 'Create Account' : 'Reset Password'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {authMode === 'login' ? 'Sign in to your trading account' :
                  authMode === 'register' ? 'Start trading with $500 demo balance' :
                    'Follow the steps to reset your password'}
              </p>
            </div>
            <button onClick={() => { setShowAuthModal(false); resetForm(); }} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <X size={20} />
            </button>
          </div>

          {authMode === 'forgot_password' ? renderForgotPassword() : (
            <>
              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={show2FA}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {authMode === 'register' && registerStep === 'form' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text" value={username} onChange={e => setUsername(e.target.value)} required
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>
                )}

                {authMode === 'register' && registerStep === 'verify' && (
                  <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                      <Mail size={14} /> Check {email} for verification code
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Verification Code</label>
                      <div className="relative">
                        <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                        <input
                          type="text"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          required
                          maxLength={6}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 tracking-[0.5em] font-bold text-center text-lg"
                          placeholder="000000"
                          autoFocus
                        />
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <p className="text-[10px] text-gray-500">Check your inbox (and spam)</p>
                        <button
                          type="button"
                          onClick={() => { setError(''); setSuccessMessage(''); register(email, username, password); }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Resend Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(authMode === 'login' || (authMode === 'register' && registerStep === 'form')) && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-medium text-gray-300">Password</label>
                      {authMode === 'login' && !show2FA && (
                        <button
                          type="button"
                          onClick={() => { setAuthMode('forgot_password'); setError(''); }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)} required minLength={authMode === 'register' ? 6 : 1} disabled={show2FA}
                        className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                        placeholder={authMode === 'register' ? 'Min 6 characters' : 'Enter your password'}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {show2FA && (
                  <div className="animate-in fade-in zoom-in duration-300 mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">2FA Token (Authenticator App)</label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        required
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 tracking-widest font-mono text-center text-lg"
                        placeholder="000 000"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' :
                    authMode === 'login' ? 'Sign In' :
                      (registerStep === 'form' ? 'Create Account' : 'Verify Account')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">
                  {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setSuccessMessage(''); }}
                    className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </>
          )}

          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p className="text-gray-500 text-xs">Secured with JWT & Hash. No BVN or card details stored.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
