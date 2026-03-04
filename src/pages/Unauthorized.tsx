import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
          <ShieldAlert size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">
            You do not have permission to access the Admin Dashboard.
            This area is restricted to administrators and super administrators only.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
