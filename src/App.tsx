import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SignInPrompt } from './components/SignInPrompt';
import { UploadOrderPage } from './components/UploadOrderPage';
import { MyOrdersPage } from './components/MyOrdersPage';
import { AdminDashboard } from './components/AdminDashboard';
import { PdfViewerModal } from './components/PdfViewerModal';

const AppContent: React.FC = () => {
  const { user, isAdmin, isLoading, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'my-orders' | 'admin'>('upload');
  const [pdfModal, setPdfModal] = useState<{ isOpen: boolean; url: string | null; fileName: string }>({
    isOpen: false,
    url: null,
    fileName: '',
  });

  const handleOpenPdf = (url: string, fileName: string) => {
    setPdfModal({
      isOpen: true,
      url,
      fileName,
    });
  };

  const handleClosePdf = () => {
    setPdfModal((prev) => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-indigo-500/20"></div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Initializing PrintFlow...
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated and not in demo preview, show Sign In
  if (!user && !isDemoMode) {
    return <SignInPrompt />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 pb-16">
          {activeTab === 'upload' && (
            <UploadOrderPage
              onOrderSuccess={() => {
                setActiveTab('my-orders');
              }}
            />
          )}

          {activeTab === 'my-orders' && (
            <MyOrdersPage
              onNewOrderClick={() => setActiveTab('upload')}
              onViewPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'admin' && (
            isAdmin ? (
              <AdminDashboard onViewPdf={handleOpenPdf} />
            ) : (
              <div className="max-w-md mx-auto mt-16 p-8 text-center bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl space-y-4 backdrop-blur-md">
                <h2 className="text-lg font-bold text-white">Admin Access Required</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You do not have permission to view this section. Please sign in with an admin account or switch roles using the top banner.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/30"
                >
                  Back to Upload
                </button>
              </div>
            )
          )}
        </main>

        {/* Global PDF Viewer Modal */}
        <PdfViewerModal
          isOpen={pdfModal.isOpen}
          onClose={handleClosePdf}
          pdfUrl={pdfModal.url}
          fileName={pdfModal.fileName}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
