import React, { useState } from 'react';
import { useAdminMutations } from '@/hooks/useAdmin';
import { useAppContext } from '@/contexts/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, ShieldAlert, Key, Check, AlertTriangle, Loader2 } from 'lucide-react';

const AdminSecurity = () => {
  const { user, refreshUser } = useAppContext();
  const { setup2FA, verify2FA } = useAdminMutations();

  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // If the user already has 2FA enabled, the backend will return an error or we could check a `has_2fa` flag.
  // For simplicity, we just allow generating a new one which overwrites the old unverified secret.

  const handleBeginSetup = () => {
    setup2FA.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data?.secret && data?.uri) {
          setSetupData({ secret: data.secret, uri: data.uri });
        }
      }
    });
  };

  const handleVerify = () => {
    verify2FA.mutate({ token }, {
      onSuccess: () => {
        setSetupData(null);
        setToken('');
        refreshUser(); // Update the local user object to show 'Active' status
      }
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-slate-200">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-purple-500/10 flex items-center justify-center rounded-xl border border-purple-500/20">
          <ShieldAlert className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white">Administrator Security</h1>
          <p className="text-slate-400 mt-1">Manage Two-Factor Authentication (2FA) for your superadmin account.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold flex items-center text-slate-200 mb-4">
            <Shield className="w-5 h-5 mr-3 text-emerald-400" />
            Two-Factor Authentication
          </h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Enhance the security of your administrator account by requiring a time-based one-time password (TOTP) from an authenticator app (like Google Authenticator or Authy) when logging in.
          </p>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-slate-400">Status:</span>
            {user?.two_factor_enabled ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                Not Enabled
              </span>
            )}
          </div>
          
          {/* Render setup button or QR code conditionally */}
          {!setupData ? (
            <button
              className={`w-full font-bold py-3 rounded-lg transition-all shadow-lg mt-6 flex items-center justify-center gap-2 ${
                user?.two_factor_enabled 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
              }`}
              onClick={handleBeginSetup}
              disabled={setup2FA.isPending}
            >
              {setup2FA.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : user?.two_factor_enabled ? (
                <>
                  <Shield className="w-5 h-5" />
                  Reset 2FA Configuration
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Begin 2FA Setup
                </>
              )}
            </button>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300 mt-6">
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
                <p className="text-sm text-slate-400 mb-4 text-center">Scan this QR Code with Google Authenticator or Authy</p>
                <div className="bg-white p-4 rounded-xl shadow-xl">
                  <QRCodeSVG value={setupData.uri} size={200} />
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Cannot scan? Manual entry key:<br/>
                  <code className="text-purple-400 font-mono text-sm tracking-widest mt-1 block select-all">{setupData.secret}</code>
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300">Verify 2FA Token</label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    maxLength={6}
                    className="bg-slate-950 border border-slate-800 outline-none focus:ring-1 focus:ring-purple-500 rounded-lg p-3 text-slate-200 uppercase tracking-widest font-mono flex-1 text-center text-lg"
                    value={token}
                    onChange={e => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center shadow-lg shadow-emerald-500/20"
                    disabled={token.length !== 6 || verify2FA.isPending}
                    onClick={handleVerify}
                  >
                    {verify2FA.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
                    Verify
                  </button>
                </div>
                <p className="text-xs text-slate-500"><AlertTriangle className="w-3 h-3 inline mr-1 text-orange-500" /> Enter the 6-digit code from your app to complete setup.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSecurity;
