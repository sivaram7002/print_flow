import React, { useState } from 'react';
import { Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SignInPrompt: React.FC = () => {
  const { signInWithGoogle, setDemoRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize Google Sign-in. Please ensure Supabase Google OAuth is configured.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 rounded-3xl shadow-2xl shadow-black/80 border border-slate-800 backdrop-blur-xl overflow-hidden">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-tr from-indigo-700 via-indigo-900 to-slate-950 p-8 text-white text-center relative overflow-hidden border-b border-indigo-500/20">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 backdrop-blur-md">
              <Printer className="w-8 h-8 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">PrintFlow Express</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Smart & Instant PDF Printing Service
            </p>
            <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-300 tracking-wide">
              <span>Flat ₹3 per page</span>
              <span>•</span>
              <span>Instant UPI & GPay</span>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white text-center">
              Sign in to Print Your Documents
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 text-center">
              Upload your PDF, see live page counts, pay with UPI, and track your print jobs in real-time.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action: Google Sign-in */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-sm shadow-md hover:border-slate-600 transition disabled:opacity-60"
            >
              {/* Google G SVG Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Quick Demo Login Option for review/testing */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-bold tracking-wider">
                Or Instant Preview
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDemoRole('customer')}
              className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-200 text-xs font-bold text-center transition group flex flex-col items-center gap-1.5"
            >
              <span className="text-white">Test as Customer</span>
              <span className="text-[11px] text-indigo-400 font-normal">
                Upload & Pay flow
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDemoRole('admin')}
              className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 text-xs font-bold text-center transition group flex flex-col items-center gap-1.5"
            >
              <span className="text-white">Test as Admin</span>
              <span className="text-[11px] text-purple-400 font-normal">
                Verify & Manage
              </span>
            </button>
          </div>

          {/* Feature list */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Only PDF format up to 20 MB accepted</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant client-side page counting</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct GPay / PhonePe UPI deep linking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
