import React from 'react';
import { Printer, Shield, FileText, Package, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'upload' | 'my-orders' | 'admin';
  setActiveTab: (tab: 'upload' | 'my-orders' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, profile, isAdmin, signOut, isDemoMode, setDemoRole, isSupabaseConfigured } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-md shadow-black/20">
      {/* Demo Mode Alert Banner */}
      {!isSupabaseConfigured && (
        <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-700/90 text-amber-50 text-xs py-1.5 px-4 border-b border-amber-500/30">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold flex items-center gap-1 text-white">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
                Demo / Local Mode:
              </span>
              <span className="text-amber-100">Testing is 100% functional. Switch roles instantly:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDemoRole('customer');
                  if (activeTab === 'admin') setActiveTab('upload');
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                  !isAdmin
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'bg-black/30 text-white hover:bg-black/40'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoRole('admin');
                  setActiveTab('admin');
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                  isAdmin
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'bg-black/30 text-white hover:bg-black/40'
                }`}
              >
                Admin (Shop Owner)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => setActiveTab(isAdmin ? 'admin' : 'upload')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 group-hover:shadow-indigo-500/50 transition duration-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-indigo-400 transition">
                  PrintFlow
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wider">
                  Express
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                ₹3 / page • Instant UPI & Print
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'upload'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline">New Print</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-orders')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'my-orders'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden xs:inline">My Orders</span>
            </button>

            {/* Admin Dashboard Tab (Protected) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === 'admin'
                    ? 'bg-purple-600/25 text-purple-300 border border-purple-500/50 shadow-inner'
                    : 'text-purple-400 hover:bg-purple-900/30'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user || isDemoMode ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs uppercase shadow-xs">
                    {profile?.full_name ? profile.full_name[0] : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
                      {profile?.full_name || 'Customer'}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        isAdmin
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Customer'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
