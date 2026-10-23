import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import {
  countPdfPages,
  calculateOrderPrice,
  formatFileSize,
  generateUpiUrl,
  MAX_FILE_SIZE_BYTES,
  PRICE_PER_PAGE,
} from '../lib/pdfUtils';
import {
  SHOP_UPI_ID,
  SHOP_NAME,
  SHOP_QR_IMAGE,
  uploadPdfToStorage,
  submitOrder,
} from '../lib/supabase';

interface UploadOrderPageProps {
  onOrderSuccess: () => void;
}

export const UploadOrderPage: React.FC<UploadOrderPageProps> = ({ onOrderSuccess }) => {
  const { user, profile } = useAuth();

  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isCountingPages, setIsCountingPages] = useState<boolean>(false);
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [qrTab, setQrTab] = useState<'official' | 'dynamic'>('official');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-populate customer name from user profile
  useEffect(() => {
    if (profile?.full_name && !customerName) {
      setCustomerName(profile.full_name);
    } else if (user?.user_metadata?.full_name && !customerName) {
      setCustomerName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  // Handle PDF file selection & in-browser page counting
  const processPdfFile = async (selectedFile: File) => {
    setErrorMessage(null);

    // 1. Validate file extension / mime type
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setErrorMessage('Only PDF documents are accepted. Please select a valid .pdf file.');
      return;
    }

    // 2. Validate file size (max 20 MB)
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${formatFileSize(selectedFile.size)}). Maximum allowed size is 20 MB.`
      );
      return;
    }

    setFile(selectedFile);
    setIsCountingPages(true);
    setPageCount(null);

    try {
      // Fast browser-side page counting using pdf-lib
      const count = await countPdfPages(selectedFile);
      setPageCount(count);
    } catch (err: any) {
      console.error(err);
      setFile(null);
      setErrorMessage(
        err?.message || 'Failed to read PDF pages. Please verify the document is not password protected.'
      );
    } finally {
      setIsCountingPages(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processPdfFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processPdfFile(droppedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPageCount(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(SHOP_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Price calculations
  const totalAmount = pageCount ? calculateOrderPrice(pageCount) : 0;
  const upiUrl = generateUpiUrl({
    shopUpiId: SHOP_UPI_ID,
    shopName: SHOP_NAME,
    amount: totalAmount,
    note: `Print ${pageCount || 0} pages`,
  });

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!file || !pageCount) {
      setErrorMessage('Please select and count a valid PDF file first.');
      return;
    }

    if (!paymentRef.trim()) {
      setErrorMessage('Please enter the UPI Transaction / Reference ID (UTR) after completing payment.');
      return;
    }

    if (paymentRef.trim().length < 6) {
      setErrorMessage('Please enter a valid UPI Transaction / Reference ID (usually 12 digits).');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = user?.id || profile?.id || 'demo-customer';
      const userEmail = user?.email || profile?.email || 'customer@example.com';

      // 1. Upload to Supabase Storage: {user_id}/{timestamp}-{filename}
      const uploadResult = await uploadPdfToStorage(file, userId);
      if (uploadResult.error || !uploadResult.path) {
        throw new Error(uploadResult.error || 'Failed to upload PDF to secure storage.');
      }

      // 2. Insert order record into database with payment_status: 'paid'
      await submitOrder(
        {
          name: customerName.trim(),
          pages: pageCount,
          amount: totalAmount,
          pdf_path: uploadResult.path,
          payment_method: 'gpay',
          payment_ref: paymentRef.trim(),
          payment_status: 'paid',
        },
        userId,
        userEmail
      );

      // 3. Trigger celebration confetti
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#818cf8', '#10b981', '#f59e0b'],
      });

      // 4. Redirect to My Orders
      onOrderSuccess();
    } catch (err: any) {
      console.error('Order submission error:', err);
      setErrorMessage(err?.message || 'Something went wrong while submitting your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick & Contactless Printing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Upload & Print Document
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Upload your PDF, see real-time page count and transparent pricing, pay via UPI, and pick up your fresh prints!
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-sm text-rose-200 shadow-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Attention Required</p>
            <p className="text-rose-300 text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* Step 1: Customer Name */}
        <div className="bg-slate-900/80 rounded-3xl p-6 shadow-xl border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h2 className="text-base font-bold text-white">Your Details</h2>
          </div>

          <div>
            <label htmlFor="customerName" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used by shop staff to label your printed documents.
            </p>
          </div>
        </div>

        {/* Step 2: Upload PDF & Page Count */}
        <div className="bg-slate-900/80 rounded-3xl p-6 shadow-xl border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h2 className="text-base font-bold text-white">Upload PDF Document</h2>
          </div>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center group ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/30 scale-[0.99]'
                  : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 transition mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-200">
                Tap to choose or drag & drop your PDF
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF only • Maximum file size 20 MB
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition">
                Browse Files
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  title="Remove file"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Counting Status or Pricing Calculation */}
              {isCountingPages ? (
                <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center gap-3 text-indigo-300">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">
                    Counting PDF pages in browser engine...
                  </span>
                </div>
              ) : pageCount !== null ? (
                <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-indigo-950/30 border-2 border-indigo-500/30 rounded-2xl p-5 shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                      Live Calculation
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                      ₹{PRICE_PER_PAGE} per page
                    </span>
                  </div>

                  {/* Highlight Calculation Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 bg-slate-950/80 rounded-xl border border-indigo-500/20 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="font-bold text-base text-white">
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </span>
                      <span className="text-slate-500 font-bold">×</span>
                      <span className="font-semibold text-slate-300">₹{PRICE_PER_PAGE}</span>
                      <span className="text-slate-500 font-bold">=</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-400 tracking-tight">
                      ₹{totalAmount.toFixed(2)}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Verified: {pageCount} pages parsed successfully via client-side PDF parser.</span>
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Step 3: Payment Section (Only once file & pages are ready) */}
        {file && pageCount !== null && (
          <div className="bg-slate-900/80 rounded-3xl p-6 shadow-xl border border-slate-800 backdrop-blur-md space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h2 className="text-base font-bold text-white">Pay via UPI & Confirm</h2>
              </div>
              <span className="text-xs font-bold text-indigo-300 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                Amount: ₹{totalAmount.toFixed(2)}
              </span>
            </div>

            {/* Mobile UPI Deep Link Button */}
            <div className="space-y-2">
              <a
                href={upiUrl}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 active:scale-[0.99] transition"
              >
                <Smartphone className="w-5 h-5" />
                <span>Pay ₹{totalAmount.toFixed(2)} via UPI / GPay App</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
              </a>
              <p className="text-[11px] text-center text-slate-400">
                On mobile? Tapping above opens Google Pay, PhonePe, Paytm, or BHIM directly.
              </p>
            </div>

            {/* QR Code and Desktop payment display */}
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-6">
              {/* QR Container with Tab Switcher */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setQrTab('official')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      qrTab === 'official'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Siva's GPay QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrTab('dynamic')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      qrTab === 'dynamic'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Auto-Amount QR
                  </button>
                </div>

                {qrTab === 'official' ? (
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-700 shadow-lg shrink-0 flex flex-col items-center w-52 overflow-hidden">
                    <img
                      src={SHOP_QR_IMAGE}
                      alt="Siva Ram GPay QR"
                      className="w-full h-auto rounded-xl object-contain shadow-xs"
                    />
                    <div className="w-full text-center mt-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                        Pay ₹{totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-2xl border border-slate-700 shadow-md shrink-0 flex flex-col items-center">
                    <QRCodeSVG
                      value={upiUrl}
                      size={168}
                      level="M"
                      includeMargin={true}
                      imageSettings={{
                        src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
                        height: 24,
                        width: 24,
                        excavate: true,
                      }}
                    />
                    <span className="text-[10px] font-black text-slate-800 mt-1 uppercase tracking-wider">
                      Scan to Pay ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Shop UPI Details */}
              <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Shop UPI ID</span>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <code className="text-xs sm:text-sm font-mono font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-indigo-300 select-all">
                      {SHOP_UPI_ID}
                    </code>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400">Business Name</span>
                  <p className="text-xs font-bold text-slate-200">{SHOP_NAME}</p>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>1. Open Google Pay, PhonePe, or any UPI app.</p>
                  <p>2. Scan the QR code or transfer exact <b>₹{totalAmount.toFixed(2)}</b>.</p>
                  <p>3. Note the 12-digit UPI Reference / UTR Number.</p>
                </div>
              </div>
            </div>

            {/* UPI Transaction ID Input */}
            <div className="space-y-2">
              <label htmlFor="paymentRef" className="block text-xs font-semibold text-slate-300">
                UPI Reference / Transaction ID (UTR) <span className="text-rose-400">*</span>
              </label>
              <input
                id="paymentRef"
                type="text"
                required
                placeholder="e.g. 423189021873"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono font-medium transition"
              />
              <p className="text-[11px] text-slate-500">
                Enter the 12-digit transaction ID from your UPI app receipt to verify payment.
              </p>
            </div>

            {/* Submit Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition disabled:opacity-60 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading & Placing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition" />
                  <span>Submit Print Order (₹{totalAmount.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
