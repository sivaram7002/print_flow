import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  fileName: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
}) => {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-900 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden border border-slate-800">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-400">Secure Signed PDF Link</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 bg-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open New Tab</span>
            </a>

            <a
              href={pdfUrl}
              download={fileName}
              className="p-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/30"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Iframe/Embed Viewer */}
        <div className="flex-1 bg-slate-950 relative">
          <iframe
            src={pdfUrl}
            title={fileName}
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};
